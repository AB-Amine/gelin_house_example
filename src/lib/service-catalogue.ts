import type { Catalog, Service } from './domain';
export function canSelectService(service: Service, catalog: Catalog) {
  return (
    service.published &&
    !service.archived &&
    service.bookable &&
    service.service_type !== 'rental' &&
    service.duration_minutes !== null &&
    service.duration_minutes > 0 &&
    !!catalog.settings?.booking_enabled &&
    (catalog.cities ?? []).some((city) =>
      catalog.service_cities?.some(
        (link) => link.city_id === city.id && link.service_id === service.id,
      ),
    )
  );
}
export function groupServices(services: Service[]) {
  const groups = new Map<
    string,
    {
      category: string | null;
      subcategory: string;
      group: string;
      services: Service[];
    }
  >();
  for (const service of services) {
    const key = JSON.stringify([
      service.category_id,
      service.subcategory ?? '',
      service.service_group ?? '',
    ]);
    if (!groups.has(key))
      groups.set(key, {
        category: service.category_id,
        subcategory: service.subcategory ?? '',
        group: service.service_group ?? '',
        services: [],
      });
    groups.get(key)!.services.push(service);
  }
  return [...groups.values()];
}
