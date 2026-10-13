import type {Metadata} from 'next';
import LegalPage from '../legal-page';

export const metadata:Metadata={alternates:{canonical:'/contact'},title:'Contact Ez Education',description:'Contact Ez Education about study material, corrections, privacy and copyright concerns.'};

export default function ContactPage(){return <LegalPage eyebrow="CONTACT" title="How can we help?" intro="Contact Ez Education for study-material questions, corrections, privacy requests, copyright concerns or collaboration enquiries." sections={[
  {title:'Study material and corrections',content:<p>Include the course, semester or year, subject, resource title and the correction you are suggesting. Clear details help us review the request quickly.</p>},
  {title:'Privacy or copyright requests',content:<p>Identify the relevant page or file and explain your concern. Rights-related requests should include enough information for us to locate and review the material.</p>},
  {title:'Contact channel',content:<p>Email us at <a href="mailto:ezeducation429@gmail.com">ezeducation429@gmail.com</a> for study-material questions, corrections, privacy requests, copyright concerns or collaboration enquiries. You may also use the official Ez Education social or video channel from which this website was shared.</p>},
  {title:'Response time',content:<p>We try to review genuine requests as soon as practical. Complex corrections or rights requests may take longer because the referenced material needs to be checked.</p>}
]}/>}
