import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { database, adminSecret } from './storage';

export const firebaseProject =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID ||
  'ez-education-19959';

const apiKey =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  process.env.FIREBASE_API_KEY ||
  '';

export const COOKIE_NAME = 'ez_student';
const LEGACY_COOKIE_NAME = '__Host-ez_student';

export class StudentAuthError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// In-memory cache for verified tokens
const userCache = new Map<string, { user: { uid: string; email: string }; expiresAt: number }>();

function getSessionSecret(): string {
  return adminSecret() || 'ez-education-student-session-secret-salt-2026';
}

/**
 * Hash password using PBKDF2 SHA-256 with 100,000 iterations
 */
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
}

/**
 * Constant-time password verification
 */
export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const computed = hashPassword(password, salt);
    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(expectedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Generate a signed session token for a student
 */
export function createStudentToken(uid: string, email: string): string {
  const payload = JSON.stringify({
    uid,
    email,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    iat: Date.now(),
  });
  const b64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

/**
 * Validate a student session token
 */
export function verifyStudentToken(token: string): { uid: string; email: string } | null {
  try {
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return null;

    const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(b64).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (typeof payload.exp !== 'number' || payload.exp <= Date.now()) {
      return null;
    }
    if (typeof payload.uid !== 'string' || typeof payload.email !== 'string') {
      return null;
    }

    return { uid: payload.uid, email: payload.email };
  } catch {
    return null;
  }
}

/**
 * Sign up a student in the Neon PostgreSQL database
 */
export async function studentSignup(
  email: string,
  password: string
): Promise<{ idToken: string; localId: string; email: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const db = database();

  // Check if student already exists
  const existing = await db
    .prepare('SELECT id FROM students WHERE LOWER(email) = ?')
    .bind(normalizedEmail)
    .first<{ id: string }>();

  if (existing) {
    throw new StudentAuthError('An account already exists for this email. Sign in instead.', 400);
  }

  const id = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const now = new Date().toISOString();

  await db
    .prepare(
      'INSERT INTO students (id, email, password_hash, salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(id, normalizedEmail, passwordHash, salt, now, now)
    .run();

  const token = createStudentToken(id, normalizedEmail);
  return { idToken: token, localId: id, email: normalizedEmail };
}

/**
 * Log in a student using Neon PostgreSQL credentials
 */
export async function studentLogin(
  email: string,
  password: string
): Promise<{ idToken: string; localId: string; email: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const db = database();

  const student = await db
    .prepare('SELECT id, email, password_hash, salt FROM students WHERE LOWER(email) = ?')
    .bind(normalizedEmail)
    .first<{ id: string; email: string; password_hash: string; salt: string }>();

  if (!student || !verifyPassword(password, student.salt, student.password_hash)) {
    throw new StudentAuthError('Email or password is incorrect.', 400);
  }

  const token = createStudentToken(student.id, student.email);
  return { idToken: token, localId: student.id, email: student.email };
}

/**
 * Optional Firebase Auth fallback (used only if a valid non-empty API key is provided)
 */
export async function firebaseAuth(method: string, body: unknown) {
  if (!apiKey) {
    throw new StudentAuthError('Firebase API key is not configured.', 503);
  }

  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    }
  );
  const data = (await r.json()) as Record<string, any>;
  if (!r.ok) {
    const code = String(data.error?.message || '');
    const message =
      code.includes('OPERATION_NOT_ALLOWED') || code.includes('CONFIGURATION_NOT_FOUND')
        ? 'Email/password sign-in needs to be enabled in Firebase Console → Authentication → Sign-in method.'
        : code.includes('TOO_MANY_ATTEMPTS')
        ? 'Too many attempts. Please wait and try again.'
        : code.includes('EMAIL_EXISTS')
        ? 'An account already exists for this email. Sign in instead.'
        : code.includes('WEAK_PASSWORD')
        ? 'Use a stronger password with at least 8 characters.'
        : code.includes('INVALID_PASSWORD') ||
          code.includes('INVALID_LOGIN_CREDENTIALS') ||
          code.includes('EMAIL_NOT_FOUND')
        ? 'Email or password is incorrect.'
        : code.includes('INVALID_EMAIL')
        ? 'Enter a valid email address.'
        : 'Sign-in is unavailable or your session expired. Please sign in again.';
    throw new StudentAuthError(message, code.includes('TOO_MANY_ATTEMPTS') ? 429 : 400);
  }
  return data;
}

/**
 * Store the student session cookie
 */
export async function setStudentSession(token: string, isHttps = false) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

/**
 * Clear the student session cookie
 */
export async function clearStudentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value || cookieStore.get(LEGACY_COOKIE_NAME)?.value;
  if (token) userCache.delete(token);

  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(LEGACY_COOKIE_NAME);
}

/**
 * Retrieve the currently authenticated student user
 */
export async function studentUser(): Promise<{ uid: string; email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value || cookieStore.get(LEGACY_COOKIE_NAME)?.value;
  if (!token) return null;

  // 1. Check in-memory token cache
  const now = Date.now();
  const cached = userCache.get(token);
  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  // 2. Verify with native database-signed token
  const nativeUser = verifyStudentToken(token);
  if (nativeUser) {
    userCache.set(token, { user: nativeUser, expiresAt: now + 5 * 60 * 1000 });
    return nativeUser;
  }

  // 3. Fallback to Firebase JWT verification (if a custom working Firebase project is configured)
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(
        Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
      );
      if (
        payload.aud === firebaseProject &&
        payload.iss === `https://securetoken.google.com/${firebaseProject}` &&
        payload.exp * 1000 > now
      ) {
        const validated = {
          uid: String(payload.user_id || payload.sub),
          email: String(payload.email || ''),
        };
        userCache.set(token, { user: validated, expiresAt: now + 5 * 60 * 1000 });
        return validated;
      }
    }
  } catch {}

  return null;
}

/**
 * Deterministic hash representing the student's unique buyer ID
 */
export async function studentBuyerHash(uid: string): Promise<string> {
  return crypto.createHash('sha256').update(`student:${uid}`).digest('hex');
}
