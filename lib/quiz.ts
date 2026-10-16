import { validateQuizDetailed } from './validation';

export type Question = {
  text: string;
  options: string[];
  answer: number;
  explanation: string;
};

export type QuizInput = {
  title: string;
  subject: string;
  course: string;
  semester: number;
  unit: string;
  duration: number;
  published: boolean;
  questions: Question[];
};

export function validateQuiz(v: QuizInput): QuizInput {
  return validateQuizDetailed(v);
}
export function publicQuestions(q:Question[]){return q.map(({text,options})=>({text,options}))}
export function grade(q:Question[],a:(number|null)[]){return q.reduce((n,x,i)=>n+(x.answer===a[i]?1:0),0)}

export function parseQuestions(value:string):Question[]{return (JSON.parse(value) as (Question&{correct?:number})[]).map(q=>({...q,answer:q.answer??q.correct!}))}
