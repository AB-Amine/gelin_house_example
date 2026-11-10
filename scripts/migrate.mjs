import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
if (!process.env.DATABASE_URL)
  throw Error(
    'Set DATABASE_URL in .env.local to a Supabase PostgreSQL migration connection.',
  );
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('begin');
  await client.query('select pg_advisory_xact_lock(711043)');
  await client.query('create schema if not exists gelin_migrations');
  await client.query(
    'create table if not exists gelin_migrations.applied(name text primary key, checksum text not null, applied_at timestamptz not null default now())',
  );
  for (const name of (await readdir('supabase/migrations'))
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    const sql = await readFile(`supabase/migrations/${name}`, 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const { rows } = await client.query(
      'select checksum from gelin_migrations.applied where name=$1',
      [name],
    );
    if (rows.length) {
      if (rows[0].checksum !== checksum)
        throw Error(`Migration changed after application: ${name}`);
      continue;
    }
    await client.query(sql);
    await client.query(
      'insert into gelin_migrations.applied(name,checksum) values($1,$2)',
      [name, checksum],
    );
    console.log(`Applied ${name}`);
  }
  await client.query('commit');
  console.log('Migrations are current.');
} catch (e) {
  await client.query('rollback');
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
