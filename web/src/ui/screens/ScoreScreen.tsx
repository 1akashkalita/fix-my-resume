"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dropzone } from "@/ui/Dropzone";
import { fadeUp, useReveal, useStagger } from "@/ui/motion";
import { useSettings } from "@/ui/SettingsProvider";
import { toPipelineSettings } from "@/lib/settings";
import { runScoreWithRealDeps } from "@/lib/runScore";
import { saveRun } from "@/lib/store";
import { describeError, type ErrorInfo } from "@/lib/errorMessage";

// "Extracting resume" and "Enriching from GitHub" only run when GitHub
// enrichment is on, so the progress steps shown depend on that setting.
const STAGES_WITH_GITHUB = [
  "Reading PDF",
  "Extracting resume",
  "Enriching from GitHub",
  "Scoring",
  "Coaching",
];
const STAGES_WITHOUT_GITHUB = ["Reading PDF", "Scoring", "Coaching"];

// Friendly title + reassuring note for each real pipeline stage.
const STAGE_META: Record<string, { title: string; note: string }> = {
  "Reading PDF": { title: "Extracting text from PDF", note: "Parsed locally with pdf.js — nothing uploaded." },
  "Extracting resume": { title: "Reading your details", note: "Pulling structured fields to find your GitHub." },
  "Enriching from GitHub": { title: "Enriching from GitHub", note: "Reading your public repos and contributions." },
  Scoring: { title: "Scoring against the rubric", note: "Four weighted categories, fairness-constrained." },
  Coaching: { title: "Writing your coach notes", note: "Prioritised fixes and the points each is worth." },
};

const RUBRIC_CHIPS = ["OPEN_SOURCE · 35", "SELF_PROJECTS · 30", "PRODUCTION · 25", "SKILLS · 10"];

function fmtSize(bytes: number): string {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}

