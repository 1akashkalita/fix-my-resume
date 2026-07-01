"use client";
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Resumes are tiny; a huge PDF is almost always the wrong file (a scanned
// portfolio, a slide deck) and would freeze the tab parsing in-browser.
const MAX_MB = 15;

function firstPdf(list: FileList | null): File | null {
  if (!list) return null;
  for (const f of Array.from(list)) {
    if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) return f;
  }
  return null;
}

export function Dropzone({
  onFile,
  onReject,
  disabled = false,
}: {
  onFile: (file: File) => void;
  onReject?: (reason: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const reduce = useReducedMotion();

  function pick() {
    if (!disabled) inputRef.current?.click();
  }

  function accept(list: FileList | null) {
    const file = firstPdf(list);
    if (file) {
      if (file.size > MAX_MB * 1024 * 1024) {
        onReject?.(`That PDF is over ${MAX_MB}MB — resumes are usually well under 1MB. Try exporting a lighter file.`);
        return;
      }
      onFile(file);
    } else if (list && list.length > 0) {
      onReject?.("Please choose a PDF file.");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setOver(false);
    if (disabled) return;
    accept(e.dataTransfer.files);
  }

  return (
    <div
      className={`ha-dz${over ? " over" : ""}${disabled ? " off" : ""}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Upload a resume PDF"
      onClick={pick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pick();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = "";
        }}
      />
      <motion.div
        className="ha-dz-badge"
        animate={reduce ? undefined : { y: [0, -5, 0] }}
        transition={reduce ? undefined : { duration: 3.4, ease: "easeInOut", repeat: Infinity }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 16V4M12 4l-5 5M12 4l5 5" />
          <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
        </svg>
      </motion.div>
      <div className="ha-dz-title serif">Drop your resume PDF</div>
      <div className="ha-dz-sub mono">or click to browse · stays in your browser</div>
      <style>{`
        .ha-dz{margin-top:34px;display:flex;flex-direction:column;align-items:center;justify-content:center;
          padding:74px 28px;border:1.5px dashed var(--rule);border-radius:18px;
          background:var(--panel);color:var(--ink-soft);cursor:pointer;text-align:center;box-shadow:var(--shadow);
          transition:border-color .18s ease,background .18s ease,box-shadow .18s ease}
        .ha-dz:hover{border-color:var(--brand);background:var(--brand-tint)}
        .ha-dz.over{border-color:var(--brand);background:var(--brand-tint);box-shadow:0 8px 30px rgba(58,45,208,.14)}
        .ha-dz:focus-visible{outline:2px solid var(--brand);outline-offset:3px}
        .ha-dz.off{cursor:not-allowed;opacity:.55}
        .ha-dz.off:hover{border-color:var(--rule);background:var(--panel);box-shadow:var(--shadow)}
        .ha-dz-badge{width:54px;height:54px;border-radius:14px;background:var(--brand-tint);
          display:flex;align-items:center;justify-content:center}
        .ha-dz-title{font-size:27px;color:var(--ink);margin-top:16px}
        .ha-dz-sub{font-size:12.5px;letter-spacing:.02em;color:var(--ink-soft);margin-top:10px}
        @media (prefers-reduced-motion: reduce){ .ha-dz{transition:none} }
      `}</style>
    </div>
  );
}
