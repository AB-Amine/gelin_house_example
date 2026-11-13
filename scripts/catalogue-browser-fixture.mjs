// Test-only HTTP fixture for the server-rendered public catalog RPC.
// Not imported by application code; never a fallback for a missing Supabase project.
import { createServer } from 'node:http';
import { officialCatalogue, catalogueServices } from './catalogue-import.mjs';
const id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const categories = officialCatalogue.map((c, i) => ({
  id: id(i + 1),
  name: c.name,
  slug: c.slug,
  description: '',
}));
let sequence = 10;
const services = officialCatalogue.flatMap((c, i) =>
  catalogueServices(c).map((s) => ({
    ...s,
    id: id(++sequence),
    category_id: categories[i].id,
    description: '',
    preparation: '',
    duration_minutes: null,
    price_type: 'consultation',
    price_minor: null,
    published: true,
    archived: false,
    bookable: false,
    featured: false,
    buffer_before: 0,
    buffer_after: 0,
    position: sequence,
  })),
);
// Explicitly artificial fixtures for basket interaction, never business prices/durations.
services.push(
  ...[0, 1].map((category, i) => ({
    ...services[0],
    id: id(100 + i),
    name: `TEST panier ${i + 1}`,
    slug: `test-panier-${i + 1}`,
    category_id: categories[category].id,
    subcategory: 'TEST',
    service_group: '',
    duration_minutes: 30,
    price_type: 'fixed',
    price_minor: 10000,
    bookable: true,
  })),
);
const catalog = {
  settings: {
    name: 'TEST catalogue',
    booking_enabled: true,
    timezone: 'Africa/Casablanca',
    currency: 'MAD',
    about: '',
    hero_title: '',
    hero_subtitle: '',
    phone: '+212600000001',
    whatsapp: '+212600000001',
    address: 'TEST adresse — données de démonstration',
    instagram: 'https://www.instagram.com/',
  },
  categories,
  services,
  cities: [
    {
      id: id(200),
      name: 'TEST ville',
      slug: 'test-ville',
      travel_fee_minor: 0,
    },
  ],
  service_cities: services
    .filter((s) => s.bookable)
    .map((s) => ({ service_id: s.id, city_id: id(200) })),
  promotions: [
    {
      id: id(304),
      name: 'TEST offre découverte',
      description: 'Fixture de test uniquement',
      kind: 'percentage',
      value: 10,
      starts_at: '2020-01-01T00:00:00Z',
      ends_at: '2099-12-31T23:59:59Z',
      active: true,
      terms: '',
    },
    {
      id: id(305),
      name: 'TEST offre beauté',
      description: 'Fixture de test uniquement',
      kind: 'fixed',
      value: 500,
      starts_at: '2020-01-01T00:00:00Z',
      ends_at: '2099-12-31T23:59:59Z',
      active: true,
      terms: '',
    },
    {
      id: id(300),
      name: 'TEST offre active',
      description: 'Exemple pour vérification uniquement',
      kind: 'percentage',
      value: 20,
      starts_at: '2020-01-01T00:00:00Z',
      ends_at: '2099-12-31T23:59:59Z',
      active: true,
      terms: 'TEST conditions de l’offre',
    },
    {
      id: id(301),
      name: 'TEST offre expirée',
      kind: 'percentage',
      value: 30,
      starts_at: '2020-01-01T00:00:00Z',
      ends_at: '2021-01-01T00:00:00Z',
      active: true,
      terms: '',
    },
    {
      id: id(302),
      name: 'TEST offre inactive',
      kind: 'percentage',
      value: 40,
      starts_at: '2020-01-01T00:00:00Z',
      ends_at: '2099-12-31T23:59:59Z',
      active: false,
      terms: '',
    },
    {
      id: id(303),
      name: 'TEST offre future',
      kind: 'fixed',
      value: 1000,
      starts_at: '2098-01-01T00:00:00Z',
      ends_at: '2099-12-31T23:59:59Z',
      active: true,
      terms: '',
    },
  ],
  promotion_services: [
    { promotion_id: id(300), service_id: id(100) },
    { promotion_id: id(303), service_id: id(101) },
  ],
  gallery: [
    {
      id: id(401),
      path: '/images/premium/interior-720.webp',
      alt: 'TEST salon — fixture uniquement',
      title: 'TEST salon — fixture uniquement',
      album: 'Salon',
      description: 'TEST uniquement, jamais importé en production',
    },
    {
      id: id(400),
      path: '/images/premium/nails-720.webp',
      alt: 'TEST galerie — exemple uniquement',
      title: 'TEST galerie — exemple uniquement',
      album: 'TEST',
      description: 'Fixture de test, jamais publiée dans Supabase',
    },
  ],
  reviews: [],
  translations: [],
  content: [
    {
      key: 'about.philosophy.listen',
      title: 'TEST écoute personnalisée',
      body: 'TEST texte éditable fourni par le catalogue',
    },
  ],
  hours: [],
};
createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/health') {
    res.end('{}');
    return;
  }
  if (req.method === 'POST' && req.url === '/rest/v1/rpc/fatu_catalog') {
    res.end(JSON.stringify(catalog));
    return;
  }
  res.statusCode = 403;
  res.end(
    JSON.stringify({ message: 'Test fixture supports catalog reads only.' }),
  );
}).listen(55445, '127.0.0.1');
