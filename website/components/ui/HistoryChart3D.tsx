'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { Line, Points, Mesh, Group, OrthographicCamera, LineSegments, BufferGeometry, Float32BufferAttribute, LineBasicMaterial, MeshBasicMaterial, PointsMaterial } from 'three';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/animations/useReducedMotion';
import { getTransition, transitions } from '@/lib/animations/transitions';
import { ScrollReveal } from '@/lib/animations/ScrollReveal';
import clsx from 'clsx';

// Extend Three.js objects for R3F
extend({ Line, Points, Mesh, Group, OrthographicCamera, LineSegments, BufferGeometry, Float32BufferAttribute, LineBasicMaterial, MeshBasicMaterial, PointsMaterial });

interface HistoryChart3DProps {
  history: Array<{ ppm: number; flame: number; timestamp: number | string }>;
  className?: string;
  height?: string;
  warn?: number;
  danger?: number;
}

export function HistoryChart3D({ history, className = '', height = '300px', warn = 200, danger = 500 }: HistoryChart3DProps) {
  const reducedMotion = useReducedMotion();
  const [dataHistory, setDataHistory] = useState(history.slice(-200));
  const [maxPPM, setMaxPPM] = useState(1000);

  useEffect(() => {
    setDataHistory(history.slice(-200));
    const maxVal = Math.max(...history.map(h => h.ppm), 200);
    setMaxPPM(Math.ceil(maxVal / 100) * 100);
  }, [history]);

  const config = useMemo(() => {
    const latestPPM = dataHistory[dataHistory.length - 1]?.ppm ?? 0;
    const status = latestPPM >= danger ? 'DANGER' : latestPPM >= warn ? 'WARNING' : 'SAFE';

    switch (status) {
      case 'DANGER':
        return { lineColor: 0xff3d00, fillColor: 0xff3d00, glowColor: 0xff3d00, particleColor: 0xff6b35 };
      case 'WARNING':
        return { lineColor: 0xffd600, fillColor: 0xffd600, glowColor: 0xffd600, particleColor: 0xffaa00 };
      default:
        return { lineColor: 0x00e676, fillColor: 0x00e676, glowColor: 0x00d4c8, particleColor: 0x00ffb3 };
    }
  }, [dataHistory, warn, danger]);

  return (
    <ScrollReveal variant="slideUp" className={clsx('history-chart-3d', className)}>
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
          camera={{ position: [0, 0, 10], fov: 30 }}
          gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={['#0A0F1A']} />
          <fog attach="fog" args={['#0A0F1A', 5, 50]} />
          <ambientLight intensity={0.4} />
          <directionalLight color={config.lineColor} intensity={0.6} position={[5, 10, 5]} />
          <HistoryChartCore dataHistory={dataHistory} config={config} maxPPM={maxPPM} warn={warn} danger={danger} reducedMotion={reducedMotion} />
        </Canvas>

        {/* Overlay info */}
        <div
          style={{
            position: 'absolute',
            top: 'var(--space-md)',
            right: 'var(--space-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-xs)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
          aria-hidden="true"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
              padding: 'var(--space-xs) var(--space-sm)',
              background: 'rgba(10, 15, 26, 0.8)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: config.lineColor.toString(16).padStart(6, '0'),
                boxShadow: `0 0 8px #${config.glowColor.toString(16).padStart(6, '0')}`,
              }}
            />
            <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {dataHistory[dataHistory.length - 1]?.ppm ?? 0} PPM
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
              padding: 'var(--space-xs) var(--space-sm)',
              background: 'rgba(10, 15, 26, 0.8)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Max:</span>
            <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{maxPPM} PPM</span>
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            position: 'absolute',
            bottom: 'var(--space-md)',
            left: 'var(--space-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-xs)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
          aria-hidden="true"
        >
          <LegendItem color="#ff3d00" label={`DANGER ≥ ${danger}`} />
          <LegendItem color="#ffd600" label={`WARN ≥ ${warn}`} />
          <LegendItem color="#00e676" label={`SAFE < ${warn}`} />
        </div>
      </div>
    </ScrollReveal>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 2,
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{label}</span>
    </div>
  );
}

