import { requirePageClient } from '@/lib/client-auth';
import { ClientAuthForm } from '@/components/client-auth';
export default async function Page() {
  await requirePageClient();
  return <ClientAuthForm mode="password" configured />;
}
