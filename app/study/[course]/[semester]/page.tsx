import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {cache} from 'react';
import {publicNotes} from '@/lib/public-notes';
import StudyLibrary from '../../../study-library';
export const dynamic='force-dynamic';
const loadNotes=cache(publicNotes);
type Params=Promise<{course:string;semester:string}>;
function valid(course:string,semester:string){return ['bpharm','dpharm'].includes(course)&&/^[1-8]$/.test(semester)&&Number(semester)<=(course==='dpharm'?2:8);}
export async function generateMetadata({params}:{params:Params}):Promise<Metadata>{
  const {course,semester}=await params;
  if(!valid(course,semester))return {robots:{index:false,follow:true}};
  const populated=(await loadNotes()).some(n=>n.course===course&&n.semester===Number(semester));
  const title=`${course==='dpharm'?'D.Pharm Year':'B.Pharm Semester'} ${semester} Notes | Ez Education`;
  return {title,description:`Browse subject-wise and unit-wise notes for ${title.split(' |')[0]}. See available PDFs and download prices.`,alternates:{canonical:`/study/${course}/${semester}`},robots:{index:populated,follow:true}};
}
export default async function SemesterPage({params}:{params:Params}){
  const {course,semester}=await params;
  if(!valid(course,semester))notFound();
  return <StudyLibrary initialCourse={course} initialSemester={semester} initialNotes={await loadNotes()} detailOnly/>;
}
