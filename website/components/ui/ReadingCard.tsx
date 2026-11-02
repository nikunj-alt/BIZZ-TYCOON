'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/animations/useReducedMotion';
import { cardHover, fadeIn, scaleUp } from '@/lib/animations/variants';
import { getTransition, transitions } from '@/lib/animations/transitions';
import clsx from 'clsx';

interface ReadingCardProps {
  label: string;
  value: number | string;
  unit: string;
  status: 'SAFE' | 'WARNING' | 'DANGER' | 'UNKNOWN';
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  className?: string;
  onClick?: () => void;
}

export function ReadingCard({
  label,
  value,
  unit,
  status,
  icon,
  trend = 'stable',
  trendValue,
  className = '',
  onClick,
}: ReadingCardProps) {
  const reducedMotion = useReducedMotion();

  const statusConfig = {
    SAFE: { color: 'var(--safe)', bg: 'rgba(0, 230, 118, 0.1)', border: 'var(--safe)', glow: 'var(--safe-glow)', label: 'SAFE' },
    WARNING: { color: 'var(--warning)', bg: 'rgba(255, 214, 0, 0.1)', border: 'var(--warning)', glow: 'var(--warning-glow)', label: 'WARNING' },
    DANGER: { color: 'var(--danger)', bg: 'rgba(255, 61, 0, 0.1)', border: 'var(--danger)', glow: 'var(--danger-glow)', label: 'DANGER' },
    UNKNOWN: { color: 'var(--text-muted)', bg: 'var(--surface-elevated)', border: 'var(--border-subtle)', glow: 'transparent', label: 'UNKNOWN' },
  };

  const config = statusConfig[status];

  const trendIcons = {
    up: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--safe)' }}>
        <path d="M18 15l-6-6-6 6" />
      </svg>
    ),
    down: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--danger)' }}>
        <path d="M6 9l6 6 6-6" />
      </svg>
    ),
    stable: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-muted)' }}>
        <path d="M5 12h14" />
      </svg>
    ),
  };

  return (
    <motion.article
      className={clsx('reading-card', className)}
      style={{
        position: 'relative',
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-lg)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color var(--duration-fast) ease, box-shadow var(--duration-fast) ease',
      }}
      initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={getTransition({ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }, reducedMotion)}
      whileHover={onClick && !reducedMotion ? { y: -4, scale: 1.01, boxShadow: `0 12px 40px ${config.glow}, 0 4px 16px rgba(0,0,0,0.3)` } : undefined}
      whileTap={onClick && !reducedMotion ? { scale: 0.98 } : undefined}
      onClick={onClick}
    >
      {/* Status indicator bar at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${config.color}, ${config.glow})`,
          opacity: status !== 'UNKNOWN' ? 1 : 0,
        }}
        aria-hidden="true"
      />

      {/* Status badge */}
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={getTransition({ delay: 0.1, ...transitions.bouncy }, reducedMotion)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-xs)',
          padding: 'var(--space-xs) var(--space-sm)',
          borderRadius: 'var(--radius-full)',
          background: `rgba(${config.color.replace('var(--', '').replace(')', '')}, 0.15)`,
          border: `1px solid ${config.border}40`,
          color: config.color,
          fontWeight: 600,
          fontSize: 'var(--text-xs)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 'var(--space-md)',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: config.color,
            boxShadow: `0 0 6px ${config.color}`,
            animation: reducedMotion || status === 'UNKNOWN' ? 'none' : 'pulse 2s ease-in-out infinite',
          }}
          aria-hidden="true"
        />
        {config.label}
      </motion.div>

      {/* Icon */}
      {icon && (
        <motion.div
          initial={reducedMotion ? undefined : { opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={getTransition({ delay: 0.15, ...transitions.bouncy }, reducedMotion)}
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 'var(--space-sm)',
          }}
        >
          <span style={{ fontSize: 'var(--text-3xl)', filter: `drop-shadow(0 4px 8px ${config.color}40)` }}>{icon}</span>
        </motion.div>
      )}

      {/* Value display */}
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={getTransition({ delay: 0.2, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }, reducedMotion)}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: 'var(--space-xs)',
          marginBottom: 'var(--space-xs)',
        }}
      >
        <span
          style={{
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            lineHeight: 1,
            color: 'var(--text-primary)',
            textShadow: `0 0 20px ${config.color}30`,
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 400,
            color: 'var(--text-muted)',
            marginBottom: '2px',
          }}
        >
          {unit}
        </span>
      </motion.div>

      {/* Label */}
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={getTransition({ delay: 0.25, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }, reducedMotion)}
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          textAlign: 'center',
        }}
      >
        {label}
      </motion.div>

      {/* Trend indicator */}
      {(trend !== 'stable' || trendValue !== undefined) && (
        <motion.div
          initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getTransition({ delay: 0.3, ...transitions.smooth }, reducedMotion)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-xs)',
            marginTop: 'var(--space-md)',
            paddingTop: 'var(--space-md)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {trendIcons[trend]}
          {trendValue !== undefined && (
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                color: trend === 'up' ? 'var(--safe)' : trend === 'down' ? 'var(--danger)' : 'var(--text-muted)',
              }}
            >
              {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}%
            </span>
          )}
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {trend === 'up' ? 'RISING' : trend === 'down' ? 'FALLING' : 'STABLE'}
          </span>
        </motion.div>
      )}

      {/* Decorative glow ring on hover */}
      <motion.div
        className="glow-ring"
        initial={reducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
        animate={onClick && !reducedMotion ? { opacity: 0.15, scale: 1 } : { opacity: 0, scale: 0.8 }}
        transition={getTransition({ duration: 0.4, ease: 'easeOut' }, reducedMotion)}
        style={{
          position: 'absolute',
          inset: '-2px',
          borderRadius: 'var(--radius-xl)',
          background: `radial-gradient(ellipse at center, ${config.color}30 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: -1,
        }}
        aria-hidden="true"
      />
    </motion.article>
  );
}

// Export a grid component for multiple reading cards
export interface ReadingCardGridProps {
  cards: ReadingCardProps[];
  columns?: 1 | 2 | 3 | 4;
  gap?: string;
  className?: string;
}

export function ReadingCardGrid({ cards, gap = 'var(--space-md)', className = '' }: ReadingCardGridProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={clsx('reading-card-grid', className)}
      style={{
        gap,
        width: '100%',
      }}
      initial={reducedMotion ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={getTransition({ duration: 0.4 }, reducedMotion)}
      role="list"
      aria-label="Sensor readings"
    >
      {cards.map((card, index) => (
        <motion.div
          key={`${card.label}-${index}`}
          initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getTransition({ delay: index * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }, reducedMotion)}
          style={{ minWidth: 0 }}
          role="listitem"
        >
          <ReadingCard {...card} />
        </motion.div>
      ))}
    </motion.div>
  );
}