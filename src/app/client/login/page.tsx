import { ClientAuthForm } from '@/components/client-auth';
import { publicConfig } from '@/lib/supabase';
export default function Login() {
  return <ClientAuthForm configured={!!publicConfig()} />;
}
