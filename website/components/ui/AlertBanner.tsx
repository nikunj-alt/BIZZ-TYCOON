'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/lib/animations/useReducedMotion';
import { slideDown, fadeIn } from '@/lib/animations/variants';
import { getTransition, transitions } from '@/lib/animations/transitions';
import clsx from 'clsx';

interface AlertBannerProps {
  status: 'SAFE' | 'WARNING' | 'DANGER' | 'UNKNOWN';
  ppm: number;
  flame: number;
  warn?: number;
  danger?: number;
  flameDanger?: number;
  onDismiss?: () => void;
  onSilence?: () => void;
  onEvacuate?: () => void;
  className?: string;
}

export function AlertBanner({
  status = 'UNKNOWN',
  ppm = 0,
  flame = 0,
  warn = 200,
  danger = 500,
  flameDanger = 400,
  onDismiss,
  onSilence,
  onEvacuate,
  className = '',
}: AlertBannerProps) {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [pulse, setPulse] = useState(true);

  // Auto-hide SAFE status after a delay
  useEffect(() => {
    if (status === 'SAFE') {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setVisible(true);
    }
  }, [status]);

  // Pulse animation for DANGER/WARNING
  useEffect(() => {
    if ((status === 'DANGER' || status === 'WARNING') && !reducedMotion) {
      const interval = setInterval(() => setPulse(p => !p), 1000);
      return () => clearInterval(interval);
    }
  }, [status, reducedMotion]);

  if (!visible && status === 'SAFE') return null;

  const alertConfig = {
    SAFE: {
      level: 'info',
      icon: '✅',
      title: 'All Systems Normal',
      message: `Gas concentration at ${ppm} PPM — well within safe limits.`,
      color: 'var(--safe)',
      glow: 'var(--safe-glow)',
      bg: 'rgba(0, 230, 118, 0.1)',
      border: 'var(--safe)',
      actions: [],
    },
    WARNING: {
      level: 'warning',
      icon: '⚠️',
      title: 'Elevated Gas Levels Detected',
      message: `Gas concentration at ${ppm} PPM — above warning threshold (${warn} PPM). Ventilate area and investigate source.`,
      color: 'var(--warning)',
      glow: 'var(--warning-glow)',
      bg: 'rgba(255, 214, 0, 0.12)',
      border: 'var(--warning)',
      actions: [
        { label: 'Silence Alarm', onClick: onSilence, variant: 'primary', icon: '🔕' },
        { label: 'View Details', onClick: onDismiss, variant: 'secondary', icon: '📊' },
      ],
    },
    DANGER: {
      level: 'critical',
      icon: '🚨',
      title: 'CRITICAL: DANGEROUS GAS CONCENTRATION',
      message: `Gas concentration at ${ppm} PPM — EXCEEDS DANGER THRESHOLD (${danger} PPM). EVACUATE IMMEDIATELY! ${flame >= flameDanger ? 'FLAME DETECTED!' : ''}`,
      color: 'var(--danger)',
      glow: 'var(--danger-glow)',
      bg: 'rgba(255, 61, 0, 0.15)',
      border: 'var(--danger)',
      actions: [
        { label: 'EVACUATE NOW', onClick: onEvacuate, variant: 'danger', icon: '🏃' },
        { label: 'Silence Buzzer', onClick: onSilence, variant: 'primary', icon: '🔕' },
        { label: 'Emergency Protocols', onClick: onDismiss, variant: 'secondary', icon: '📋' },
      ],
    },
    UNKNOWN: {
      level: 'info',
      icon: '❓',
      title: 'System Offline',
      message: 'Waiting for sensor data... Connect the device to begin monitoring.',
      color: 'var(--text-muted)',
      glow: 'transparent',
      bg: 'var(--surface-elevated)',
      border: 'var(--border-subtle)',
      actions: [],
    },
  };

  const config = alertConfig[status];

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key={status}
          className={clsx('alert-banner', `alert-${config.level}`, className)}
          initial={reducedMotion ? undefined : { opacity: 0, y: -50, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -50, scale: 0.98 }}
          transition={getTransition({ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }, reducedMotion)}
          style={{
            position: 'relative',
            width: '100%',
            padding: 'var(--space-md) var(--space-xl)',
            background: config.bg,
            borderBottom: `2px solid ${config.border}`,
            boxShadow: `0 4px 24px ${config.glow || 'transparent'}`,
            zIndex: 100,
            overflow: 'hidden',
          }}
          role="alert"
          aria-live={status === 'DANGER' ? 'assertive' : 'polite'}
          aria-atomic="true"
        >
          {/* Animated background pattern */}
          {!reducedMotion && (
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(90deg, transparent, ${config.color}10, transparent)`,
                backgroundSize: '200% 100%',
              }}
              animate={{ backgroundPosition: ['0%', '100%', '0%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              aria-hidden="true"
            />
          )}

          {/* Pulse ring for critical alerts */}
          {status === 'DANGER' && !reducedMotion && (
            <motion.div
              style={{
                position: 'absolute',
                inset: -2,
                borderRadius: 'inherit',
                border: `2px solid ${config.color}`,
                opacity: pulse ? 0.6 : 0,
                pointerEvents: 'none',
              }}
              animate={{ scale: pulse ? 1.02 : 1, opacity: pulse ? 0.6 : 0 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden="true"
            />
          )}

          <div style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
            {/* Icon */}
            <motion.div
              initial={reducedMotion ? undefined : { scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={getTransition({ delay: 0.1, ...transitions.bouncy }, reducedMotion)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-lg)',
                background: `rgba(${config.color.replace('var(--', '').replace(')', '')}, 0.15)`,
                border: `1px solid ${config.border}40`,
                fontSize: 'var(--text-2xl)',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {config.icon}
            </motion.div>

            {/* Content */}
            <motion.div
              initial={reducedMotion ? undefined : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={getTransition({ delay: 0.15, ...transitions.smooth }, reducedMotion)}
              style={{ flex: 1, minWidth: 280 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)', flexWrap: 'wrap' }}>
                <motion.span
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: config.color,
                    padding: 'var(--space-xs) var(--space-sm)',
                    borderRadius: 'var(--radius-md)',
                    background: `rgba(${config.color.replace('var(--', '').replace(')', '')}, 0.15)`,
                    border: `1px solid ${config.border}40`,
                  }}
                  animate={status === 'DANGER' && !reducedMotion ? { backgroundColor: [config.bg, `rgba(${config.color.replace('var(--', '').replace(')', '')}, 0.3)`, config.bg] } : {}}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  {config.level.toUpperCase()}
                </motion.span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  PPM: {ppm.toLocaleString()}
                  {flame > 0 && ` | Flame: ${flame}`}
                </span>
              </div>

              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                {config.title}
              </h3>

              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {config.message}
              </p>
            </motion.div>

            {/* Actions */}
            {config.actions.length > 0 && (
              <motion.div
                initial={reducedMotion ? undefined : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={getTransition({ delay: 0.2, ...transitions.smooth }, reducedMotion)}
                style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', flexShrink: 0 }}
              >
                {config.actions.map((action, index) => (
                  <motion.button
                    key={action.label}
                    onClick={action.onClick}
                    className={clsx('btn', `btn-${action.variant}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      padding: 'var(--space-sm) var(--space-md)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}
                    initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={getTransition({ delay: 0.25 + index * 0.05, ...transitions.bouncy }, reducedMotion)}
                    whileHover={!reducedMotion ? { scale: 1.02 } : undefined}
                    whileTap={!reducedMotion ? { scale: 0.98 } : undefined}
                  >
                    <span>{action.icon}</span>
                    <span>{action.label}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Dismiss button */}
            {onDismiss && (
              <motion.button
                onClick={() => setVisible(false)}
                className="btn btn-ghost"
                style={{
                  marginLeft: 'auto',
                  padding: 'var(--space-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                initial={reducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={getTransition({ delay: 0.3, ...transitions.bouncy }, reducedMotion)}
                whileHover={!reducedMotion ? { scale: 1.1, background: 'rgba(255,255,255,0.1)' } : undefined}
                whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
                aria-label="Dismiss alert"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </motion.button>
            )}
          </div>

          {/* Progress bar for auto-dismiss */}
          {status === 'SAFE' && (
            <motion.div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: 3,
                background: config.color,
                borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
              }}
              initial={reducedMotion ? undefined : { width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
              aria-hidden="true"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact inline alert for cards/sections
interface InlineAlertProps {
  status: 'SAFE' | 'WARNING' | 'DANGER';
  message: string;
  className?: string;
}

export function InlineAlert({ status, message, className = '' }: InlineAlertProps) {
  const reducedMotion = useReducedMotion();

  const colors = {
    SAFE: { bg: 'rgba(0, 230, 118, 0.1)', border: 'var(--safe)', text: 'var(--safe)', icon: '✅' },
    WARNING: { bg: 'rgba(255, 214, 0, 0.1)', border: 'var(--warning)', text: 'var(--warning)', icon: '⚠️' },
    DANGER: { bg: 'rgba(255, 61, 0, 0.1)', border: 'var(--danger)', text: 'var(--danger)', icon: '🚨' },
  };

  const config = colors[status];

  return (
    <motion.div
      className={clsx('inline-alert', className)}
      initial={reducedMotion ? undefined : { opacity: 0, height: 0, y: -10 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, height: 0, y: -10 }}
      transition={getTransition(transitions.smooth, reducedMotion)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        padding: 'var(--space-sm) var(--space-md)',
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: 'var(--radius-md)',
        color: config.text,
        fontSize: 'var(--text-sm)',
        fontWeight: 500,
      }}
      role="status"
      aria-live="polite"
    >
      <span style={{ fontSize: 'var(--text-base)' }}>{config.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
    </motion.div>
  );
}

// Toast notification system
interface ToastProps {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

export function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose(id), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const colors = {
    success: { bg: 'rgba(0, 230, 118, 0.15)', border: 'var(--safe)', text: 'var(--safe)', icon: '✅' },
    warning: { bg: 'rgba(255, 214, 0, 0.15)', border: 'var(--warning)', text: 'var(--warning)', icon: '⚠️' },
    error: { bg: 'rgba(255, 61, 0, 0.15)', border: 'var(--danger)', text: 'var(--danger)', icon: '🚨' },
    info: { bg: 'rgba(0, 212, 200, 0.15)', border: 'var(--brand-primary)', text: 'var(--brand-primary)', icon: 'ℹ️' },
  };

  const config = colors[type];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reducedMotion ? undefined : { opacity: 0, x: 300, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0, x: 300, scale: 0.9 }}
          transition={getTransition(transitions.bouncy, reducedMotion)}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-sm)',
            padding: 'var(--space-md)',
            background: config.bg,
            border: `1px solid ${config.border}`,
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            minWidth: 300,
            maxWidth: 400,
          }}
          role="alert"
          aria-live="polite"
        >
          <span style={{ fontSize: 'var(--text-lg)', flexShrink: 0 }}>{config.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: config.text, marginBottom: 'var(--space-xs)' }}>{title}</div>
            {message && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{message}</div>}
          </div>
          <motion.button
            onClick={() => { setVisible(false); setTimeout(() => onClose(id), 300); }}
            style={{
              padding: 'var(--space-xs)',
              color: 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            whileHover={!reducedMotion ? { scale: 1.2, color: config.text } : undefined}
            whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
            aria-label="Close notification"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Toast container
interface ToastContainerProps {
  toasts: Array<{ id: string; type: 'success' | 'warning' | 'error' | 'info'; title: string; message?: string; duration?: number }>;
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastContainer({ toasts, onClose, position = 'top-right' }: ToastContainerProps) {
  const reducedMotion = useReducedMotion();

  const positionStyles = {
    'top-right': { top: 'var(--space-xl)', right: 'var(--space-xl)', left: 'auto', bottom: 'auto', flexDirection: 'column-reverse' as const },
    'top-left': { top: 'var(--space-xl)', left: 'var(--space-xl)', right: 'auto', bottom: 'auto', flexDirection: 'column-reverse' as const },
    'bottom-right': { bottom: 'var(--space-xl)', right: 'var(--space-xl)', left: 'auto', top: 'auto', flexDirection: 'column' as const },
    'bottom-left': { bottom: 'var(--space-xl)', left: 'var(--space-xl)', right: 'auto', top: 'auto', flexDirection: 'column' as const },
    'top-center': { top: 'var(--space-xl)', left: '50%', transform: 'translateX(-50%)', right: 'auto', bottom: 'auto', flexDirection: 'column-reverse' as const },
    'bottom-center': { bottom: 'var(--space-xl)', left: '50%', transform: 'translateX(-50%)', right: 'auto', top: 'auto', flexDirection: 'column' as const },
  };

  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 9999,
        display: 'flex',
        gap: 'var(--space-sm)',
        pointerEvents: 'none',
        maxWidth: 'calc(100vw - 2 * var(--space-xl))',
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <Toast {...toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}