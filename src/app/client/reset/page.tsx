import { ClientAuthForm } from '@/components/client-auth';
import { publicConfig } from '@/lib/supabase';
export default function Reset() {
  return <ClientAuthForm configured={!!publicConfig()} mode="reset" />;
}
