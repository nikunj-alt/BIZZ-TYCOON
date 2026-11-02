'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/lib/animations/useReducedMotion';
import { slideUp, fadeIn, stagger, cardHover, pageTransition } from '@/lib/animations/variants';
import { transitions, getTransition } from '@/lib/animations/transitions';
import { ScrollReveal, StaggerContainer } from '@/lib/animations/ScrollReveal';
import { StatusOrbR3F } from '@/components/three/r3f/StatusOrbR3F';
import { Canvas } from '@react-three/fiber';
import clsx from 'clsx';

interface HeroSectionProps {
  status: 'SAFE' | 'WARNING' | 'DANGER' | 'UNKNOWN';
  ppm: number;
  connected: boolean;
  flame?: number;
  battery?: number;
  className?: string;
  onSilence?: () => void;
  onTest?: () => void;
}

export function HeroSection({
  status = 'UNKNOWN',
  ppm = 0,
  connected = false,
  flame = 0,
  battery = 0,
  className = '',
  onSilence,
  onTest,
}: HeroSectionProps) {
  const reducedMotion = useReducedMotion();

  const statusColors = {
    SAFE: { primary: 'var(--safe)', glow: 'var(--safe-glow)', label: 'SAFE', description: 'All systems nominal' },
    WARNING: { primary: 'var(--warning)', glow: 'var(--warning-glow)', label: 'WARNING', description: 'Elevated gas levels detected' },
    DANGER: { primary: 'var(--danger)', glow: 'var(--danger-glow)', label: 'DANGER', description: 'Critical gas concentration - Evacuate immediately' },
    UNKNOWN: { primary: 'var(--text-muted)', glow: 'transparent', label: 'OFFLINE', description: 'Waiting for sensor data...' },
  };

  const currentStatus = statusColors[status];

  return (
    <section
      className={clsx('hero-section', className)}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'var(--surface)',
      }}
    >
      {/* Background particle field */}
      {!reducedMotion && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <Canvas
            camera={{ position: [0, 0, 8], fov: 50 }}
            gl={{ antialias: true, alpha: true }}
            style={{ width: '100%', height: '100%' }}
          >
            <color attach="background" args={['#0A0F1A']} />
            <fog attach="fog" args={['#0A0F1A', 5, 50]} />
            <ambientLight intensity={0.3} />
            <directionalLight color={currentStatus.primary} intensity={0.5} position={[5, 5, 5]} />
            <StatusOrbR3F status={status} ppm={ppm} />
          </Canvas>
        </div>
      )}

      {/* Gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, ${currentStatus.primary}15 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 1,
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div
        className={clsx('hero-content', 'container')}
        style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          padding: 'var(--space-2xl) var(--space-lg)',
          maxWidth: '1200px',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -20 }}
            transition={getTransition({ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }, reducedMotion)}
          >
            {/* Status badge */}
            <motion.div
              className="status-badge"
              initial={reducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={getTransition({ delay: 0.1, ...transitions.bouncy }, reducedMotion)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-sm) var(--space-lg)',
                borderRadius: 'var(--radius-full)',
                background: `rgba(${hexToRgb(currentStatus.primary)}, 0.15)`,
                border: `1px solid ${currentStatus.primary}40`,
                color: currentStatus.primary,
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 'var(--space-lg)',
              }}
            >
              <span
                className="status-dot"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: currentStatus.primary,
                  boxShadow: `0 0 8px ${currentStatus.primary}`,
                  animation: reducedMotion ? 'none' : 'pulse 2s ease-in-out infinite',
                }}
              />
              {currentStatus.label}
            </motion.div>

            {/* Main PPM display */}
            <motion.div
              initial={reducedMotion ? undefined : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={getTransition({ delay: 0.2, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }, reducedMotion)}
            >
              <div
                className="ppm-display"
                style={{
                  fontSize: 'clamp(3rem, 12vw, 8rem)',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1,
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--space-xs)',
                  textShadow: `0 0 30px ${currentStatus.primary}40`,
                }}
              >
                {ppm.toLocaleString()}
                <span style={{ fontSize: '0.3em', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 'var(--space-sm)' }}>PPM</span>
              </div>
              <div
                style={{
                  fontSize: 'var(--text-lg)',
                  color: currentStatus.primary,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                }}
              >
                {currentStatus.description}
              </div>
            </motion.div>

            {/* Secondary metrics */}
            <motion.div
              className="hero-metrics"
              initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={getTransition({ delay: 0.3, ...transitions.smooth }, reducedMotion)}
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 'var(--space-2xl)',
                marginTop: 'var(--space-2xl)',
                flexWrap: 'wrap',
              }}
            >
              <MetricCard
                label="Flame"
                value={flame}
                unit=""
                icon="🔥"
                status={flame >= 400 ? 'DANGER' : flame >= 200 ? 'WARNING' : 'SAFE'}
                reducedMotion={reducedMotion}
                delay={0}
              />
              <MetricCard
                label="Battery"
                value={battery}
                unit="%"
                icon="🔋"
                status={battery <= 20 ? 'WARNING' : 'SAFE'}
                reducedMotion={reducedMotion}
                delay={0.1}
              />
              <MetricCard
                label="Connection"
                value={connected ? 1 : 0}
                unit=""
                icon="📡"
                status={connected ? 'SAFE' : 'DANGER'}
                reducedMotion={reducedMotion}
                delay={0.2}
                valueText={connected ? 'Connected' : 'Disconnected'}
              />
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={getTransition({ delay: 0.4, ...transitions.smooth }, reducedMotion)}
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 'var(--space-md)',
                marginTop: 'var(--space-2xl)',
                flexWrap: 'wrap',
              }}
            >
              <button
                className={clsx('btn btn-primary', 'hero-cta')}
                onClick={onSilence}
                style={{
                  padding: 'var(--space-md) var(--space-xl)',
                  fontSize: 'var(--text-base)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  Silence Alarm
                </span>
              </button>
              <button
                className={clsx('btn btn-secondary', 'hero-cta')}
                onClick={onTest}
                style={{
                  padding: 'var(--space-md) var(--space-xl)',
                  fontSize: 'var(--text-base)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                  Test Sensors
                </span>
              </button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Decorative bottom edge */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--border-subtle), transparent)',
          zIndex: 2,
        }}
        aria-hidden="true"
      />
    </section>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  unit: string;
  icon: string;
  status: 'SAFE' | 'WARNING' | 'DANGER';
  reducedMotion: boolean;
  delay: number;
  valueText?: string;
}