export function ScoreScreen() {
  const router = useRouter();
  const { settings, hasKey } = useSettings();
  const reduce = useReducedMotion();
  // Hoisted out of the conditional render branches below: these hooks call
  // useReducedMotion() internally, so they must run on every render in a stable
  // order (Rules of Hooks) — not inside the busy/idle/key-gate branches.
  const reveal = useReveal(true);
  const stagger = useStagger(true);
  const STAGES = settings.enableGitHub ? STAGES_WITH_GITHUB : STAGES_WITHOUT_GITHUB;
  const [stage, setStage] = useState<string | null>(null);
  // Stages actually reached this run, so a skipped step (e.g. GitHub enrichment
  // when no profile is found) is shown as "skipped" rather than a false "done".
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);
  // Remembered so the retry button can re-run scoring on the same file.
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: string }>({ name: "", size: "" });
  // Controls cancel + prevents a backgrounded run from hijacking navigation.
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight run if the user leaves this screen mid-scoring.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleFile(file: File) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLastFile(file);
    setFileMeta({ name: file.name, size: fmtSize(file.size) });
    setError(null);
    setSeen(new Set([STAGES[0]]));
    setBusy(true);
    setStage(STAGES[0]);
    const onProgress = (s: string) => {
      setStage(s);
      setSeen((prev) => new Set(prev).add(s));
    };
    try {
      const run = await runScoreWithRealDeps(
        file,
        toPipelineSettings(settings),
        onProgress,
        controller.signal,
      );
      if (controller.signal.aborted) return; // cancelled mid-run; UI already reset
      // Persist for history, but never let a storage failure throw away a run
      // we already spent multiple LLM calls computing. saveRun mirrors the run in
      // memory before writing, so results still render this session even if the
      // persistent write is rejected (e.g. private-window storage limits).
      try {
        await saveRun(run);
      } catch (storageErr) {
        console.warn("Run scored but not saved to history:", storageErr);
      }
      router.push("/results?run=" + run.id);
    } catch (err) {
      if (controller.signal.aborted) return; // user cancelled or navigated away
      setError(describeError(err));
      setStage(null);
      setBusy(false);
    }
  }

  async function scoreSample() {
    try {
      const res = await fetch("/sample-resume.pdf");
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      handleFile(new File([blob], "sample-resume.pdf", { type: "application/pdf" }));
    } catch {
      setError({ message: "Couldn't load the sample resume — check your connection and try again.", retryLabel: null, tone: "bad" });
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setBusy(false);
    setStage(null);
    setError(null);
  }

  if (!hasKey) {
    return (
      <section className="ha-score">
        <p className="eyebrow">Score a resume</p>
        <h1 className="serif ha-score-h1">Add your key to begin</h1>
        <div className="ha-notice" role="note">
          <p>
            You need a Gemini API key before scoring. Everything runs in your
            browser — your key and resume never leave this device.
          </p>
          <Link href="/settings" className="ha-notice-link mono">
            Go to Settings →
          </Link>
        </div>
        <style>{styles}</style>
      </section>
    );
  }

  const activeIdx = stage ? STAGES.indexOf(stage) : -1;
  const progressPct = activeIdx < 0 ? 0 : Math.round(((activeIdx + 0.5) / STAGES.length) * 100);

  // ---- Scoring (in-flight) ----
  if (busy) {
    return (
      <motion.section className="ha-scoring" aria-busy="true" {...reveal}>
        <p role="status" aria-live="polite" className="ha-sr-only">
          {stage ? `${STAGE_META[stage]?.title ?? stage}, step ${activeIdx + 1} of ${STAGES.length}` : ""}
        </p>
        <p className="eyebrow ha-center">Reading your resume</p>
        <h1 className="serif ha-scoring-h1">
          Scoring <span className="ha-italic">{fileMeta.name || "your resume"}</span>
        </h1>

        <motion.ol className="ha-cards" aria-hidden="true" {...stagger}>
          {STAGES.map((s, i) => {
            const state =
              s === stage ? "active" : seen.has(s) ? "done" : i < activeIdx ? "skipped" : "pending";
            const meta = STAGE_META[s] ?? { title: s, note: "" };
            const glyph = state === "done" ? "✓" : state === "skipped" ? "–" : String(i + 1);
            const status =
              state === "done" ? "done" : state === "active" ? "working…" : state === "skipped" ? "skipped" : "queued";
            return (
              <motion.li key={s} className={`ha-card ${state}`} variants={fadeUp}>
                <span className="ha-card-dot mono">{glyph}</span>
                <span className="ha-card-text">
                  <span className="ha-card-title mono">{meta.title}</span>
                  <span className="ha-card-note">{meta.note}</span>
                </span>
                <span className="ha-card-status mono">{status}</span>
              </motion.li>
            );
          })}
        </motion.ol>

        <div className="ha-prog">
          <div className="ha-prog-track">
            <motion.div
              className="ha-prog-fill"
              animate={{ width: `${progressPct}%` }}
              transition={reduce ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }}
            />
          </div>
          <div className="ha-prog-foot mono">
            <span>
              {fileMeta.name}
              {fileMeta.size ? ` · ${fileMeta.size}` : ""}
            </span>
            <span>{progressPct}% · stays in your browser</span>
          </div>
        </div>

        <div className="ha-center">
          <button type="button" className="ha-cancel mono" onClick={cancel}>
            Cancel
          </button>
        </div>
        <style>{styles}</style>
      </motion.section>
    );
  }

  // ---- Upload (idle) ----
  return (
    <motion.section className="ha-score" {...stagger}>
      <motion.p className="eyebrow" variants={fadeUp}>Score a resume</motion.p>
      <motion.h1 className="serif ha-score-h1" variants={fadeUp}>Drop a resume, get an honest read.</motion.h1>
      <motion.p className="ha-score-sub" variants={fadeUp}>
        An explainable score out of 120 across four weighted categories, plus a coach that tells
        you exactly what to fix next.
      </motion.p>

      <motion.div variants={fadeUp}>
        <Dropzone
          onFile={handleFile}
          onReject={(msg) => setError({ message: msg, retryLabel: null, tone: "bad" })}
          disabled={busy}
        />
      </motion.div>

      {error && (
        <div className={`ha-error ${error.tone}`} role="alert">
          <span className="ha-error-msg mono">{error.message}</span>
          {error.retryLabel && lastFile && (
            <button
              type="button"
              className="ha-retry mono"
              onClick={() => handleFile(lastFile)}
              disabled={busy}
            >
              {error.retryLabel}
            </button>
          )}
        </div>
      )}

      <motion.div className="ha-meta-row" variants={fadeUp}>
        <div className="ha-chips">
          {RUBRIC_CHIPS.map((c) => (
            <span key={c} className="ha-chip-rubric mono">
              {c}
            </span>
          ))}
        </div>
        <button type="button" className="ha-sample mono" onClick={scoreSample}>
          ↳ score a sample resume
        </button>
      </motion.div>

      <style>{styles}</style>
    </motion.section>
  );
}

