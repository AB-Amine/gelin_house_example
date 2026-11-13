import pg from 'pg';
import { importOfficialCatalogue } from './catalogue-import.mjs';
if (!process.env.DATABASE_URL)
  throw Error(
    'DATABASE_URL absent. Configurez la connexion PostgreSQL privée, appliquez les migrations, puis relancez catalogue:import. Aucun import distant effectué.',
  );
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await db.connect();
  console.log(JSON.stringify(await importOfficialCatalogue(db), null, 2));
  console.log(
    'Catalogue officiel enregistré dans la base configurée. Les tarifs et durées absents restent à renseigner.',
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
