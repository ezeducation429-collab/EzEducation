import Panel from './panel';
import { isAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const authenticated = await isAdmin();
  return <Panel initialAuth={authenticated} />;
}
