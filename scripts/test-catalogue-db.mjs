import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  catalogueServices,
  importOfficialCatalogue,
  officialCatalogue,
} from './catalogue-import.mjs';
export async function testCatalogueDatabase(db, check) {
  const owner = (
    await db.query('select id from admin_profiles where active limit 1')
  ).rows[0].id;
  const category = (
    await db.query(
      "insert into categories(name,slug,published,position) values('Esthétique','existing-esthetique',true,37) returning id",
    )
  ).rows[0].id;
  const known = (
    await db.query(
      "insert into services(name,slug,category_id,description,duration_minutes,price_type,price_minor,published,bookable,featured) values('Épilation des sourcils','existing-sourcils',$1,'Texte validé',25,'fixed',15000,true,true,true) returning *",
      [category],
    )
  ).rows[0];
  const provider = (
    await db.query("select id from resources where kind='staff' limit 1")
  ).rows[0].id;
  await db.query(
    'insert into qualifications(resource_id,service_id) values($1,$2)',
    [provider, known.id],
  );
  const snapshots = async () =>
    (
      await db.query(`select jsonb_build_object(
    'appointments',(select jsonb_agg(to_jsonb(a) order by id) from appointments a),
    'items',(select jsonb_agg(to_jsonb(i) order by id) from appointment_items i),
    'allocations',(select jsonb_agg(to_jsonb(a) order by id) from allocations a)) snapshot`)
    ).rows[0].snapshot;
  const before = await snapshots();
  await check(
    'possible shortened legacy service names require review and roll back the entire import',
    async () => {
      const legacy = (
        await db.query(
          "insert into services(name,slug,duration_minutes,price_type) values('Microblading','legacy-microblading',null,'consultation') returning id",
        )
      ).rows[0].id;
      const counts = (
        await db.query(
          'select (select count(*) from categories) categories,(select count(*) from services) services',
        )
      ).rows[0];
      await assert.rejects(
        () => importOfficialCatalogue(db),
        /Correspondance possible/,
      );
      assert.deepEqual(
        (
          await db.query(
            'select (select count(*) from categories) categories,(select count(*) from services) services',
          )
        ).rows[0],
        counts,
      );
      assert.deepEqual(await snapshots(), before);
      await db.query(
        "update services set name='TEST historical record' where id=$1",
        [legacy],
      );
    },
  );
  await check(
    'official catalogue imports four categories and all 67 services/options without invented prices or durations',
    async () => {
      const report = await importOfficialCatalogue(db);
      assert.equal(report.categoriesCreated, 3);
      assert.equal(report.servicesCreated, 66);
      assert.equal(report.servicesMatched, 1);
      for (const c of officialCatalogue) {
        const rows = (
          await db.query('select * from services where name=any($1::text[])', [
            catalogueServices(c).map((s) => s.name),
          ])
        ).rows;
        assert.equal(rows.length, catalogueServices(c).length);
        assert.equal(new Set(rows.map((r) => r.category_id)).size, 1);
        for (const row of rows.filter((r) => r.id !== known.id)) {
          assert.equal(row.duration_minutes, null);
          assert.equal(row.price_minor, null);
          assert.equal(row.price_type, 'consultation');
          assert.equal(row.bookable, false);
          assert.equal(row.published, true);
          assert.equal(row.featured, false);
        }
      }
      const options = (
        await db.query(
          "select name from services where service_group='Lissage Kerfactor'",
        )
      ).rows
        .map((r) => r.name)
        .sort();
      assert.deepEqual(options, [
        'Kerfactor Gold',
        'Kerfactor Noir',
        'Kerfactor Premium',
        'Lissage Kerfactor',
      ]);
      assert.equal(
        (
          await db.query(
            "select count(*)::int n from services where service_type='rental'",
          )
        ).rows[0].n,
        2,
      );
    },
  );
  const ids = (await db.query('select id,name from services order by id')).rows;
  await check(
    'repeated catalogue imports preserve identities, confirmed fields, relationships and all booking snapshots',
    async () => {
      const report = await importOfficialCatalogue(db);
      assert.equal(report.servicesCreated, 0);
      assert.equal(report.categoriesCreated, 0);
      assert.equal(report.servicesMatched, 67);
      assert.deepEqual(
        (await db.query('select id,name from services order by id')).rows,
        ids,
      );
      const saved = (
        await db.query('select * from services where id=$1', [known.id])
      ).rows[0];
      for (const key of [
        'id',
        'slug',
        'price_minor',
        'price_type',
        'duration_minutes',
        'description',
        'featured',
        'bookable',
      ])
        assert.equal(saved[key], known[key]);
      assert.equal(
        (
          await db.query(
            'select count(*)::int n from qualifications where service_id=$1',
            [known.id],
          )
        ).rows[0].n,
        1,
      );
      assert.deepEqual(await snapshots(), before);
    },
  );
  await check(
    'official grouping and enquiry-only services appear in the actual public database projection',
    async () => {
      const catalog = (await db.query('select fatu_catalog() c')).rows[0].c;
      const names = officialCatalogue.flatMap((c) =>
        catalogueServices(c).map((s) => s.name),
      );
      assert.equal(
        catalog.services.filter((s) => names.includes(s.name)).length,
        67,
      );
      assert.equal(
        catalog.services.find((s) => s.name === 'Gel naturel').subcategory,
        'Onglerie',
      );
      assert.equal(
        catalog.services.find((s) => s.name === 'Gel naturel').service_group,
        'Gel',
      );
      assert.equal(
        catalog.services.find((s) => s.name === 'Location de caftans').bookable,
        false,
      );
    },
  );
  await check(
    'existing admin save edits imported prices and durations while unknown durations and rentals cannot become bookable',
    async () => {
      const service = (
        await db.query("select id from services where name='Brushing simple'")
      ).rows[0].id;
      const rental = (
        await db.query(
          "select id from services where name='Location de caftans'",
        )
      ).rows[0].id;
      await db.query('set role authenticated');
      try {
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          owner,
        ]);
        await assert.rejects(
          () =>
            db.query("select admin_save('services',$1::jsonb)", [
              JSON.stringify({ id: service, bookable: true }),
            ]),
          /service_booking_information/,
        );
        await assert.rejects(
          () =>
            db.query("select admin_save('services',$1::jsonb)", [
              JSON.stringify({
                id: rental,
                duration_minutes: 30,
                bookable: true,
              }),
            ]),
          /service_booking_information/,
        );
        await db.query("select admin_save('services',$1::jsonb)", [
          JSON.stringify({
            id: service,
            duration_minutes: 30,
            price_type: 'fixed',
            price_minor: 12500,
            description: 'Description modifiée',
          }),
        ]);
      } finally {
        await db.query('reset role');
      }
      const serviceRow = (
        await db.query('select * from services where id=$1', [service])
      ).rows[0];
      assert.equal(serviceRow.price_minor, 12500);
      assert.equal(serviceRow.duration_minutes, 30);
      assert.deepEqual(await snapshots(), before);
    },
  );
  await check(
    'repeat imports respect later owner visibility choices and refuse ambiguous duplicate matches transactionally',
    async () => {
      await db.query('update services set published=false where id=$1', [
        known.id,
      ]);
      const report = await importOfficialCatalogue(db);
      assert.ok(
        report.unpublishedMatches.some((name) => name.includes(known.name)),
      );
      assert.equal(
        (
          await db.query('select published from services where id=$1', [
            known.id,
          ])
        ).rows[0].published,
        false,
      );
      await db.query(
        "insert into services(id,name,slug,duration_minutes,price_type) values($1,'Épilation des sourcils','duplicate-test-sourcils',null,'consultation')",
        [randomUUID()],
      );
      const beforeFailed = (
        await db.query('select count(*)::int n from services')
      ).rows[0].n;
      await assert.rejects(
        () => importOfficialCatalogue(db),
        /Plusieurs prestations/,
      );
      assert.equal(
        (await db.query('select count(*)::int n from services')).rows[0].n,
        beforeFailed,
      );
      assert.deepEqual(await snapshots(), before);
    },
  );
}
