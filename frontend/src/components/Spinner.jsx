export default function Spinner({ label = "Loading" }) {
  return (
    <div className="spinner-wrap">
      <span className="spinner" aria-hidden="true" />
      <span className="spinner-label">{label}…</span>
    </div>
  );
}
