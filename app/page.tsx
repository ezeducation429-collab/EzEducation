import StudyLibrary from './study-library';
import {publicNotes} from '@/lib/public-notes';
export const dynamic='force-dynamic';
export default async function Home(){return <StudyLibrary initialNotes={await publicNotes()}/>;}
