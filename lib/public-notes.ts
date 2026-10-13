import {database} from './storage';
import type {Note} from '@/app/study-library';

// Use the same public projection for HTML and the API. Never expose storage
// keys or external URLs belonging to paid resources in public page data.
export async function publicNotes():Promise<Note[]>{
  const result=await database().prepare(`SELECT id,course,semester,subject,title,unit,kind,CASE WHEN price_paise=0 THEN url ELSE '' END AS url,CASE WHEN file_key IS NOT NULL THEN 'uploaded' ELSE NULL END AS file_key,price_paise,created_at FROM notes ORDER BY course,semester,subject,unit,created_at DESC`).all<Note>();
  return result.results;
}
