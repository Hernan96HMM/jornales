import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import NavBar from '@/components/NavBar';
import Help from '@/components/Help';
import { UserProvider } from '@/components/UserContext';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect('/login');
  return (
    <UserProvider user={user}>
      <div className="shell">
        <NavBar user={user} />
        <div className="content"><main className="wrap">{children}</main></div>
      </div>
      <Help />
    </UserProvider>
  );
}
