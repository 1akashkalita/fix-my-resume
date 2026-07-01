"use client";
import { motion, useReducedMotion, type MotionProps, type Variants } from "framer-motion";
import Link from "next/link";

/**
 * Shared motion vocabulary for the whole app. Subtle/refined by design — motion
 * you feel more than notice. Tune the four tokens below to reshape every
 * animation at once; everything else derives from them.
 *
 * Usage:
 *   <motion.section {...useReveal(true)}>      // entrance fade-up on mount
 *   <motion.div {...useStagger()}>             // scroll-in parent that staggers children
 *     <motion.div variants={fadeUp}>…</motion.div>   // each child cascades in
 *   <MotionLink {...useHoverLift()} href="…">  // smooth hover lift on an interactive element
 *
 * Reduced motion: every hook returns {} so elements render at their natural,
 * fully-visible state — no transforms, no opacity ramp, nothing to animate.
 */

const EASE = [0.22, 0.61, 0.36, 1] as const; // matches the existing score-bar easing
const DUR = 0.45; // entrance/reveal seconds
const RISE = 14; // fade-up travel in px
const STAGGER = 0.07; // gap between staggered children, seconds

// Reveal a bit before the element is fully on screen, and only once.
const VIEWPORT = { once: true, margin: "0px 0px -12% 0px" } as const;

/** Fade + rise. Used both standalone and as the per-child motion in a stagger. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: RISE },
  shown: { opacity: 1, y: 0, transition: { duration: DUR, ease: EASE } },
};

/** Parent that releases its variant children one after another. */
export const staggerParent: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: STAGGER, delayChildren: 0.05 } },
};

/** A single element fades up — on scroll into view, or immediately on mount. */
export function useReveal(immediate = false): MotionProps {
  const reduce = useReducedMotion();
  if (reduce) return {};
  return immediate
    ? { variants: fadeUp, initial: "hidden", animate: "shown" }
    : { variants: fadeUp, initial: "hidden", whileInView: "shown", viewport: VIEWPORT };
}

/** A container whose `variants={fadeUp}` children cascade in. */
export function useStagger(immediate = false): MotionProps {
  const reduce = useReducedMotion();
  if (reduce) return {};
  return immediate
    ? { variants: staggerParent, initial: "hidden", animate: "shown" }
    : { variants: staggerParent, initial: "hidden", whileInView: "shown", viewport: VIEWPORT };
}

/** Smooth spring lift for interactive elements (cards, links, rows). */
export function useHoverLift(): MotionProps {
  const reduce = useReducedMotion();
  if (reduce) return {};
  return {
    whileHover: { y: -2 },
    whileTap: { y: -1 },
    transition: { type: "spring", stiffness: 380, damping: 26 },
  };
}

/** Next.js <Link> that accepts motion props (hover/tap, variants). */
export const MotionLink = motion.create(Link);
