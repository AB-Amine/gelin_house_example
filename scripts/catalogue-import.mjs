import { readFile } from 'node:fs/promises';
export const officialCatalogue = JSON.parse(
  await readFile(
    new URL('../supabase/catalogue/gelin-house.json', import.meta.url),
    'utf8',
  ),
);
export const catalogueKey = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
export function catalogueServices(category) {
  const result = [];
  function visit(sections, path = []) {
    for (const section of sections ?? []) {
      const next = [...path, section.name];
      for (const name of section.services ?? [])
        result.push({
          name,
          slug: catalogueKey(name),
          subcategory: next[0],
          service_group: next.slice(1).join(' / '),
          service_type: category.service_type ?? 'appointment',
        });
      visit(section.sections, next);
    }
  }
  visit(category.sections);
  return result;
}
function uniqueMatch(rows, name, slug, kind) {
  const key = catalogueKey(name);
  const matches = rows.filter(
    (r) => catalogueKey(r.name) === key || r.slug === slug,
  );
  if (matches.length > 1)
    throw Error(
      `Plusieurs ${kind} correspondent à « ${name} ». Vérifiez les doublons avant l’import ; aucune fusion automatique n’a été effectuée.`,
    );
  if (matches[0] && catalogueKey(matches[0].name) !== key)
    throw Error(
      `L’adresse « ${slug} » appartient déjà à « ${matches[0].name} ». Vérifiez cette correspondance avant l’import.`,
    );
  return matches[0];
}
export async function importOfficialCatalogue(db) {
  const report = {
    categoriesCreated: 0,
    servicesCreated: 0,
    servicesMatched: 0,
    unpublishedMatches: [],
  };
  await db.query('begin');
  try {
    await db.query('select pg_advisory_xact_lock(711042)');
    const categories = (
      await db.query('select * from public.categories for update')
    ).rows;
    const services = (
      await db.query('select * from public.services for update')
    ).rows;
    const officialNames = new Set(
      officialCatalogue.flatMap((c) =>
        catalogueServices(c).map((s) => catalogueKey(s.name)),
      ),
    );
    const legacyServices = services.filter(
      (s) => !officialNames.has(catalogueKey(s.name)),
    );
    const seen = new Set();
    for (const [index, category] of officialCatalogue.entries()) {
      // Explicit supported synonym, not a fuzzy identity guess.
      const categoryRows = categories.map((r) =>
        ['maquillage', 'makeup-maquillage'].includes(catalogueKey(r.name)) &&
        category.slug === 'makeup'
          ? { ...r, name: 'Makeup' }
          : r,
      );
      let existingCategory = uniqueMatch(
        categoryRows,
        category.name,
        category.slug,
        'catégories',
      );
      if (!existingCategory) {
        existingCategory = (
          await db.query(
            'insert into public.categories(name,slug,position,published) values($1,$2,$3,true) returning *',
            [category.name, category.slug, index],
          )
        ).rows[0];
        categories.push(existingCategory);
        report.categoriesCreated++;
      } else {
        if (existingCategory.archived)
          throw Error(
            `La catégorie « ${existingCategory.name} » est archivée. Vérifiez son état avant l’import.`,
          );
        if (!existingCategory.published)
          report.unpublishedMatches.push(
            `Catégorie : ${existingCategory.name}`,
          );
      }
      for (const [position, service] of catalogueServices(category).entries()) {
        if (seen.has(service.slug))
          throw Error(`Doublon dans le catalogue fourni : ${service.name}`);
        seen.add(service.slug);
        const existing = uniqueMatch(
          services,
          service.name,
          service.slug,
          'prestations',
        );
        if (!existing) {
          const possibleMatch = legacyServices.find((row) => {
            const existingName = catalogueKey(row.name),
              incomingName = catalogueKey(service.name);
            return (
              existingName &&
              (incomingName.startsWith(`${existingName}-`) ||
                existingName.startsWith(`${incomingName}-`))
            );
          });
          if (possibleMatch)
            throw Error(
              `Correspondance possible entre « ${possibleMatch.name} » et « ${service.name} ». Vérifiez le nom existant avant l’import ; aucune fusion automatique n’a été effectuée.`,
            );
          const row = (
            await db.query(
              `insert into public.services(name,slug,category_id,subcategory,service_group,service_type,duration_minutes,price_type,price_minor,published,bookable,featured,position)
            values($1,$2,$3,$4,$5,$6,null,'consultation',null,true,false,false,$7) returning *`,
              [
                service.name,
                service.slug,
                existingCategory.id,
                service.subcategory,
                service.service_group,
                service.service_type,
                position,
              ],
            )
          ).rows[0];
          services.push(row);
          report.servicesCreated++;
        } else {
          if (existing.archived)
            throw Error(
              `La prestation « ${existing.name} » est archivée. Vérifiez son état avant l’import.`,
            );
          if (
            existing.category_id &&
            existing.category_id !== existingCategory.id
          )
            throw Error(
              `« ${existing.name} » appartient déjà à une autre catégorie. Vérifiez son classement avant l’import.`,
            );
          if (
            (existing.subcategory &&
              existing.subcategory !== service.subcategory) ||
            (existing.service_group &&
              existing.service_group !== service.service_group)
          )
            throw Error(
              `Le classement existant de « ${existing.name} » diffère du catalogue officiel. Vérifiez-le avant l’import.`,
            );
          if (service.service_type === 'rental' && existing.bookable)
            throw Error(
              `« ${existing.name} » utilise actuellement la réservation de prestations. Vérifiez cette location avant l’import.`,
            );
          // Preserve IDs, prices, durations, descriptions, slugs, feature flags, ordering,
          // booking configuration and every service relationship on matched records.
          if (!existing.published)
            report.unpublishedMatches.push(`Prestation : ${existing.name}`);
          await db.query(
            `update public.services set category_id=$2,subcategory=$3,service_group=$4,service_type=$5 where id=$1`,
            [
              existing.id,
              existingCategory.id,
              service.subcategory,
              service.service_group,
              service.service_type,
            ],
          );
          report.servicesMatched++;
        }
      }
    }
    await db.query('commit');
    return report;
  } catch (error) {
    await db.query('rollback');
    throw error;
  }
}
