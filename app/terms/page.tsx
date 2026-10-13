import type {Metadata} from 'next';
import LegalPage from '../legal-page';

export const metadata:Metadata={alternates:{canonical:'/terms'},title:'Terms of Use | Ez Education',description:'Terms governing use of ezeducation.in and Ez Education study material.'};

export default function TermsPage(){return <LegalPage eyebrow="TERMS OF USE" title="Fair use of Ez Education." intro="By using ezeducation.in, you agree to these terms. If you do not agree, please stop using the website." sections={[
  {title:'Permitted use',content:<p>You may access the public material for personal learning and reasonable classroom reference. You must use the website lawfully and without interfering with its operation.</p>},
  {title:'Paid PDF downloads',content:<p>The price shown on a PDF card is the amount charged in INR. Razorpay processes the payment. A download unlocks after the server confirms that payment has been captured. New purchased downloads are linked to your student account. Sign in with the same account on another device to access them. Older guest purchases can be linked from the original browser at sign-in. Contact <a href="mailto:ezeducation429@gmail.com">ezeducation429@gmail.com</a> for a missing download, duplicate charge or refund request, with your payment ID and material title. Ez Education will review the issue and respond.</p>},
  {title:'Not permitted',content:<p>Do not attempt unauthorised access, disrupt the service, misuse educator features, remove ownership notices, or copy and republish substantial material as your own.</p>},
  {title:'Intellectual property',content:<p>Original site design, branding and learning material belong to Ez Education or the identified rights holder. Third-party names and materials remain the property of their respective owners.</p>},
  {title:'Availability and changes',content:<p>Features, resources and these terms may be changed, corrected, moved or removed. We may restrict misuse to protect the website and its users.</p>},
  {title:'No warranties',content:<p>The website is provided on an “as available” basis. To the extent permitted by law, Ez Education does not guarantee uninterrupted availability, complete accuracy or suitability for a particular purpose.</p>},
  {title:'Questions',content:<p>For questions about these terms, use the method described on the Contact page.</p>}
]}/>}
