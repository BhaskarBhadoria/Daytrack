const PALETTE = ["#4f46e5", "#a9822c", "#0ea5e9", "#22c55e", "#e11d48", "#a855f7"];

function colorFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function Avatar({ name, size = 36 }) {
  const initials = name
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("")
    : "?";

  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: colorFor(name || "?"),
      }}
    >
      {initials}
    </span>
  );
}
