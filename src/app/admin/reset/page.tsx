import { AuthForm } from '@/components/admin';
import { publicConfig } from '@/lib/supabase';
export default function Reset() {
  return (
    <main id="main" className="login-wrap">
      <span className="eyebrow">GELIN HOUSE</span>
      <h1>
        Retrouver
        <br />
        votre accès.
      </h1>
      <AuthForm mode="reset" configured={!!publicConfig()} />
    </main>
  );
}
