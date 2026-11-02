"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Gauge,
  Flame,
  Activity,
  BatteryMedium,
  Sun,
  CircleDot,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type SensorSeverity = 1 | 2 | 3 | 4 | 5;

export interface BeltModule {
  id: string;
  /** Accessible name, chip text and dialog title. */
  name: string;
  /** One or two sentences shown in the caption and the dialog. */
  description?: string;
  /** Live reading text, e.g. "182 ppm". */
  value: string;
  /** Severity tier 1–5. Tiers colour the module ring. */
  tier?: SensorSeverity;
  /** Sensor state shown on the chip / in the dialog. */
  status: "SAFE" | "WARNING" | "DANGER";
  /** Short facts listed as chips in the dialog. */
  details?: string[];
  /** Icon name from the inline map below. */
  icon?: "gas" | "flame" | "motion" | "battery" | "light" | "system";
}

export interface GastectLiveBeltLabels {
  open: string;
  close: string;
  previous: string;
  next: string;
  pause?: string;
  resume?: string;
}

export interface GastectLiveBeltProps extends React.ComponentProps<"section"> {
  items: BeltModule[];
  eyebrow?: string;
  heading?: string;
  caption?: string;
  action?: React.ReactNode;
  /** Belt speed in px/s (front lane). */
  speed?: number;
  /** Autoplay cycles the spotlight to the front until the visitor interacts. */
  autoplay?: boolean;
  /** Milliseconds between autoplay steps. */
  interval?: number;
  /** Spotlighted module index (controlled). */
  active?: number | null;
  onActiveChange?: (index: number | null) => void;
  /** Open detail dialog for a module index (controlled). */
  open?: number | null;
  onOpenChange?: (index: number | null) => void;
  labels?: GastectLiveBeltLabels;
}

/* ------------------------------------------------------------------ */
/* Constants & the icon map                                           */
/* ------------------------------------------------------------------ */

const CARD_W = 176;
const CARD_H = 248;
const MAX_BOB = 14;
const DEPTH_SCALE = 0.82;
const DEFAULT_LABELS: GastectLiveBeltLabels = {
  open: "Inspect module",
  close: "Close",
  previous: "Previous module",
  next: "Next module",
  pause: "Pause belt",
  resume: "Resume belt",
};

const ICONS = {
  gas: Gauge,
  flame: Flame,
  motion: Activity,
  battery: BatteryMedium,
  light: Sun,
  system: CircleDot,
} as const;

const TIERS: Record<SensorSeverity, { ring: string; chip: string; bar: string }> = {
  1: { ring: "border-chart-1", chip: "bg-chart-1", bar: "bg-chart-1" },
  2: { ring: "border-chart-2", chip: "bg-chart-2", bar: "bg-chart-2" },
  3: { ring: "border-chart-3", chip: "bg-chart-3", bar: "bg-chart-3" },
  4: { ring: "border-chart-4", chip: "bg-chart-4", bar: "bg-chart-4" },
  5: { ring: "border-chart-5", chip: "bg-chart-5", bar: "bg-chart-5" },
};

function tierOf(tier: number | undefined): SensorSeverity {
  const clamped = Math.max(1, Math.min(5, Math.round(tier ?? 1)));
  return clamped as SensorSeverity;
}

