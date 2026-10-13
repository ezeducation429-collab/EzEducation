import type {Metadata} from 'next';
import PythonLessons from './python-lessons';
export const metadata:Metadata={title:'Python Lessons for B.Pharm | Ez Education',description:'BP101T Python lessons with simple explanations, syntax, pharmacy examples and exam practice across all five PCI 2026 syllabus units.',alternates:{canonical:'/python-lessons'}};
export default function Page(){return <PythonLessons/>}
