import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Delta } from "./Delta";

describe("Delta", () => {
  it("renders a negative value as down with ▼ (decorative) and abs magnitude", () => {
    const html = renderToStaticMarkup(<Delta value={-3} />);
    expect(html).toContain("delta");
    expect(html).toContain("down");
    // Arrow is hidden from assistive tech; the sign + number carries the meaning.
    expect(html).toContain('aria-hidden="true">▼');
    expect(html).toContain("-3");
    expect(html).not.toContain("flat");
  });

  it("renders zero as flat with a decorative dash and a 0", () => {
    const html = renderToStaticMarkup(<Delta value={0} />);
    expect(html).toContain("flat");
    expect(html).toContain('aria-hidden="true">—');
    expect(html).toContain(">0<");
  });

  it("renders a positive value as up with ▲ (decorative) and a plus sign", () => {
    const html = renderToStaticMarkup(<Delta value={5} />);
    expect(html).toContain("up");
    expect(html).toContain('aria-hidden="true">▲');
    expect(html).toContain("+5");
  });

  it("renders null as flat with an em dash and no number", () => {
    const html = renderToStaticMarkup(<Delta value={null} />);
    expect(html).toContain("flat");
    expect(html).toContain("—");
    expect(html).not.toContain("+");
    expect(html).not.toContain("0");
  });

  it("appends the suffix when provided", () => {
    const html = renderToStaticMarkup(<Delta value={5} suffix="vs prev" />);
    expect(html).toContain("+5 vs prev");
  });
});
