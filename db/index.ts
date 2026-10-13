import { drizzle } from "drizzle-orm/d1";
import { database } from "@/lib/storage";
import * as schema from "./schema";

export function getDb() {
  const db = database();
  return drizzle(db as any, { schema });
}
