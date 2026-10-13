import type {Metadata} from 'next';
import StudentAccount from './student-account';
export const metadata:Metadata={title:'Student account | Ez Education',robots:{index:false,follow:false},alternates:{canonical:'/account'}};
export default function AccountPage(){return <StudentAccount/>}
