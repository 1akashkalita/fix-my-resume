"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dropzone } from "@/ui/Dropzone";
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

export function ScoreScreen() {
  const router = useRouter();
  const { settings, hasKey } = useSettings();
  const STAGES = settings.enableGitHub ? STAGES_WITH_GITHUB : STAGES_WITHOUT_GITHUB;
  const [stage, setStage] = useState<string | null>(null);
  // Stages actually reached this run, so a skipped step (e.g. GitHub enrichment
  // when no profile is found) is shown as "skipped" rather than a false "done".
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);
  // Remembered so the retry button can re-run scoring on the same file.
  const [lastFile, setLastFile] = useState<File | null>(null);
  // Controls cancel + prevents a backgrounded run from hijacking navigation.
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight run if the user leaves this screen mid-scoring.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleFile(file: File) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLastFile(file);
    setError(null);
    setSeen(new Set());
    setBusy(true);
    setStage(STAGES[0]);
    setSeen(new Set([STAGES[0]]));
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

  return (
    <section className="ha-score">
      <p className="eyebrow">Score a resume</p>
      <h1 className="serif ha-score-h1">Drop a resume, get an honest read</h1>

      <Dropzone
        onFile={handleFile}
        onReject={(msg) => setError({ message: msg, retryLabel: null, tone: "bad" })}
        disabled={busy}
      />

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

      <p role="status" aria-live="polite" className="ha-sr-only">
        {stage ? `${stage}, step ${activeIdx + 1} of ${STAGES.length}` : ""}
      </p>

      {busy && (
        <div className="ha-run">
          <ol className="ha-stages" aria-hidden="true">
            {STAGES.map((s, i) => {
              // "skipped" = we've moved past this step but never reached it
              // (e.g. GitHub enrichment with no profile in the resume).
              const state =
                s === stage
                  ? "active"
                  : seen.has(s)
                    ? "done"
                    : i < activeIdx
                      ? "skipped"
                      : "pending";
              return (
                <li
                  key={s}
                  className={`ha-stage ${state}`}
                  aria-current={s === stage ? "step" : undefined}
                >
                  <span className="ha-stage-dot" aria-hidden="true" />
                  <span className="mono">{s}</span>
                  {state === "skipped" && <span className="ha-stage-skip mono">skipped</span>}
                </li>
              );
            })}
          </ol>
          <button type="button" className="ha-cancel mono" onClick={cancel}>
            Cancel
          </button>
        </div>
      )}

      <style>{styles}</style>
    </section>
  );
}

const styles = `
  .ha-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .ha-score{max-width:680px;margin:0 auto}
  .ha-score-h1{font-size:clamp(26px,5vw,34px);line-height:1.1;margin:6px 0 22px;color:var(--ink)}
  .ha-notice{border:1px solid var(--rule);border-radius:12px;background:var(--panel-2);
    padding:20px 22px;display:flex;flex-direction:column;gap:14px}
  .ha-notice p{margin:0;color:var(--ink-soft);font-size:15px;line-height:1.5}
  .ha-notice-link{align-self:flex-start;font-size:13px;font-weight:600;color:var(--brand-ink);
    text-decoration:none;border-bottom:1px solid var(--brand);padding-bottom:1px}
  .ha-notice-link:focus-visible{outline:2px solid var(--brand);outline-offset:3px}
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
  .ha-run{margin-top:24px}
  .ha-stages{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
  .ha-stage{display:flex;align-items:center;gap:12px;padding:9px 4px;font-size:13px;color:var(--ink-soft)}
  .ha-stage-dot{width:10px;height:10px;border-radius:50%;flex:none;
    border:2px solid var(--rule);background:transparent;transition:background .2s ease,border-color .2s ease}
  .ha-stage.done{color:var(--ink-soft)}
  .ha-stage.done .ha-stage-dot{background:var(--good);border-color:var(--good)}
  .ha-stage.skipped{color:var(--ink-soft);opacity:.6}
  .ha-stage.skipped .ha-stage-dot{border-style:dashed}
  .ha-stage-skip{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft)}
  .ha-stage.active{color:var(--ink);font-weight:600}
  .ha-stage.active .ha-stage-dot{background:var(--brand);border-color:var(--brand);
    box-shadow:0 0 0 4px var(--brand-tint);animation:ha-pulse 1.1s ease-in-out infinite}
  .ha-cancel{margin-top:16px;border:1px solid var(--rule);background:transparent;color:var(--ink-soft);
    border-radius:8px;padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;
    transition:border-color .15s ease,color .15s ease}
  .ha-cancel:hover{border-color:var(--ink-soft);color:var(--ink)}
  .ha-cancel:focus-visible{outline:2px solid var(--brand);outline-offset:3px}
  @keyframes ha-pulse{0%,100%{opacity:1}50%{opacity:.45}}
  @media (prefers-reduced-motion: reduce){ .ha-stage.active .ha-stage-dot{animation:none} .ha-cancel{transition:none} }
`;
