import {publicNotes} from '@/lib/public-notes';
const base='https://ezeducation.in';
export const dynamic='force-dynamic';
export async function GET(){
  try{
    const notes=await publicNotes();
    const populated=Array.from(new Set(notes.filter(n=>['bpharm','dpharm'].includes(n.course)&&Number.isInteger(n.semester)&&n.semester>=1&&n.semester<=(n.course==='dpharm'?2:8)).map(n=>`/study/${n.course}/${n.semester}`))).sort();
    const paths=['','/about','/contact','/privacy-policy','/disclaimer','/terms','/python-interpreter','/python-lessons','/quizzes',...populated];
    const urls=paths.map(path=>`  <url><loc>${base}${path}</loc></url>`).join('\n');
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=300'}});
  }catch{return new Response('Sitemap is temporarily unavailable',{status:503});}
}
