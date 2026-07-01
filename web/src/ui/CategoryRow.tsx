"use client";
import { motion, useReducedMotion } from "framer-motion";
import type { CategoryKey, Evaluation } from "@/lib/schemas";
import { cappedCategory, CATEGORY_MAX, statusFor, statusLabel } from "@/lib/scoring";
import { Delta } from "@/ui/Delta";

export function CategoryRow({ ckey, ev, delta }: { ckey: CategoryKey; ev: Evaluation; delta: number | null }) {
  const max = CATEGORY_MAX[ckey];
  const capped = cappedCategory(ev, ckey);
  const status = statusFor(capped, max);
  const target = Math.round((capped / max) * 100);
  const reduce = useReducedMotion();

  return (
    <div className="cat">
      <div className="cat-head">
        <div className="cat-left">
          <div className="cat-name mono">{ckey.toUpperCase()}</div>
          <div className="cat-ev">{ev.scores[ckey].evidence}</div>
        </div>
        <div className="cat-right">
          <span className="cat-score mono">
            <b>{capped}</b>
            <small>/{max}</small>
          </span>
          <span className={`status mono s-${status}`}>{statusLabel(status)}</span>
          <Delta value={delta} />
        </div>
      </div>
      <div className="track">
        <motion.div
          className={`fill b-${status}`}
          initial={reduce ? false : { width: 0 }}
          whileInView={{ width: `${target}%` }}
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
        />
      </div>
      <style>{`
        .cat-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px}
        .cat-left{min-width:0}
        .cat-name{font-size:13px;letter-spacing:.04em;color:var(--ink)}
        .cat-ev{color:var(--ink-soft);font-size:14px;margin-top:6px;max-width:440px;overflow-wrap:anywhere}
        .cat-right{text-align:right;flex:none}
        .cat-score{font-size:13px;color:var(--ink-soft)}
        .cat-score b{font-weight:700;font-size:19px;color:var(--ink)}
        .cat-score small{font-size:13px;color:var(--ink-soft);font-weight:500}
        .status{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;display:block;margin-top:4px}
        .s-good{color:var(--good-ink)} .s-warn{color:var(--warn-ink)} .s-bad{color:var(--bad-ink)}
        .cat-right .delta{display:block;font-size:12.5px;margin-top:5px}
        .track{margin-top:12px;height:8px;border-radius:999px;background:var(--panel-2);border:1px solid var(--rule);overflow:hidden}
        .fill{height:100%;border-radius:999px}
        .b-good{background:var(--good)} .b-warn{background:var(--warn)} .b-bad{background:var(--bad)}
      `}</style>
    </div>
  );
}
