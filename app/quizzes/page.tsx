import QuizStudent from './student';
export const dynamic='force-dynamic';
export const metadata={title:'Quizzes | Ez Education',alternates:{canonical:'/quizzes'}};
export default async function Page(){return <QuizStudent />}
