import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  all<T = any>(): Promise<{ results: T[]; success: boolean; meta?: any }>;
  first<T = any>(colName?: string): Promise<T | null>;
  run(): Promise<{ success: boolean; meta: { changes: number; last_row_id?: number } }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<any[]>;
  exec(query: string): Promise<any>;
}

export interface StorageBucket {
  get(key: string): Promise<{ body: BodyInit; arrayBuffer(): Promise<ArrayBuffer> } | null>;
  put(key: string, value: any, options?: any): Promise<any>;
  delete(key: string): Promise<void>;
}

export function adminSecret(): string {
  return process.env.ADMIN_KEY || '';
}

// ---------------------------------------------------------------------------
// Cloudflare D1 REST API Client (for Vercel / serverless deployments)
// ---------------------------------------------------------------------------
class D1HttpClient implements D1Database {
  constructor(
    private accountId: string,
    private databaseId: string,
    private apiToken: string
  ) {}

  private async query(sql: string, params: any[] = []): Promise<any> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`D1 API error (${res.status}): ${err}`);
    }
    const data = await res.json() as { result: any[]; success: boolean };
    return data.result?.[0] || { results: [], success: true, meta: { changes: 0 } };
  }

  prepare(query: string): D1PreparedStatement {
    return new D1HttpPreparedStatement(this, query);
  }

  async batch(statements: D1PreparedStatement[]): Promise<any[]> {
    const results = [];
    for (const stmt of statements) {
      results.push(await (stmt as any).run());
    }
    return results;
  }

  async exec(query: string): Promise<any> {
    return this.query(query);
  }
}

class D1HttpPreparedStatement implements D1PreparedStatement {
  constructor(
    private client: D1HttpClient,
    private sql: string,
    private params: any[] = []
  ) {}

  bind(...values: any[]): D1PreparedStatement {
    return new D1HttpPreparedStatement(this.client, this.sql, values);
  }

  async all<T = any>(): Promise<{ results: T[]; success: boolean; meta?: any }> {
    const data = await (this.client as any).query(this.sql, this.params);
    return {
      results: (data.results || []) as T[],
      success: true,
      meta: data.meta || { changes: 0 },
    };
  }

  async first<T = any>(colName?: string): Promise<T | null> {
    const { results } = await this.all<T>();
    if (!results || results.length === 0) return null;
    const row = results[0] as any;
    if (colName) return row[colName] ?? null;
    return row as T;
  }

