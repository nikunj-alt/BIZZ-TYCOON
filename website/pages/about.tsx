'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useFrame } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Navigation, Breadcrumb } from '@/components/ui/Navigation';
import { Footer } from '@/components/ui/Footer';
import { ScrollReveal, StaggerContainer } from '@/lib/animations/ScrollReveal';
import { useReducedMotion } from '@/lib/animations/useReducedMotion';
import { getTransition, transitions } from '@/lib/animations/transitions';
import dynamic from 'next/dynamic';

const AboutBackground = dynamic(() => import('@/components/three/r3f/AboutBackground').then(mod => mod.AboutBackground), {
  ssr: false,
  loading: () => <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#0A0F1A' }} />,
});

// Hero content overlay
function AboutHeroContent() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? undefined : { opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={getTransition({ delay: 0.2, ...transitions.smooth }, reducedMotion)}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        zIndex: 10,
        maxWidth: 800,
        padding: 'var(--space-xl)',
      }}
    >
      <motion.span
        initial={reducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={getTransition({ delay: 0.3, ...transitions.bouncy }, reducedMotion)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-sm) var(--space-md)',
          background: 'rgba(0, 212, 200, 0.1)',
          border: '1px solid var(--brand-primary)',
          borderRadius: 'var(--radius-full)',
          color: 'var(--brand-primary)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 'var(--space-lg)',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-primary)', boxShadow: '0 0 8px var(--brand-primary)' }} />
        Bizz Tycoons 2026 Competition Entry
      </motion.span>

      <motion.h1
        initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={getTransition({ delay: 0.4, ...transitions.smooth }, reducedMotion)}
        style={{
          fontSize: 'clamp(var(--text-3xl), 6vw, var(--text-6xl))',
          fontWeight: 800,
          lineHeight: 1.1,
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-lg)',
          background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--brand-primary) 50%, var(--safe) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        GASTECT IoT Gas Leak Detection System
      </motion.h1>

      <motion.p
        initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={getTransition({ delay: 0.5, ...transitions.smooth }, reducedMotion)}
        style={{
          fontSize: 'var(--text-xl)',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          maxWidth: 600,
          margin: '0 auto var(--space-xl)',
        }}
      >
        A complete local-first IoT solution for real-time gas leak detection,
        featuring multi-sensor telemetry, three-tier alerting, and 3D
        visualizations — built for the Bizz Tycoons competition.
      </motion.p>

      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={getTransition({ delay: 0.6, ...transitions.bouncy }, reducedMotion)}
        style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}
      >
        <a href="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          <span>🏠</span> Live Dashboard
        </a>
        <a href="https://github.com" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          <span>💻</span> View Source
        </a>
      </motion.div>
    </motion.div>
  );
}

// Feature cards
const features = [
  {
    icon: '🔬',
    title: '10 Integrated Sensors & Controls',
    description: 'MQ2 Gas, Flame, PIR Motion, LDR Light, Touch, Joystick, Buzzer, Servo Valve, Battery Monitor, and system status',
    color: 'var(--brand-primary)',
  },
  {
    icon: '⚡',
    title: 'Real-Time Pipeline',
    description: 'Arduino C++ → HC-05 Bluetooth → Python WebSocket Bridge → Next.js Dashboard with sub-100ms latency',
    color: 'var(--safe)',
  },
  {
    icon: '🎨',
    title: 'Immersive 3D Visuals',
    description: 'Three.js + React Three Fiber powered particle systems, morphing geometries, status-reactive lighting, and data-driven animations',
    color: 'var(--warning)',
  },
  {
    icon: '🛡️',
    title: 'Three-Tier Alerting',
    description: 'SAFE (<200 PPM), WARNING (200–499 PPM), DANGER (≥500 PPM) with distinct colors, tones, and one-tap evacuation',
    color: 'var(--danger)',
  },
  {
    icon: '🌐',
    title: 'End-to-End Data Pipeline',
    description: 'C++ firmware → Bluetooth serial → Python WebSocket bridge → SQLite history → Next.js dashboard',
    color: 'var(--brand-secondary)',
  },
  {
    icon: '🔒',
    title: 'Local-First Architecture',
    description: 'Zero cloud dependency for competition reliability. Runs entirely on localhost with optional ngrok/Cloudflare tunnels for remote access',
    color: 'var(--info)',
  },
];

function FeaturesSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section style={{ padding: 'var(--space-3xl) var(--space-xl)', maxWidth: '1200px', margin: '0 auto' }}>
      <ScrollReveal variant="slideUp">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
            System Capabilities
          </h2>
          <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto' }}>
            Every component engineered for reliability, responsiveness, and real-time performance
          </p>
        </div>
      </ScrollReveal>

      <StaggerContainer staggerDelay={0.1}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
          {features.map((feature, index) => (
            <ScrollReveal key={index} variant="slideUp">
              <motion.div
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-xl)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                }}
                whileHover={!reducedMotion ? { y: -4, boxShadow: 'var(--shadow-xl)' } : undefined}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${feature.color}, ${feature.color}80)`,
                  }}
                />

                <div style={{ fontSize: 'var(--text-4xl)', marginBottom: 'var(--space-md)' }}>{feature.icon}</div>
                <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {feature.description}
                </p>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </StaggerContainer>
    </section>
  );
}

// Architecture diagram section
function ArchitectureSection() {
  const reducedMotion = useReducedMotion();

  const layers = [
    { name: 'Hardware Layer', components: ['Arduino Uno', 'MQ2 Gas Sensor', 'Flame Sensor', 'PIR Motion', 'LDR Light', 'Touch Sensor', 'Joystick', 'Buzzer', 'Servo Valve', 'Battery Monitor'], color: 'var(--brand-primary)' },
    { name: 'Communication', components: ['HC-05 Bluetooth', 'Serial UART', 'JSON Protocol', 'Auto-Reconnect'], color: 'var(--info)' },
    { name: 'Bridge Layer', components: ['Python asyncio', 'WebSocket Server', 'SQLite Logging', 'Threshold Config', 'Health Monitoring'], color: 'var(--safe)' },
    { name: 'Application', components: ['Next.js 14', 'React 18', 'TypeScript', 'Three.js/R3F', 'Framer Motion'], color: 'var(--warning)' },
    { name: 'Presentation', components: ['3D Dashboard', 'Real-time Charts', 'Alert System', 'Control Panel'], color: 'var(--danger)' },
  ];

  return (
    <section style={{ padding: 'var(--space-3xl) var(--space-xl)', background: 'var(--surface-elevated)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <ScrollReveal variant="slideUp">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
              System Architecture
            </h2>
            <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto' }}>
              Five-layer architecture ensuring separation of concerns and fault tolerance
            </p>
          </div>
        </ScrollReveal>

        <StaggerContainer staggerDelay={0.1}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {layers.map((layer, index) => (
              <ScrollReveal key={index} variant="slideRight">
                <motion.div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '200px 1fr',
                    gap: 'var(--space-xl)',
                    alignItems: 'center',
                    padding: 'var(--space-lg)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xl)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  initial={reducedMotion ? undefined : { opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={getTransition({ delay: index * 0.1, ...transitions.smooth }, reducedMotion)}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 'var(--radius-lg)',
                        background: `linear-gradient(135deg, ${layer.color}, ${layer.color}80)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto var(--space-md)',
                        boxShadow: `0 0 20px ${layer.color}40`,
                      }}
                    >
                      <span style={{ fontSize: 'var(--text-2xl)' }}>
                        {index === 0 ? '🔧' : index === 1 ? '📡' : index === 2 ? '🌉' : index === 3 ? '⚛️' : '🖥️'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>{layer.name}</h3>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                    {layer.components.map((comp, i) => (
                      <motion.span
                        key={i}
                        style={{
                          padding: 'var(--space-xs) var(--space-md)',
                          background: `rgba(${layer.color.replace('var(--', '').replace(')', '')}, 0.1)`,
                          border: `1px solid ${layer.color}40`,
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--text-sm)',
                          color: layer.color,
                          fontWeight: 500,
                        }}
                        initial={reducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={getTransition({ delay: index * 0.1 + i * 0.03, ...transitions.bouncy }, reducedMotion)}
                      >
                        {comp}
                      </motion.span>
                    ))}
                  </div>

                  {index < layers.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 'var(--space-xl)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 2,
                        height: '80%',
                        background: `linear-gradient(to bottom, ${layer.color}, ${layers[index + 1].color})`,
                        borderRadius: 2,
                      }}
                    >
                      <motion.div
                        style={{
                          width: '100%',
                          height: 8,
                          background: 'var(--text-primary)',
                          borderRadius: 2,
                        }}
                        animate={{ y: [0, '100%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                  )}
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </StaggerContainer>
      </div>
    </section>
  );
}

// Tech stack section
function TechStackSection() {
  const reducedMotion = useReducedMotion();

  const categories = [
    { name: 'Embedded', items: ['C++ (Arduino)', 'C (AVR)', 'PlatformIO'], color: 'var(--brand-primary)' },
    { name: 'Bridge', items: ['Python 3.11+', 'asyncio', 'websockets', 'pyserial', 'sqlite3'], color: 'var(--info)' },
    { name: 'Frontend', items: ['Next.js 14', 'React 18', 'TypeScript', 'CSS Design Tokens'], color: 'var(--safe)' },
    { name: '3D & Viz', items: ['Three.js', 'React Three Fiber', '@react-three/drei'], color: 'var(--warning)' },
    { name: 'Animation', items: ['Framer Motion', 'CSS Animations', 'Web Animations API'], color: 'var(--danger)' },
    { name: 'DevOps', items: ['Docker', 'Docker Compose', 'GitHub Actions', 'Vercel'], color: 'var(--brand-secondary)' },
  ];

  return (
    <section style={{ padding: 'var(--space-3xl) var(--space-xl)', maxWidth: '1200px', margin: '0 auto' }}>
      <ScrollReveal variant="slideUp">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
            Technology Stack
          </h2>
          <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto' }}>
            A focused toolchain spanning embedded C++ to a React 3D dashboard
          </p>
        </div>
      </ScrollReveal>

      <StaggerContainer staggerDelay={0.1}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-lg)' }}>
          {categories.map((cat, index) => (
            <ScrollReveal key={index} variant="slideUp">
              <motion.div
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-xl)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                whileHover={!reducedMotion ? { y: -4, boxShadow: 'var(--shadow-xl)' } : undefined}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${cat.color}, ${cat.color}80)`,
                  }}
                />

                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: cat.color,
                      boxShadow: `0 0 8px ${cat.color}`,
                    }}
                  />
                  {cat.name}
                </h3>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {cat.items.map((item, i) => (
                    <motion.li
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        padding: 'var(--space-xs) 0',
                        color: 'var(--text-secondary)',
                        fontSize: 'var(--text-sm)',
                        borderBottom: i < cat.items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      }}
                      initial={reducedMotion ? undefined : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={getTransition({ delay: index * 0.1 + i * 0.05, ...transitions.smooth }, reducedMotion)}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </StaggerContainer>
    </section>
  );
}

// Team/Competition info
function CompetitionSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section style={{ padding: 'var(--space-3xl) var(--space-xl)', background: 'var(--surface-elevated)', borderTop: '1px solid var(--border-subtle)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <ScrollReveal variant="slideUp">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
              Bizz Tycoons 2026
            </h2>
            <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto' }}>
              Competition details and project timeline
            </p>
          </div>
        </ScrollReveal>

        <StaggerContainer staggerDelay={0.15}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
            {[
              { title: 'Competition', details: ['Bizz Tycoons 2026', 'Date: Dec 15, 2026', 'Category: IoT Innovation', 'Team: GASTECT Systems'], icon: '🏆', color: 'var(--warning)' },
              { title: 'Timeline', details: ['Aug: Architecture Design', 'Sep: Hardware Integration', 'Oct: Software Development', 'Nov: Testing & Polish', 'Dec: Final Demo'], icon: '📅', color: 'var(--brand-primary)' },
              { title: 'Deliverables', details: ['Working Prototype', 'Live Dashboard', 'Documentation', 'Video Demo', 'Source Code'], icon: '📦', color: 'var(--safe)' },
              { title: 'Innovation', details: ['Local-First Architecture', 'Real-time 3D Viz', 'Accessibility First', 'Zero-Cloud Dependency', 'Resilient Auto-Reconnect'], icon: '💡', color: 'var(--danger)' },
            ].map((card, index) => (
              <ScrollReveal key={index} variant="slideUp">
                <motion.div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-xl)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={getTransition({ delay: index * 0.1, ...transitions.smooth }, reducedMotion)}
                  whileHover={!reducedMotion ? { y: -4, boxShadow: 'var(--shadow-xl)' } : undefined}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: `linear-gradient(90deg, ${card.color}, ${card.color}80)`,
                    }}
                  />
                  <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-md)' }}>{card.icon}</div>
                  <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-lg)' }}>
                    {card.title}
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {card.details.map((detail, i) => (
                      <motion.li
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-sm)',
                          color: 'var(--text-secondary)',
                          fontSize: 'var(--text-sm)',
                        }}
                        initial={reducedMotion ? undefined : { opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={getTransition({ delay: index * 0.1 + i * 0.05, ...transitions.smooth }, reducedMotion)}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: card.color, flexShrink: 0 }} />
                        {detail}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </StaggerContainer>
      </div>
    </section>
  );
}

// Main About page
export default function About() {
  const reducedMotion = useReducedMotion();
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'About' },
  ];

  return (
    <motion.div
      className="app-container"
      initial={reducedMotion ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={getTransition(transitions.smooth, reducedMotion)}
      style={{ minHeight: '100vh', background: 'var(--surface)' }}
    >
      <Navigation connected={false} status="UNKNOWN" ppm={0} />

      <main style={{ paddingTop: 'var(--space-xl)', minHeight: 'calc(100vh - var(--nav-height, 72px))' }}>
        {/* 3D Background Canvas */}
        <AboutBackground />

        {/* Hero Section */}
        <section style={{ position: 'relative', minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
          <AboutHeroContent />
        </section>

        {/* Content Sections */}
        <div style={{ position: 'relative', zIndex: 1, background: 'var(--surface)' }}>
          <Breadcrumb items={breadcrumbs} />
          <FeaturesSection />
          <ArchitectureSection />
          <TechStackSection />
          <CompetitionSection />
        </div>
      </main>

      <Footer />
    </motion.div>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  };
}