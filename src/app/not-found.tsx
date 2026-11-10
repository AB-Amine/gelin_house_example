import Link from 'next/link';
export default function NotFound() {
  return (
    <main id="main" className="container">
      <span className="eyebrow">GELIN HOUSE · 404</span>
      <h1>
        Cette page
        <br />
        nous échappe.
      </h1>
      <Link className="button" href="/">
        Retour à l’accueil ↗
      </Link>
    </main>
  );
}
