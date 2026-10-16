import AdminPanel from './panel';
import { isAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function Admin() {
  const authenticated = await isAdmin();
  return <AdminPanel initialAuth={authenticated} />;
}
