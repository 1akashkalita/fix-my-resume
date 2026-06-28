"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { RunRecord } from "@/lib/schemas";
import { CATEGORY_KEYS } from "@/lib/schemas";
import { computeTotal, cappedCategory, CATEGORY_MAX, MAX_TOTAL } from "@/lib/scoring";
import { diffRuns } from "@/lib/diff";
import { getRun } from "@/lib/store";
import { shortDate } from "@/lib/format";
import { EmptyState } from "@/ui/EmptyState";
import { Delta } from "@/ui/Delta";

export function DiffScreen() {
  const params = useSearchParams();
  const aId = params.get("a");
  const bId = params.get("b");
  const [loading, setLoading] = useState(true);
  const [a, setA] = useState<RunRecord | null>(null);
  const [b, setB] = useState<RunRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [ra, rb] = await Promise.all([
        aId ? getRun(aId) : Promise.resolve(undefined),
        bId ? getRun(bId) : Promise.resolve(undefined),
      ]);
      if (cancelled) return;
      setA(ra ?? null);
      setB(rb ?? null);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [aId, bId]);

  if (loading) {
    return <p className="empty">Loading comparison…</p>;
  }

  if (!a || !b) {
    return <EmptyState message="Both runs are needed to compare. One could not be found." />;
  }

  const diff = diffRuns(a, b);
  const aLabel = a.label || a.fileName;
  const bLabel = b.label || b.fileName;
  // a/b can be the same file before vs after edits; the timestamp is what
  // actually tells the two columns apart, so tag the more recent one "newer".
  const aNewer = a.createdAt >= b.createdAt;

  return (
    <div className="diff">
      <div className="eyebrow">Compare revisions</div>
      <h1 className="diff-title serif">
        {aLabel} <span className="vs">vs.</span> {bLabel}
      </h1>

      <div className="totals">
        <div className="tcol">
          <span className="tlbl mono">
            {aLabel} <span className={`ttag ${aNewer ? "new" : "old"}`}>{aNewer ? "newer" : "older"}</span>
          </span>
          <span className="tval mono">
            {computeTotal(a.evaluation)}
            <small>/{MAX_TOTAL}</small>
          </span>
          <span className="tmeta mono">{shortDate(a.createdAt)}</span>
        </div>
        <div className="tcol">
          <span className="tlbl mono">
            {bLabel} <span className={`ttag ${aNewer ? "old" : "new"}`}>{aNewer ? "older" : "newer"}</span>
          </span>
          <span className="tval mono">
            {computeTotal(b.evaluation)}
            <small>/{MAX_TOTAL}</small>
          </span>
          <span className="tmeta mono">{shortDate(b.createdAt)}</span>
        </div>
        <div className="tcol">
          <span className="tlbl mono">Δ total</span>
          <Delta value={diff.total} />
        </div>
      </div>

      <div className="rows">
        {CATEGORY_KEYS.map((k) => (
          <div className="drow" key={k}>
            <span className="dname mono">{k.toUpperCase()}</span>
            <span className="dval mono">
              {cappedCategory(a.evaluation, k)}/{CATEGORY_MAX[k]}
            </span>
            <span className="dval mono soft">
              {cappedCategory(b.evaluation, k)}/{CATEGORY_MAX[k]}
            </span>
            <Delta value={diff.byCategory[k]} />
          </div>
        ))}
      </div>

      <style>{`
        .diff{margin:26px auto 0;max-width:680px}
        .diff-title{font-weight:400;font-size:clamp(26px,3.4vw,38px);line-height:1.1;margin:8px 0 22px;overflow-wrap:anywhere}
        .vs{font-style:italic;color:var(--ink-soft)}
        .totals{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:18px;padding:18px 20px;background:var(--panel);border:1px solid var(--rule);border-radius:14px;box-shadow:var(--shadow);margin-bottom:24px}
        .tcol{display:flex;flex-direction:column;gap:4px;min-width:0}
        .tlbl{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft);overflow-wrap:anywhere}
        .ttag{display:inline-block;font-size:9.5px;letter-spacing:.06em;padding:1px 6px;border-radius:999px;vertical-align:middle}
        .ttag.new{color:var(--brand-ink);background:var(--brand-tint)}
        .ttag.old{color:var(--ink-soft);background:var(--panel-2)}
        .tmeta{font-size:11px;color:var(--ink-soft)}
        .tval{font-weight:700;font-size:32px;line-height:1}
        .tval small{font-size:14px;color:var(--ink-soft);font-weight:500}
        .totals .delta{font-size:18px}
        .drow{display:grid;grid-template-columns:minmax(0,1fr) 70px 70px 70px;gap:14px;align-items:center;padding:14px 2px;border-top:1px solid var(--rule)}
        .dname{font-size:12px;letter-spacing:.06em;font-weight:500;overflow-wrap:anywhere}
        .dval{font-weight:700;font-size:14px;text-align:right}
        .soft{color:var(--ink-soft);font-weight:500}
        .drow .delta{text-align:right}
        @media(max-width:760px){ .totals{grid-template-columns:1fr 1fr} }
        @media(max-width:560px){ .drow{grid-template-columns:minmax(0,1fr) auto auto auto;gap:10px} .dval{font-size:13px} }
      `}</style>
    </div>
  );
}
