import { ClientAuthForm } from '@/components/client-auth';
import { publicConfig } from '@/lib/supabase';
export default function Register() {
  return <ClientAuthForm configured={!!publicConfig()} mode="register" />;
}
