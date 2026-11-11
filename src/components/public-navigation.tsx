'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export function PublicNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="public-navigation">
      <button
        className="public-menu-toggle"
        aria-expanded={open}
        aria-controls="public-menu"
        onClick={() => setOpen(!open)}
      >
        {open ? 'Fermer' : 'Menu'} <span aria-hidden>{open ? '×' : '☰'}</span>
      </button>
      <nav
        id="public-menu"
        className={open ? 'is-open' : ''}
        aria-label="Navigation principale"
      >
        {[
          ['/services', 'Les prestations'],
          ['/offres', 'Les offres'],
          ['/galerie', 'La galerie'],
          ['/a-propos', 'La maison'],
          ['/contact', 'Contact'],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={
              pathname === href || pathname.startsWith(`${href}/`)
                ? 'page'
                : undefined
            }
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
