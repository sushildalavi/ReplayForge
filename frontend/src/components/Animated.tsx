import {
  motion, AnimatePresence,
  useSpring, useTransform, useInView,
} from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import type { ReactNode } from "react";

export const EASE = [0.21, 0.47, 0.32, 0.98] as const;

/* ── spring number counter ─────────────────────────── */
export function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const spring  = useSpring(value, { stiffness: 110, damping: 20 });
  const display = useTransform(spring, v =>
    decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString()
  );
  const [text, setText] = useState(() =>
    decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString()
  );
  useEffect(() => { spring.set(value) }, [value, spring]);
  useEffect(() => display.on("change", v => setText(v)), [display]);
  return <span className="tick">{text}</span>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={"skeleton " + className} />;
}

const staggerV = { hidden: {}, show: { transition: { staggerChildren: .055, delayChildren: .02 } } };
const itemV = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: .32, ease: [0.21, 0.47, 0.32, 0.98] as [number,number,number,number] } },
};

export function Stagger({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} variants={staggerV} initial="hidden" animate="show">{children}</motion.div>;
}
export function StaggerItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} variants={itemV}>{children}</motion.div>;
}

export function FadeIn({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .32, delay, ease: [0.21, 0.47, 0.32, 0.98] }}>
      {children}
    </motion.div>
  );
}

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(5px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(3px)" }}
      transition={{ duration: .26, ease: "easeInOut" }}>
      {children}
    </motion.div>
  );
}

export function AppearOnScroll({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: .38, ease: [0.21, 0.47, 0.32, 0.98] }}>
      {children}
    </motion.div>
  );
}

export function PresenceFade({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }} transition={{ duration: .22, ease: "easeInOut" }}
          style={{ overflow: "hidden" }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mouse-x", ((e.clientX - r.left) / r.width * 100) + "%");
    el.style.setProperty("--mouse-y", ((e.clientY - r.top) / r.height * 100) + "%");
  }, []);
  return <div ref={ref} className={"spotlight " + className} onMouseMove={onMove}>{children}</div>;
}