function HistoryChartCore({ dataHistory, config, maxPPM, warn, danger, reducedMotion }: { dataHistory: Array<{ ppm: number; flame: number; timestamp: number | string }>; config: any; maxPPM: number; warn: number; danger: number; reducedMotion: boolean }) {
  const clockRef = useRef<THREE.Clock | null>(null);
  const lineRef = useRef<THREE.Line>(null);
  const fillRef = useRef<THREE.Mesh>(null);
  const gridRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const thresholdRef = useRef<THREE.Group>(null);
  const maxPoints = 200;

  useEffect(() => {
    clockRef.current = new THREE.Clock();
  }, []);

  useFrame((_, delta) => {
    if (reducedMotion || !clockRef.current) return;

    const elapsed = clockRef.current.getElapsedTime();
    const historyLen = dataHistory.length;

    // Update waveform line
    if (lineRef.current) {
      const positions = lineRef.current.geometry.attributes.position;
      const fillPositions = fillRef.current?.geometry.attributes.position;

      for (let i = 0; i < maxPoints; i++) {
        const x = -8 + (i / (maxPoints - 1)) * 16;

        if (i < historyLen) {
          const idx = i - (maxPoints - historyLen);
          if (idx >= 0) {
            const ppmVal = dataHistory[idx].ppm;
            const y = -4 + (ppmVal / maxPPM) * 8;
            positions.setY(i, Math.max(-4, Math.min(4, y)));
          } else {
            positions.setY(i, -4);
          }
        } else {
          positions.setY(i, -4);
        }
        positions.setX(i, x);
        positions.setZ(i, 0);
      }

      // Update fill
      if (fillPositions) {
        for (let i = 0; i < maxPoints - 1; i++) {
          const x1 = positions.getX(i);
          const y1 = positions.getY(i);
          const x2 = positions.getX(i + 1);
          const y2 = positions.getY(i + 1);

          fillPositions.setXYZ(i * 6, x1, y1, 0.01);
          fillPositions.setXYZ(i * 6 + 1, x2, y2, 0.01);
          fillPositions.setXYZ(i * 6 + 2, x1, -4, 0.01);
          fillPositions.setXYZ(i * 6 + 3, x2, y2, 0.01);
          fillPositions.setXYZ(i * 6 + 4, x2, -4, 0.01);
          fillPositions.setXYZ(i * 6 + 5, x1, -4, 0.01);
        }
        fillPositions.needsUpdate = true;
      }
      positions.needsUpdate = true;
    }

    // Particle trail
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position;
      const velocities = particlesRef.current.geometry.attributes.velocity;
      const lifetimes = particlesRef.current.geometry.attributes.lifetime;
      const maxLifetimes = particlesRef.current.geometry.attributes.maxLifetime;
      const sizes = particlesRef.current.geometry.attributes.size;
      const material = particlesRef.current.material as THREE.PointsMaterial;

      for (let i = 0; i < positions.count; i++) {
        const lifeRatio = lifetimes.getX(i) / maxLifetimes.getX(i);

        if (lifeRatio < 1) {
          positions.setX(i, positions.getX(i) + velocities.getX(i) * delta * 60);
          positions.setY(i, positions.getY(i) + velocities.getY(i) * delta * 60);
          lifetimes.setX(i, lifetimes.getX(i) + delta);

          const baseSize = sizes.getX(i);
          material.size = baseSize * (1 - lifeRatio);
          material.opacity = 0.6 * (1 - lifeRatio);
        }
      }
      positions.needsUpdate = true;
      lifetimes.needsUpdate = true;
    }

    // Grid pulse
    if (gridRef.current) {
      gridRef.current.traverse((obj) => {
        if (obj instanceof Line) {
          const mat = obj.material as THREE.LineBasicMaterial;
          mat.opacity = 0.15 + Math.sin(elapsed * 0.3) * 0.05;
        }
      });
    }

    // Threshold pulse
    if (thresholdRef.current) {
      thresholdRef.current.traverse((obj) => {
        if (obj instanceof Line) {
          const mat = obj.material as THREE.LineBasicMaterial;
          mat.opacity = 0.3 + Math.sin(elapsed * 2) * 0.15;
        }
      });
    }

    // Line glow
    if (lineRef.current) {
      const mat = lineRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.9 + Math.sin(elapsed * 4) * 0.1;
    }
  });

  return (
    <group>
      <orthographicCamera position={[0, 0, 10]} left={-8} right={8} top={4} bottom={-4} near={0.1} far={100} />

      {/* Grid */}
      <group ref={gridRef}>
        <lineSegments>
          <bufferGeometry>
            <float32BufferAttribute
              name="position"
              array={(() => {
                const vertices: number[] = [];
                for (let i = 0; i <= 16; i++) {
                  const x = -8 + i;
                  vertices.push(x, -4, 0, x, 4, 0);
                }
                for (let i = 0; i <= 8; i++) {
                  const y = -4 + i;
                  vertices.push(-8, y, 0, 8, y, 0);
                }
                return new Float32Array(vertices);
              })()}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={0x001122} transparent opacity={0.2} />
        </lineSegments>
      </group>

      {/* Threshold lines */}
      <group ref={thresholdRef}>
        <line>
          <bufferGeometry>
            <float32BufferAttribute array={new Float32Array([-8, -4 + (warn / maxPPM) * 8, 0, 8, -4 + (warn / maxPPM) * 8, 0])} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color={0xffd600} transparent opacity={0.4} />
        </line>
        <line>
          <bufferGeometry>
            <float32BufferAttribute array={new Float32Array([-8, -4 + (danger / maxPPM) * 8, 0, 8, -4 + (danger / maxPPM) * 8, 0])} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color={0xff3d00} transparent opacity={0.4} />
        </line>
      </group>

      {/* Fill area */}
      <mesh ref={fillRef}>
        <bufferGeometry>
          <float32BufferAttribute name="position" array={new Float32Array(maxPoints * 6)} itemSize={3} />
        </bufferGeometry>
        <meshBasicMaterial
          color={config.fillColor}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Waveform line */}
      {lineRef.current && (
        <primitive ref={lineRef} object={lineRef.current}>
          <bufferGeometry>
            <float32BufferAttribute name="position" array={new Float32Array(maxPoints * 3)} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color={config.lineColor} transparent opacity={1} linewidth={3} />
        </primitive>
      )}

      {/* Particles */}
      <points ref={particlesRef} position={[0, 0, 0]}>
        <bufferGeometry>
          <float32BufferAttribute name="position" array={new Float32Array(80 * 3)} itemSize={3} />
          <float32BufferAttribute name="color" array={new Float32Array(80 * 3)} itemSize={3} />
          <float32BufferAttribute name="size" array={new Float32Array(80)} itemSize={1} />
          <float32BufferAttribute name="velocity" array={new Float32Array(80 * 3)} itemSize={3} />
          <float32BufferAttribute name="lifetime" array={new Float32Array(80)} itemSize={1} />
          <float32BufferAttribute name="maxLifetime" array={new Float32Array(80)} itemSize={1} />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          vertexColors
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}