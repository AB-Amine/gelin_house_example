'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="error-boundary">
      <h1>Un instant…</h1>
      <p>
        La page n’a pas pu être chargée. Votre sélection est conservée sur cet
        appareil.
      </p>
      <button className="button" onClick={reset}>
        Réessayer
      </button>
    </main>
  );
}
