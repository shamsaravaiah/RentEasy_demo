export function ErrorMessage({ error, onDismiss }) {
  if (!error) return null;
  const message = typeof error === 'string' ? error : error?.message ?? 'An error occurred';
  return (
    <div className="error-message" role="alert">
      <span>{message}</span>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} aria-label="Dismiss">
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
