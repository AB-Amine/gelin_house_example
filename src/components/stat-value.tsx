export function StatValue({ value }: { value: string | number }) {
  const amount =
    typeof value === 'string' && value.endsWith('MAD')
      ? value.replace(/\s*MAD$/, '')
      : null;
  return (
    <strong className="stat-value">
      {amount !== null ? (
        <>
          <span>{amount}</span> <small>MAD</small>
        </>
      ) : (
        value
      )}
    </strong>
  );
}
