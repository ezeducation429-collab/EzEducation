import type {Metadata} from 'next';
import LegalPage from '../legal-page';

export const metadata:Metadata={alternates:{canonical:'/about'},title:'About Ez Education',description:'Learn about Ez Education and its B.Pharm and D.Pharm study material.'};

export default function AboutPage(){return <LegalPage eyebrow="ABOUT EZ EDUCATION" title="Clear pharmacy learning, in one place." intro="Ez Education organises useful study material for B.Pharm and D.Pharm students so they can spend less time searching and more time learning." sections={[
  {title:'Our purpose',content:<p>Our purpose is to make pharmacy concepts easier to find, understand and revise. Study material is arranged course-wise and semester-wise for a simple learning experience.</p>},
  {title:'What we publish',content:<p>The library may include original notes, explanations, revision material, question sets and downloadable learning resources for pharmacy students.</p>},
  {title:'How to use the material',content:<p>Use these resources as learning support alongside your official syllabus, textbooks, classroom teaching and guidance from qualified educators.</p>},
  {title:'Our responsibility',content:<p>We aim to keep the material accurate and helpful. If you notice an error, outdated information or a rights concern, please contact Ez Education so it can be reviewed.</p>}
]}/>}
