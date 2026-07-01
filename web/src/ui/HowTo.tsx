"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * A modal with numbered, step-by-step instructions, opened by a trigger. The
 * default trigger is a small "how?" link; pass `trigger` to supply your own
 * (e.g. PrivacyChip's chip button) and reuse the whole dialog.
 */
export function HowTo({
  eyebrow,
  title,
  steps,
  foot,
  trigger,
}: {
  eyebrow: string;
  title: string;
  steps: ReactNode[];
  foot?: string;
  trigger?: (open: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();

  // While open: lock background scroll, keep focus inside the dialog (Esc to
  // close, Tab wraps), and restore focus to the trigger on close. This makes the
  // aria-modal="true" contract real for keyboard and screen-reader users.
  useEffect(() => {
    if (!open) return;
    triggerRef.current = (document.activeElement as HTMLElement) ?? null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = (): HTMLElement[] =>
      dialogRef.current
        ? Array.from(
            dialogRef.current.querySelectorAll<HTMLElement>(
              'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "Tab") {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      triggerRef.current?.focus?.();
    };
  }, [open]);

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <button
          type="button"
          className="ha-how"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          how?
        </button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            className="ha-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
          >
            <motion.div
              ref={dialogRef}
              className="ha-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 6 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <button className="ha-modal-x" aria-label="Close" onClick={() => setOpen(false)}>
                ×
              </button>
              <div className="eyebrow">{eyebrow}</div>
              <h2 id={titleId} className="serif ha-modal-title">
                {title}
              </h2>
              <ul className="ha-plist">
                {steps.map((step, i) => (
                  <li key={i}>
                    <span className="ha-pk mono">{String(i + 1).padStart(2, "0")}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
              {foot && <p className="ha-modal-foot mono">{foot}</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