const styles = `
  .ha-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .ha-center{text-align:center}
  .ha-italic{font-style:italic}

  /* ---- Upload ---- */
  .ha-score{max-width:680px;margin:0 auto;padding-top:20px}
  .ha-score-h1{font-family:var(--font-instrument-serif),serif;font-weight:400;font-size:clamp(34px,6vw,50px);line-height:1.04;letter-spacing:.2px;margin:12px 0 0;color:var(--ink);max-width:640px}
  .ha-score-sub{color:var(--ink-soft);max-width:520px;margin:16px 0 0;font-size:15.5px;line-height:1.5}
  .ha-meta-row{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:18px}
  .ha-chips{display:flex;gap:8px;flex-wrap:wrap}
  .ha-chip-rubric{font-size:11px;letter-spacing:.03em;color:var(--ink-soft);background:var(--panel);
    border:1px solid var(--rule);border-radius:999px;padding:5px 11px}
  .ha-sample{background:none;border:none;font-size:12.5px;color:var(--brand-ink);
    text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:0}
  .ha-sample:hover{color:var(--brand)}
  .ha-sample:focus-visible{outline:2px solid var(--brand);outline-offset:3px;border-radius:3px}

  /* ---- Key gate ---- */
  .ha-notice{border:1px solid var(--rule);border-radius:12px;background:var(--panel-2);
    padding:20px 22px;display:flex;flex-direction:column;gap:14px;margin-top:22px}
  .ha-notice p{margin:0;color:var(--ink-soft);font-size:15px;line-height:1.5}
  .ha-notice-link{align-self:flex-start;font-size:13px;font-weight:600;color:var(--brand-ink);
    text-decoration:none;border-bottom:1px solid var(--brand);padding-bottom:1px}
  .ha-notice-link:focus-visible{outline:2px solid var(--brand);outline-offset:3px}

  /* ---- Error ---- */
  .ha-error{margin-top:18px;border:1px solid var(--bad);border-radius:10px;
    background:var(--bad-tint);color:var(--ink);padding:12px 14px;font-size:13px;
    display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
  .ha-error.warn{border-color:var(--warn);background:var(--warn-tint)}
  .ha-error-msg{flex:1 1 240px;line-height:1.5}
  .ha-retry{flex:none;border:1px solid var(--bad);background:transparent;color:var(--bad);
    border-radius:8px;padding:7px 13px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}
  .ha-retry:hover{background:var(--bad);color:var(--paper)}
  .ha-error.warn .ha-retry{border-color:var(--warn);color:var(--warn)}
  .ha-error.warn .ha-retry:hover{background:var(--warn);color:var(--paper)}
  .ha-retry:focus-visible{outline:2px solid currentColor;outline-offset:2px}
  .ha-retry:disabled{opacity:.5;cursor:default}

  /* ---- Scoring ---- */
  .ha-scoring{max-width:660px;margin:64px auto 0}
  .ha-scoring-h1{font-weight:400;font-size:clamp(30px,5vw,40px);line-height:1.08;margin:12px 0 0;text-align:center;color:var(--ink)}
  .ha-cards{list-style:none;margin:40px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
  .ha-card{display:flex;align-items:center;gap:16px;padding:16px 18px;border-radius:12px;
    background:var(--panel);border:1px solid var(--rule);transition:background .3s ease,border-color .3s ease}
  .ha-card.active{background:var(--brand-tint);border-color:color-mix(in srgb,var(--brand) 32%,transparent)}
  .ha-card.done{background:var(--good-tint);border-color:color-mix(in srgb,var(--good) 28%,transparent)}
  .ha-card.skipped{opacity:.7}
  .ha-card-dot{width:26px;height:26px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;
    background:var(--panel-2);color:var(--ink-soft);font-size:12px;font-weight:700;transition:background .3s ease,color .3s ease}
  .ha-card.active .ha-card-dot{background:var(--brand);color:#fff;animation:ha-pulse 1.2s ease-in-out infinite}
  .ha-card.done .ha-card-dot{background:var(--good);color:#fff}
  .ha-card-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
  .ha-card-title{font-size:13px;letter-spacing:.02em;color:var(--ink-soft);font-weight:500}
  .ha-card.active .ha-card-title,.ha-card.done .ha-card-title{color:var(--ink)}
  .ha-card-note{font-size:12.5px;color:var(--ink-soft)}
  .ha-card-status{font-size:11px;letter-spacing:.04em;color:var(--ink-soft);flex:none}
  .ha-card.active .ha-card-status{color:var(--brand-ink)}
  .ha-card.done .ha-card-status{color:var(--good-ink)}
  .ha-prog{margin-top:30px}
  .ha-prog-track{height:6px;border-radius:999px;background:var(--panel-2);border:1px solid var(--rule);overflow:hidden}
  .ha-prog-fill{height:100%;background:var(--brand);border-radius:999px}
  .ha-prog-foot{display:flex;justify-content:space-between;gap:12px;margin-top:12px;font-size:11.5px;letter-spacing:.04em;color:var(--ink-soft);flex-wrap:wrap}
  .ha-cancel{margin-top:22px;border:1px solid var(--rule);background:transparent;color:var(--ink-soft);
    border-radius:8px;padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;
    transition:border-color .15s ease,color .15s ease}
  .ha-cancel:hover{border-color:var(--ink-soft);color:var(--ink)}
  .ha-cancel:focus-visible{outline:2px solid var(--brand);outline-offset:3px}

  @keyframes ha-pulse{0%,100%{opacity:1}50%{opacity:.45}}
  @media (prefers-reduced-motion: reduce){ .ha-card.active .ha-card-dot{animation:none} .ha-cancel,.ha-card{transition:none} }
`;
