export type Question={text:string;options:string[];answer:number;explanation:string};
export type QuizInput={title:string;subject:string;course:string;semester:number;unit:string;duration:number;published:boolean;questions:Question[]};
export function validateQuiz(v:QuizInput){
 if(!v||typeof v.title!=='string'||!v.title.trim()||v.title.length>160||typeof v.subject!=='string'||!v.subject.trim()||v.subject.length>160||!['bpharm','dpharm','python'].includes(v.course)||!Number.isInteger(v.semester)||v.semester<1||v.semester>(v.course==='dpharm'?2:8)||typeof v.unit!=='string'||v.unit.length>80||!Number.isInteger(v.duration)||v.duration<1||v.duration>180||typeof v.published!=='boolean')throw Error('Check title, subject, course, semester and duration (1–180 minutes).');
 if(!Array.isArray(v.questions)||v.questions.length<1||v.questions.length>100)throw Error('Add 1–100 questions.');
 for(const q of v.questions)if(!q||typeof q.text!=='string'||!q.text.trim()||q.text.length>2000||!Array.isArray(q.options)||q.options.length!==4||q.options.some(o=>typeof o!=='string'||!o.trim()||o.length>500)||new Set(q.options.map(o=>o.trim())).size!==4||!Number.isInteger(q.answer)||q.answer<0||q.answer>3||typeof q.explanation!=='string'||q.explanation.length>2000)throw Error('Each question needs text, four different options and one correct answer.');
 return {...v,title:v.title.trim(),subject:v.subject.trim()};
}
export function publicQuestions(q:Question[]){return q.map(({text,options})=>({text,options}))}
export function grade(q:Question[],a:(number|null)[]){return q.reduce((n,x,i)=>n+(x.answer===a[i]?1:0),0)}

export function parseQuestions(value:string):Question[]{return (JSON.parse(value) as (Question&{correct?:number})[]).map(q=>({...q,answer:q.answer??q.correct!}))}
