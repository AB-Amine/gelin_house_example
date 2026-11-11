import { FatuAdminAuth } from '@/components/fatu-admin-auth';
import { publicConfig } from '@/lib/supabase';
import { L } from '@/components/locale-provider';
export default function Page() {
  return (
    <main id="main" className="fatu-admin-login">
      <h1>
        <L text="auth.reset" />
      </h1>
      <FatuAdminAuth configured={!!publicConfig()} mode="reset" />
    </main>
  );
}
