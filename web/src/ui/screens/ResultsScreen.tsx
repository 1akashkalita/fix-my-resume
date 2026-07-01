"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import type { RunRecord } from "@/lib/schemas";
import { CATEGORY_KEYS } from "@/lib/schemas";
import { computeTotal, cappedCategory, MAX_TOTAL } from "@/lib/scoring";
import { diffRuns } from "@/lib/diff";
import { totalSeries, buildSparkPath } from "@/lib/trends";
import { getRun, listRuns } from "@/lib/store";
import { CategoryRow } from "@/ui/CategoryRow";
import { RevisionRail } from "@/ui/RevisionRail";
import { CoachSection } from "@/ui/CoachSection";
import { EmptyState } from "@/ui/EmptyState";
import { Delta } from "@/ui/Delta";
import { fadeUp, useStagger } from "@/ui/motion";

export function ResultsScreen() {
  const params = useSearchParams();
  const id = params.get("run");
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState<RunRecord | null>(null);
  const [prev, setPrev] = useState<RunRecord | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      if (!id) {
        if (!cancelled) {
          setRun(null);
          setPrev(null);
          setRuns([]);
          setLoading(false);
        }
        return;
      }
      const [cur, all] = await Promise.all([getRun(id), listRuns()]);
      if (cancelled) return;
      // listRuns() returns runs ascending by createdAt; pick the positional
      // previous element so the scorebar delta matches RevisionRail's by construction.
      const idx = cur ? all.findIndex((r) => r.id === cur.id) : -1;
      setRun(cur ?? null);
      setPrev(idx > 0 ? all[idx - 1] : null);
      setRuns(all);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Hoisted before the early returns below so this hook (which calls
  // useReducedMotion internally) runs on every render — Rules of Hooks.
  const reportStagger = useStagger(true);

  if (loading) {
    return <p className="empty">Loading score report…</p>;
  }

  if (!run) {
    return <EmptyState message="That score report could not be found." />;
  }

  const diff = diffRuns(run, prev);
  const total = computeTotal(run.evaluation);
  const prevLabel = prev ? prev.label || prev.fileName : null;
  const categoriesTotal = CATEGORY_KEYS.reduce((s, k) => s + cappedCategory(run.evaluation, k), 0);
  const bonus = run.evaluation.bonus_points.total;
  const deductions = run.evaluation.deductions.total;

  // Trend up to and including the run being viewed, for the hero sparkline.
  const series = totalSeries(runs);
  const here = series.findIndex((p) => p.id === run.id);
  const sparkValues = (here >= 0 ? series.slice(0, here + 1) : series).map((p) => p.total);
  const spark = buildSparkPath(sparkValues, { w: 320, h: 64 });

  return (
    <div className="layout">
      <RevisionRail runs={runs} currentId={run.id} />

      <motion.div className="report" {...reportStagger}>
        <motion.div className="report-head" variants={fadeUp}>
          <div className="eyebrow">Score report · {run.label || run.fileName}</div>
          <h1 className="verdict serif">{run.coach.verdict}</h1>
        </motion.div>

        <motion.div className="scorebar" variants={fadeUp}>
          <div className="total mono">
            {total}
            <small>/{MAX_TOTAL}</small>
          </div>
          <div className="vs-col">
            <span className="lbl mono">{prevLabel ? `vs. ${prevLabel}` : "first run"}</span>
            <Delta value={diff.total} />
          </div>
          <div className="spark" aria-hidden="true">
            {sparkValues.length >= 2 && (
              <svg viewBox="0 0 320 64" preserveAspectRatio="none" className="spark-svg">
                <path d={spark.area} className="spark-area" />
                <path d={spark.line} className="spark-line" />
              </svg>
            )}
          </div>
        </motion.div>

        <motion.div className="cats" variants={fadeUp}>
          {CATEGORY_KEYS.map((k) => (
            <CategoryRow key={k} ckey={k} ev={run.evaluation} delta={diff.byCategory[k]} />
          ))}
        </motion.div>

        <motion.div className="summary mono" variants={fadeUp}>
          <span>
            categories <b>{categoriesTotal}</b>/100
          </span>
          <span className="good">＋ bonus {bonus}</span>
          <span>− deductions {deductions}</span>
          <span className="fair">blind to name · gender · school · GPA · location</span>
        </motion.div>

        <CoachSection coach={run.coach} evaluation={run.evaluation} />
      </motion.div>

      <style>{`
        .layout{display:grid;grid-template-columns:200px minmax(0,1fr);gap:54px;margin-top:34px;align-items:start}
        .report{min-width:0}
        .report-head .eyebrow{margin-bottom:10px;overflow-wrap:anywhere}
        .verdict{font-weight:400;font-size:clamp(28px,3.4vw,46px);line-height:1.06;letter-spacing:.1px;margin:0 0 4px;max-width:560px}
        .verdict em{font-style:italic;color:var(--brand-ink)}
        .scorebar{margin-top:26px;display:flex;align-items:center;gap:26px;flex-wrap:wrap;padding:26px 28px;background:var(--panel);border:1px solid var(--rule);border-radius:14px;box-shadow:var(--shadow)}
        .total{display:flex;align-items:baseline;gap:4px;font-weight:700;font-size:58px;line-height:1;letter-spacing:-.02em}
        .total small{font-size:22px;color:var(--ink-soft);font-weight:500}
        .vs-col{display:flex;flex-direction:column;gap:6px}
        .vs-col .lbl{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft)}
        .vs-col .delta{font-size:18px}
        .spark{flex:1;min-width:160px;height:64px;align-self:stretch;border-left:1px solid var(--rule);margin-left:6px;position:relative;overflow:hidden}
        .spark::before{content:"";position:absolute;inset:0;background-image:linear-gradient(var(--rule) 1px,transparent 1px),linear-gradient(90deg,var(--rule) 1px,transparent 1px);background-size:26px 16px;opacity:.45}
        .spark-svg{position:absolute;inset:0;width:100%;height:100%}
        .spark-line{fill:none;stroke:var(--brand);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
        .spark-area{fill:var(--brand-tint)}
        .cats{margin-top:30px;display:flex;flex-direction:column;gap:26px}
        .summary{margin-top:22px;padding-top:16px;border-top:1px solid var(--rule);display:flex;gap:26px;flex-wrap:wrap;font-size:12px;color:var(--ink-soft)}
        .summary b{color:var(--ink);font-weight:700}
        .summary .good{color:var(--good-ink)}
        .summary .fair{margin-left:auto}
        @media(max-width:760px){ .layout{grid-template-columns:1fr;gap:30px} .report{order:-1} .summary .fair{margin-left:0} }
      `}</style>
    </div>
  );
}
