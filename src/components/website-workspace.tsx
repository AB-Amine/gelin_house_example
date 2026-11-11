import Link from 'next/link';

export function WebsiteWorkspace({ preview = false }: { preview?: boolean }) {
  const cards = [
    [
      '01',
      'L’identité de la maison',
      'Logo, couleurs, accueil et coordonnées.',
      'settings',
      'Personnaliser',
    ],
    [
      '02',
      'Votre carte de prestations',
      'Descriptions, durées, tarifs et publication.',
      'services',
      'Gérer la carte',
    ],
    [
      '03',
      'Les images du salon',
      'Vos photographies, organisées à votre image.',
      'gallery',
      'Ouvrir la galerie',
    ],
    [
      '04',
      'Les attentions du moment',
      'Offres, dates et prestations concernées.',
      'offers',
      'Gérer les offres',
    ],
  ];
  return (
    <section
      className="website-workspace"
      aria-labelledby="website-workspace-title"
    >
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">VOTRE VITRINE DIGITALE</span>
          <h2 id="website-workspace-title">Faites vivre la maison.</h2>
        </div>
        <Link className="text-link" href="/">
          Voir le site ↗
        </Link>
      </div>
      <div className="website-cards">
        {cards.map(([number, title, description, section, action]) => (
          <Link
            className="website-card"
            key={section}
            href={
              preview
                ? `/admin/preview?section=${section}`
                : `/admin/${section}`
            }
          >
            <span className="website-card-number">
              {number} <span aria-hidden>↗</span>
            </span>
            <h3>{title}</h3>
            <p>{description}</p>
            <span className="website-card-action">
              {action} <span aria-hidden>→</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
