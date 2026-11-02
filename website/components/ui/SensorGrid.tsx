'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { SensorGrid3DR3F } from '@/components/three/r3f/SensorGrid3DR3F';
import { ScrollReveal } from '@/lib/animations/ScrollReveal';
import clsx from 'clsx';

export interface SensorData {
  name: string;
  value: number | string;
  unit: string;
  status: 'SAFE' | 'WARNING' | 'DANGER' | 'OFFLINE';
  type: 'digital' | 'analog';
}

interface SensorGridProps {
  sensors: SensorData[];
  className?: string;
  height?: string;
}

const sensorConfig: Record<string, { position: [number, number, number]; icon: string }> = {
  'Motion (PIR)': { position: [-3, 0, -3], icon: '🔴' },
  'Touch (Silence)': { position: [3, 0, -3], icon: '👆' },
  'Joystick X': { position: [-3, 0, 0], icon: '🎮' },
  'Joystick Y': { position: [0, 0, 0], icon: '🎮' },
  'Joystick Button': { position: [3, 0, 0], icon: '🎮' },
  'System Armed': { position: [-3, 0, 3], icon: '🛡️' },
  'Alarm Silenced': { position: [0, 0, 3], icon: '🔕' },
  'Servo Valve': { position: [3, 0, 3], icon: '⚙️' },
};

export function SensorGrid({ sensors, className = '', height = '400px' }: SensorGridProps) {
  const gridSensors = sensors.map((sensor) => {
    const config = sensorConfig[sensor.name] || { position: [0, 0, 0], icon: '📟' };
    const statusColor = {
      SAFE: 0x00e676,
      WARNING: 0xffd600,
      DANGER: 0xff3d00,
      OFFLINE: 0x666666,
    }[sensor.status];

    return {
      id: sensor.name,
      name: sensor.name,
      position: config.position,
      value: typeof sensor.value === 'number' ? sensor.value : parseFloat(String(sensor.value)) || 0,
      unit: sensor.unit,
      status: sensor.status,
      statusColor,
      type: sensor.type,
    };
  });

  return (
    <ScrollReveal variant="slideUp" className={clsx('sensor-grid-3d', className)}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height,
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
        }}
      >
        <Canvas
          camera={{ position: [0, 8, 10], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={['#0A0F1A']} />
          <fog attach="fog" args={['#0A0F1A', 8, 40]} />
          <ambientLight intensity={0.5} />
          <directionalLight color={0xffffff} intensity={0.6} position={[5, 10, 5]} />
          <directionalLight color={0x00d4c8} intensity={0.3} position={[-5, 5, -5]} />
          <SensorGrid3DR3F sensors={gridSensors} />
        </Canvas>

        {/* Overlay legend */}
        <div
          style={{
            position: 'absolute',
            bottom: 'var(--space-md)',
            left: 'var(--space-md)',
            right: 'var(--space-md)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-sm)',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 10,
          }}
          aria-hidden="true"
        >
          {['SAFE', 'WARNING', 'DANGER', 'OFFLINE'].map((status) => (
            <LegendItem key={status} status={status as any} />
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}

function LegendItem({ status }: { status: 'SAFE' | 'WARNING' | 'DANGER' | 'OFFLINE' }) {
  const colors = {
    SAFE: '#00e676',
    WARNING: '#ffd600',
    DANGER: '#ff3d00',
    OFFLINE: '#666666',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', padding: 'var(--space-xs) var(--space-sm)', background: 'rgba(10, 15, 26, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(8px)' }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[status], boxShadow: `0 0 8px ${colors[status]}` }} />
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{status}</span>
    </div>
  );
}

// 2D Sensor Grid Component for simpler display
interface SensorGrid2DProps {
  sensors: SensorData[];
  className?: string;
  columns?: number;
}

export function SensorGrid2D({ sensors, className = '' }: SensorGrid2DProps) {
  return (
    <div className={clsx('sensor-grid-2d', className)} role="list" aria-label="Sensor status grid">
      {sensors.map((sensor, index) => (
        <SensorCard2D key={`${sensor.name}-${index}`} sensor={sensor} index={index} />
      ))}
    </div>
  );
}

interface SensorCard2DProps {
  sensor: SensorData;
  index: number;
}

function SensorCard2D({ sensor, index }: SensorCard2DProps) {
  const statusColors = {
    SAFE: { bg: 'rgba(0, 230, 118, 0.1)', border: 'var(--safe)', text: 'var(--safe)', glow: 'var(--safe-glow)' },
    WARNING: { bg: 'rgba(255, 214, 0, 0.1)', border: 'var(--warning)', text: 'var(--warning)', glow: 'var(--warning-glow)' },
    DANGER: { bg: 'rgba(255, 61, 0, 0.1)', border: 'var(--danger)', text: 'var(--danger)', glow: 'var(--danger-glow)' },
    OFFLINE: { bg: 'var(--surface-elevated)', border: 'var(--border-subtle)', text: 'var(--text-muted)', glow: 'transparent' },
  };

  const colors = statusColors[sensor.status];

  return (
    <article
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-md)',
        transition: 'transform var(--duration-fast) ease, box-shadow var(--duration-fast) ease, border-color var(--duration-fast) ease',
      }}
      role="listitem"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {sensor.name}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
            padding: 'var(--space-xs) var(--space-sm)',
            borderRadius: 'var(--radius-full)',
            background: `rgba(${colors.text.replace('var(--', '').replace(')', '')}, 0.15)`,
            border: `1px solid ${colors.border}40`,
            color: colors.text,
            fontWeight: 600,
            fontSize: 'var(--text-xs)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.text, boxShadow: `0 0 6px ${colors.text}` }} />
          {sensor.status}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-xs)' }}>
          <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {sensor.value}
          </span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{sensor.unit}</span>
        </div>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{sensor.type.toUpperCase()}</span>
      </div>
    </article>
  );
}