import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'node:readline/promises';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key)
  throw Error('Configure Supabase URL and server secret in .env.local first.');
const db = createClient(url, key, { auth: { persistSession: false } });
const { count, error } = await db
  .from('admin_profiles')
  .select('id', { count: 'exact', head: true });
if (error) throw Error('Apply migrations before provisioning.');
if (count)
  throw Error(
    'An administrator already exists. Manage additional access through the dashboard.',
  );
const args = process.argv.slice(2);
if (
  args.length &&
  (args.length !== 2 ||
    args[0] !== '--user-id' ||
    !/^[a-f0-9-]{36}$/i.test(args[1]))
) {
  throw Error('Usage: npm run owner:create [-- --user-id AUTH_USER_UUID]');
}
let existing;
if (args.length) {
  const { data, error: lookupError } = await db.auth.admin.getUserById(args[1]);
  if (lookupError || !data.user?.email || !data.user.email_confirmed_at)
    throw Error(
      'Choose an existing, email-confirmed Auth user created in the Supabase dashboard.',
    );
  existing = data.user;
}
const rl = createInterface({ input: process.stdin, output: process.stdout });
let email, name;
try {
  email =
    existing?.email ?? (await rl.question('Administrator email: ')).trim();
  name = (await rl.question('Administrator display name: ')).trim();
} finally {
  rl.close();
}
if (!email.includes('@') || !name || name.length > 120)
  throw Error(
    'A valid email and display name (1–120 characters) are required.',
  );
let user = existing;
if (!user) {
  const { data, error: inviteError } = await db.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: `${process.env.APP_URL}/auth/callback` },
  );
  if (inviteError || !data.user)
    throw Error(
      'Invitation failed. Configure SMTP, or create a confirmed Auth user and use --user-id.',
    );
  user = data.user;
}
const { error: profileError } = await db
  .from('admin_profiles')
  .insert({ id: user.id, display_name: name, role: 'owner' });
if (profileError)
  throw Error(
    'Profile creation failed. Inspect the Auth account in Supabase before retrying; existing users were not deleted.',
  );
console.log(
  existing
    ? 'Administrator profile created. Sign in at /admin/login using the password you set in Supabase.'
    : 'Administrator profile created. Complete the invitation and set a password at /admin/password.',
);
