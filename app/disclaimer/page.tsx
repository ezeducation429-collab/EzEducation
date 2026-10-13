import type {Metadata} from 'next';
import LegalPage from '../legal-page';

export const metadata:Metadata={alternates:{canonical:'/disclaimer'},title:'Disclaimer | Ez Education',description:'Educational and accuracy disclaimer for Ez Education study material.'};

export default function DisclaimerPage(){return <LegalPage eyebrow="DISCLAIMER" title="Educational support, not a substitute." intro="Ez Education provides general study support for pharmacy students. Please use the material with the appropriate academic and professional guidance." sections={[
  {title:'Educational purpose',content:<p>Content is provided for learning and revision. It is not medical advice, a diagnosis, treatment guidance, a prescription or a substitute for advice from a qualified healthcare professional.</p>},
  {title:'Academic accuracy',content:<p>We work to keep material useful and accurate, but errors or outdated details may occur. Always verify important information with the current official syllabus, pharmacopoeia, textbooks and instructions from your institution.</p>},
  {title:'Exams and results',content:<p>Use of the website does not guarantee marks, examination success, admission, certification or employment. Learning outcomes depend on many factors, including the student&apos;s preparation.</p>},
  {title:'External material',content:<p>Links or references to external websites are provided for convenience. Ez Education does not control and is not responsible for their availability, content or practices.</p>},
  {title:'Copyright concerns',content:<p>We respect intellectual-property rights. If you believe a resource infringes your rights, send a clear request through the Contact page so the material can be reviewed.</p>}
]}/>}
