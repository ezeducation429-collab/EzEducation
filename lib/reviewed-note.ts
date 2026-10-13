import {revision} from '@/content/reviewed-notes/concentrations';

// Match both the resource identity and its original storage key. A deleted
// resource or a replacement upload must never accidentally receive this file.
export function reviewedNote(id:string,fileKey:string){
  if(id!==revision.noteId||fileKey!==revision.fileKey)return null;
  return {body:Uint8Array.from(atob(revision.base64),c=>c.charCodeAt(0)),date:revision.date};
}
