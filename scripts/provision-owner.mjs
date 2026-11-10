import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'node:readline/promises';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key)
  throw Error('Configure Supabase URL and server secret in .env.local first.');
const db = createClient(url, key, { auth: { persistSession: false } });
const { count, error } = await db
  .from('admin_profiles')
  .select('id', { count: 'exact', head: true })
  .eq('role', 'owner');
if (error) throw Error('Apply migrations before provisioning.');
if (count)
  throw Error(
    'An owner already exists. Provision additional staff through an authenticated operational process.',
  );
const rl = createInterface({ input: process.stdin, output: process.stdout });
const email = (await rl.question('Owner email: ')).trim();
const name = (await rl.question('Owner display name: ')).trim();
rl.close();
if (!email.includes('@') || !name) throw Error('Email and name are required.');
// Invite flow avoids handling or printing a password. Configure SMTP and redirect URLs first.
const { data, error: inviteError } = await db.auth.admin.inviteUserByEmail(
  email,
  { redirectTo: `${process.env.APP_URL}/auth/callback` },
);
if (inviteError || !data.user)
  throw Error(
    'Invitation failed. Check Supabase email configuration and whether the account already exists.',
  );
const { error: profileError } = await db
  .from('admin_profiles')
  .insert({ id: data.user.id, display_name: name, role: 'owner' });
if (profileError) {
  throw Error(
    'Profile creation failed. The auth account has no new application access; inspect it in Supabase before retrying. No existing account was deleted.',
  );
}
console.log(
  'Owner profile created. Complete the invite link and set a password at /admin/password.',
);