  async run(): Promise<{ success: boolean; meta: { changes: number; last_row_id?: number } }> {
    const data = await (this.client as any).query(this.sql, this.params);
    return {
      success: true,
      meta: {
        changes: data.meta?.changes ?? 0,
        last_row_id: data.meta?.last_row_id,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Node.js SQLite Client (local development / self-hosted Node)
// ---------------------------------------------------------------------------
let cachedLocalDb: any = null;

function getLocalSqliteDatabase(): D1Database {
  if (cachedLocalDb) return cachedLocalDb;

  if (!DatabaseSync) {
    throw new Error('SQLite is unavailable in this environment.');
  }

  // Find sqlite database file
  const candidatePaths = [
    process.env.SQLITE_PATH,
    path.join(process.cwd(), 'data.sqlite'),
  ];

  // Also search .wrangler/state directory if present
  const wranglerD1Dir = path.join(process.cwd(), '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
  if (fs.existsSync(wranglerD1Dir)) {
    const files = fs.readdirSync(wranglerD1Dir).filter((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
    if (files.length > 0) {
      candidatePaths.unshift(path.join(wranglerD1Dir, files[0]));
    }
  }

  let dbPath = candidatePaths.find((p) => p && fs.existsSync(p));
  if (!dbPath) {
    dbPath = path.join(process.cwd(), 'data.sqlite');
  }

  const rawDb = new DatabaseSync(dbPath);

  class NodeSqlitePreparedStatement implements D1PreparedStatement {
    constructor(private db: any, private sql: string, private params: any[] = []) {}

    bind(...values: any[]): D1PreparedStatement {
      return new NodeSqlitePreparedStatement(this.db, this.sql, values);
    }

    async all<T = any>(): Promise<{ results: T[]; success: boolean; meta?: any }> {
      try {
        const stmt = this.db.prepare(this.sql);
        const results = stmt.all(...this.params) as T[];
        return { results, success: true, meta: { changes: 0 } };
      } catch (err: any) {
        console.error('SQLite query error:', err?.message, 'SQL:', this.sql);
        throw err;
      }
    }

    async first<T = any>(colName?: string): Promise<T | null> {
      try {
        const stmt = this.db.prepare(this.sql);
        const row = stmt.get(...this.params) as any;
        if (!row) return null;
        if (colName) return row[colName] ?? null;
        return row as T;
      } catch (err: any) {
        console.error('SQLite first error:', err?.message, 'SQL:', this.sql);
        throw err;
      }
    }

    async run(): Promise<{ success: boolean; meta: { changes: number; last_row_id?: number } }> {
      try {
        const stmt = this.db.prepare(this.sql);
        const result = stmt.run(...this.params);
        return {
          success: true,
          meta: {
            changes: result.changes,
            last_row_id: Number(result.lastInsertRowid),
          },
        };
      } catch (err: any) {
        console.error('SQLite run error:', err?.message, 'SQL:', this.sql);
        throw err;
      }
    }
  }

  cachedLocalDb = {
    prepare(query: string): D1PreparedStatement {
      return new NodeSqlitePreparedStatement(rawDb, query);
    },
    async batch(statements: D1PreparedStatement[]): Promise<any[]> {
      const results = [];
      for (const stmt of statements) {
        results.push(await (stmt as any).run());
      }
      return results;
    },
    async exec(query: string): Promise<any> {
      return rawDb.exec(query);
    },
  };

  return cachedLocalDb;
}

// ---------------------------------------------------------------------------
// Local / Fallback Bucket Implementation
// ---------------------------------------------------------------------------
class LocalBucket implements StorageBucket {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.baseDir)) {
      try {
        fs.mkdirSync(this.baseDir, { recursive: true });
      } catch {}
    }
  }

  async get(key: string) {
    const filePath = path.join(this.baseDir, key);
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    return {
      body: buffer as unknown as BodyInit,
      arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
    };
  }

  async put(key: string, value: any): Promise<any> {
    const filePath = path.join(this.baseDir, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let buffer: Buffer;
    if (Buffer.isBuffer(value)) {
      buffer = value;
    } else if (value instanceof ArrayBuffer) {
      buffer = Buffer.from(value);
    } else if (value instanceof Uint8Array) {
      buffer = Buffer.from(value);
    } else if (typeof value === 'string') {
      buffer = Buffer.from(value);
    } else {
      buffer = Buffer.from(await value.arrayBuffer());
    }
    fs.writeFileSync(filePath, buffer);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }
  }
}

// ---------------------------------------------------------------------------
// Main Exports: database() & bucket()
// ---------------------------------------------------------------------------
export function database(): D1Database {
  // 1. Check if running inside Cloudflare Workers runtime
  const globalDb = (globalThis as any).DB || (globalThis as any).__env__?.DB;
  if (globalDb) return globalDb;

  // 2. Check if Cloudflare D1 REST API credentials are provided (e.g. on Vercel)
  const d1Id = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (d1Id && accountId && apiToken) {
    return new D1HttpClient(accountId, d1Id, apiToken);
  }

  // 3. Fallback to local SQLite database (built-in Node.js 22 SQLite)
  return getLocalSqliteDatabase();
}

export function bucket(): StorageBucket {
  const globalBucket = (globalThis as any).BUCKET || (globalThis as any).__env__?.BUCKET;
  if (globalBucket) return globalBucket;

  return new LocalBucket();
}
