export function Delta({ value, suffix }: { value: number | null; suffix?: string }) {
  const cls = value === null ? "flat" : value > 0 ? "up" : value < 0 ? "down" : "flat";
  // The arrow glyph is decorative — the +/- sign already conveys direction, so
  // hide it from screen readers to avoid "up-pointing triangle" verbosity.
  let glyph = "";
  let label: string;
  if (value === null) label = "—";
  else if (value > 0) { glyph = "▲"; label = `+${value}`; }
  else if (value < 0) { glyph = "▼"; label = `-${Math.abs(value)}`; }
  else { glyph = "—"; label = "0"; }
  return (
    <span className={`delta ${cls}`}>
      {glyph && <span aria-hidden="true">{glyph} </span>}
      {label}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}
