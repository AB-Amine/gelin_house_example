import { redirect } from 'next/navigation';
import { getStaff } from '@/lib/auth';
import { AuthForm } from '@/components/admin';
export default async function Password() {
  if (!(await getStaff())) redirect('/admin/login');
  return (
    <main id="main" className="login-wrap">
      <h1>
        Votre mot
        <br />
        de passe.
      </h1>
      <AuthForm mode="password" />
    </main>
  );
}
