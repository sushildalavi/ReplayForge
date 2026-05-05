import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/* ── Animated counter ───────────────────────────────────── */
export function AnimatedNumber({ value, duration = 0.6, decimals = 0 }: {
  value: number; duration?: number; decimals?: number;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = prev.current;
    const end = value;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = (now - startTime) / (duration * 1000);
      const t = Math.min(elapsed, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(+(start + (end - start) * eased).toFixed(decimals));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
      else prev.current = end;
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration, decimals]);

  return <>{decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString()}</>;
}

/* ── Skeleton ───────────────────────────────────────────── */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/* ── Stagger container ──────────────────────────────────── */
export function Stagger({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
    >
      {children}
    </motion.div>
  );
}

/* ── Stagger item ───────────────────────────────────────── */
export function StaggerItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 16, scale: 0.97 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}

/* ── Fade in ────────────────────────────────────────────── */
export function FadeIn({ children, delay = 0, className = "" }: {
  children: ReactNode; delay?: number; className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ── Slide in from left ─────────────────────────────────── */
export function SlideIn({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ── Hover card ─────────────────────────────────────────── */
export function HoverCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {children}
    </motion.div>
  );
}

/* ── Presence fade ──────────────────────────────────────── */
export function PresenceFade({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Page transition ────────────────────────────────────── */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ── Number update flash ─────────────────────────────────── */
export function FlashUpdate({ value, children }: { value: unknown; children: ReactNode }) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <motion.span
      animate={flash ? { color: ["#e2e8f0", "#818cf8", "#e2e8f0"] } : {}}
      transition={{ duration: 0.6 }}
    >
      {children}
    </motion.span>
  );
}