function MetricCard({ label, value, unit, icon, status, reducedMotion, delay, valueText }: MetricCardProps) {
  const statusColors = {
    SAFE: 'var(--safe)',
    WARNING: 'var(--warning)',
    DANGER: 'var(--danger)',
  };

  return (
    <motion.div
      initial={reducedMotion ? undefined : { opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={getTransition({ delay: 0.4 + delay, ...transitions.bouncy }, reducedMotion)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-xs)',
        padding: 'var(--space-md) var(--space-lg)',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        minWidth: 120,
        backdropFilter: 'blur(8px)',
      }}
      whileHover={reducedMotion ? undefined : { scale: 1.02, y: -2, transition: transitions.fast }}
    >
      <span style={{ fontSize: 'var(--text-2xl)' }} aria-hidden="true">{icon}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-xs)' }}>
        <span style={{ fontSize: 'var(--text-xl)', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
          {valueText ?? value.toLocaleString()}
        </span>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{unit}</span>
      </div>
      <span
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: statusColors[status],
        }}
      >
        {label}
      </span>
    </motion.div>
  );
}

// Hex values of the design tokens used by `statusColors`. Kept in sync with
// `--safe`/`--warning`/`--danger`/`--text-muted` in design-system.css so the
// rgba() conversion below never has to parse a `var(...)` reference.
const TOKEN_HEX: Record<string, string> = {
  '--safe': '#00E676',
  '--warning': '#FFD600',
  '--danger': '#FF3D00',
  '--text-muted': '#5A6E9E',
};

// Resolve a color that may be a hex literal or a `var(--token)` reference to
// its hex form. Unknown tokens fall back to the muted text color so the UI can
// never render `NaN` in an rgba() value.
function resolveHex(color: string): string {
  if (color.startsWith('#')) return color;
  const match = /^var\((--[\w-]+)\)$/.exec(color.trim());
  if (match) return TOKEN_HEX[match[1]] ?? '#5A6E9E';
  return '#5A6E9E';
}

function hexToRgb(color: string): string {
  const clean = resolveHex(color).replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}