export function Loading({ text = 'Loading…' }) {
  return (
    <div className="loading" aria-busy="true">
      <span className="loading-spinner" aria-hidden />
      <span>{text}</span>
    </div>
  );
}