function statusColor(status: BeltModule["status"]) {
  if (status === "DANGER") return "text-danger border-danger/60 bg-danger/10";
  if (status === "WARNING") return "text-warning border-warning/60 bg-warning/10";
  return "text-safe border-safe/60 bg-safe/10";
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function GastectLiveBelt({
  items,
  eyebrow,
  heading,
  caption,
  action,
  speed = 26,
  autoplay = false,
  interval = 3200,
  active: activeProp,
  onActiveChange,
  open: openProp,
  onOpenChange,
  labels = DEFAULT_LABELS,
  className,
  ref,
  ...rest
}: GastectLiveBeltProps) {
  const count = items.length;
  const [measured, setMeasured] = React.useState(0);
  const [innerActive, setInnerActive] = React.useState<number | null>(null);
  const [innerOpen, setInnerOpen] = React.useState<number | null>(null);
  const [paused, setPaused] = React.useState(false);
  const [reduced, setReduced] = React.useState<boolean>(() =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const active = activeProp !== undefined ? activeProp : innerActive;
  const openIndex = openProp !== undefined ? openProp : innerOpen;

  const setActive = React.useCallback(
    (i: number | null) => {
      if (activeProp === undefined) setInnerActive(i);
      onActiveChange?.(i);
    },
    [activeProp, onActiveChange]
  );

  const setOpen = React.useCallback(
    (i: number | null) => {
      if (openProp === undefined) setInnerOpen(i);
      onOpenChange?.(i);
    },
    [openProp, onOpenChange]
  );

  const containerRef = React.useRef<HTMLElement | null>(null);
  const beltRef = React.useRef<HTMLDivElement | null>(null);
  const cardRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const offsetRef = React.useRef(0);
  const rafRef = React.useRef(0);
  const lastRef = React.useRef(0);
  const autoRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchedRef = React.useRef(false);
  const portalTarget = React.useRef<HTMLElement | null>(null);

  const setContainerRef = React.useCallback((node: HTMLElement | null) => {
    containerRef.current = node;
  }, []);

  /* Measure the belt width (deferred to first pass). */
  React.useEffect(() => {
    if (!beltRef.current) return;
    const el = beltRef.current;
    const update = () => setMeasured(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Reduced-motion listener. */
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", onChange);
    setReduced(mq.matches);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  /* Animation loop. */
  React.useEffect(() => {
    if (reduced || measured === 0 || count === 0) return;
    const loopWidth = measured + CARD_W;

    const frame = (now: number) => {
      const dt = lastRef.current ? (now - lastRef.current) / 1000 : 0;
      lastRef.current = now;
      if (!paused) offsetRef.current = (offsetRef.current + speed * dt) % loopWidth;
      const off = offsetRef.current;

      for (let i = 0; i < count; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;
        // x in [0, loopWidth); centre the belt around the container.
        let x = (i * (loopWidth / count) - off) % loopWidth;
        if (x < 0) x += loopWidth;
        const cx = x - (loopWidth / 2 - measured / 2);
        // Distance from centre (px, 0 at centre).
        const dist = Math.abs(cx) / (measured / 2 + CARD_W / 2);
        const depth = 1 - (1 - DEPTH_SCALE) * Math.max(0, Math.min(1, dist));
        const bob = Math.sin((cx / measured) * Math.PI) * MAX_BOB;
        const isActive = active === i;
        const z = isActive ? 40 : Math.round(30 - dist * 20);

        card.style.transform = `translate3d(${cx.toFixed(1)}px, ${(bob - (isActive ? 18 : 0)).toFixed(1)}px, 0) translate(-50%, -50%) scale(${depth.toFixed(3)})`;
        card.style.zIndex = String(z);
        card.dataset.depth = dist < 0.4 ? "front" : "back";
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [measured, count, speed, paused, reduced, active]);

  /* Autoplay spotlight. */
  React.useEffect(() => {
    if (!autoplay || reduced || touchedRef.current) return;
    const tick = () => {
      setActive((active ?? 0 + 1) % count);
      autoRef.current = setTimeout(tick, interval);
    };
    autoRef.current = setTimeout(tick, interval);
    return () => {
      if (autoRef.current) clearTimeout(autoRef.current);
    };
  }, [autoplay, interval, reduced, count, active, setActive]);

  /* Keyboard navigation. */
  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setActive(active === null ? 0 : (active + 1) % count);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setActive(active === null ? count - 1 : (active - 1 + count) % count);
      } else if (e.key === "Escape") {
        setOpen(null);
      }
    },
    [active, count, setActive, setOpen]
  );

  const openModule = React.useCallback(
    (i: number) => {
      touchedRef.current = true;
      if (autoplay && autoRef.current) clearTimeout(autoRef.current);
      portalTarget.current = document.body;
      setActive(i);
      setOpen(i);
    },
    [autoplay, setActive, setOpen]
  );

  const closeModule = React.useCallback(() => {
    setOpen(null);
    const card = cardRefs.current[active ?? -1];
    card?.focus();
  }, [setOpen, active]);

  React.useEffect(() => {
    if (openIndex !== null) {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") closeModule();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [openIndex, closeModule]);

  const dialogItem = openIndex !== null ? items[openIndex] : null;

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <section
      ref={setContainerRef}
      aria-label={heading ?? "Live monitoring belt"}
      onKeyDown={onKeyDown}
      className={cn("relative w-full select-none", className)}
      {...rest}
    >
      {/* Heading row */}
      {(eyebrow || heading) && (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            {eyebrow && (
              <p className="font-display text-xs uppercase tracking-[0.2em] text-brand mb-3">
                {eyebrow}
              </p>
            )}
            {heading && (
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-[color:var(--text-primary)] leading-tight">
                {heading}
              </h2>
            )}
            {caption && (
              <p className="mt-3 text-[color:var(--text-secondary)] text-base">{caption}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      {/* Belt stage */}
      <div
        ref={beltRef}
        className={cn(
          "relative h-[300px] w-full overflow-visible rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)]",
          reduced && "flex flex-wrap items-center justify-center gap-4 overflow-y-auto py-6"
        )}
      >
        {!reduced && items.map((item, i) => {
          const Icon = ICONS[item.icon ?? "gas"];
          const tier = TIERS[tierOf(item.tier)];
          return (
            <button
              key={item.id}
              type="button"
              ref={(node) => { cardRefs.current[i] = node; }}
              onClick={() => openModule(i)}
              aria-label={`${item.name}, ${item.value}, ${item.status}. ${labels.open}`}
              aria-expanded={openIndex === i}
              className={cn(
                "absolute left-1/2 top-1/2 flex h-[248px] w-[176px] flex-col rounded-2xl border bg-[color:var(--surface-overlay)] p-4 text-left shadow-[var(--shadow-lg)] transition-[border-color,box-shadow] duration-300 will-change-transform",
                tier.ring,
                active === i && "shadow-[var(--shadow-glow)]"
              )}
            >
              <div className="flex items-start justify-between">
                <span className={cn("grid h-10 w-10 place-items-center rounded-xl border", tier.ring, "text-[color:var(--text-primary)]")}>
                  <Icon size={18} />
                </span>
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", statusColor(item.status))}>
                  {item.status}
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="font-display text-2xl font-semibold text-[color:var(--text-primary)]">{item.value}</span>
              </div>

              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[color:var(--border-subtle)]">
                <div className={cn("h-full w-2/3 rounded-full", tier.bar)} />
              </div>

              <h3 className="mt-auto font-display text-sm font-medium text-[color:var(--text-primary)]">{item.name}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-[color:var(--text-muted)]">{item.description}</p>
            </button>
          );
        })}

        {/* Reduced-motion static grid */}
        {reduced && items.map((item, i) => {
          const Icon = ICONS[item.icon ?? "gas"];
          const tier = TIERS[tierOf(item.tier)];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => openModule(i)}
              className={cn(
                "flex h-[220px] w-[176px] flex-col rounded-2xl border bg-[color:var(--surface-overlay)] p-4 text-left transition-[border-color,box-shadow]",
                tier.ring,
                "hover:shadow-[var(--shadow-glow)]"
              )}
            >
              <div className="flex items-start justify-between">
                <span className={cn("grid h-10 w-10 place-items-center rounded-xl border", tier.ring, "text-[color:var(--text-primary)]")}>
                  <Icon size={18} />
                </span>
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", statusColor(item.status))}>
                  {item.status}
                </span>
              </div>
              <div className="mt-4">
                <span className="font-display text-2xl font-semibold text-[color:var(--text-primary)]">{item.value}</span>
              </div>
              <h3 className="mt-auto font-display text-sm font-medium text-[color:var(--text-primary)]">{item.name}</h3>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">{item.description}</p>
            </button>
          );
        })}

        {/* Controls */}
        {!reduced && (
          <div className="absolute bottom-3 right-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? labels.resume : labels.pause}
              className="grid h-8 w-8 place-items-center rounded-full border border-[color:var(--border-subtle)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:border-[color:var(--brand-primary)] transition-colors"
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
            </button>
            <button
              type="button"
              onClick={() => setActive(active === null ? 0 : (active - 1 + count) % count)}
              aria-label={labels.previous}
              className="grid h-8 w-8 place-items-center rounded-full border border-[color:var(--border-subtle)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:border-[color:var(--brand-primary)] transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setActive(active === null ? 0 : (active + 1) % count)}
              aria-label={labels.next}
              className="grid h-8 w-8 place-items-center rounded-full border border-[color:var(--border-subtle)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:border-[color:var(--brand-primary)] transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      {dialogItem &&
        portalTarget.current &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="belt-dialog-title"
            className="fixed inset-0 z-[500] grid place-items-center p-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModule} />
            <div className="relative w-full max-w-md rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)] p-6 shadow-[var(--shadow-xl)]">
              <button
                type="button"
                onClick={closeModule}
                aria-label={labels.close}
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-[color:var(--border-subtle)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = ICONS[dialogItem.icon ?? "gas"];
                  const tier = TIERS[tierOf(dialogItem.tier)];
                  return (
                    <span className={cn("grid h-12 w-12 place-items-center rounded-xl border", tier.ring, "text-[color:var(--text-primary)]")}>
                      <Icon size={22} />
                    </span>
                  );
                })()}
                <div>
                  <p className="font-display text-lg font-semibold text-[color:var(--text-primary)]" id="belt-dialog-title">
                    {dialogItem.name}
                  </p>
                  <p className="font-display text-2xl font-semibold text-[color:var(--text-primary)]">{dialogItem.value}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider", statusColor(dialogItem.status))}>
                  {dialogItem.status}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[color:var(--text-muted)]">
                  <AlertTriangle size={13} className="text-warning" />
                  Tier {tierOf(dialogItem.tier)} severity
                </span>
              </div>

              {dialogItem.description && (
                <p className="mt-4 text-sm leading-relaxed text-[color:var(--text-secondary)]">
                  {dialogItem.description}
                </p>
              )}

              {dialogItem.details && dialogItem.details.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {dialogItem.details.map((d) => (
                    <span key={d} className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-3 py-1 text-xs text-[color:var(--text-secondary)]">
                      {d}
                    </span>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={closeModule}
                className="mt-6 w-full rounded-xl bg-brand py-2.5 font-display text-sm font-semibold text-[color:var(--text-inverse)] transition-transform hover:-translate-y-px"
              >
                {labels.close}
              </button>
            </div>
          </div>,
          portalTarget.current
        )}
    </section>
  );
}
