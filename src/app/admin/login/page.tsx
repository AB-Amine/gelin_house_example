import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaff } from '@/lib/auth';
import { publicConfig } from '@/lib/supabase';
import { AuthForm } from '@/components/admin';
export default async function Login() {
  if (await getStaff()) redirect('/admin');
  return (
    <main id="main" className="login-wrap">
      <span className="eyebrow">GELIN HOUSE · ESPACE PRIVÉ</span>
      <h1>
        Bienvenue
        <br />à la maison.
      </h1>
      <p>L’espace de gestion du salon.</p>
      <AuthForm configured={!!publicConfig()} />
      <Link href="/" className="text-link">
        ← Retour au site
      </Link>
    </main>
  );
}
