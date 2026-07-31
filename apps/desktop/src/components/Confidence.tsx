import type { ConfidenceBand } from "@naming-police/contracts";

export function Confidence({ band, value }: { band: ConfidenceBand; value: number }) {
  const label = band === "high" ? "Alta" : band === "medium" ? "Media" : "Baja";
  return (
    <span className={`confidence ${band}`} aria-label={`Confianza ${label}`}>
      <i />
      {label} · {Math.round(value * 100)}%
    </span>
  );
}
