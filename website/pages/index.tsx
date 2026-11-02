'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { HeroSection } from '@/components/ui/HeroSection';
import { ReadingCard, ReadingCardGrid } from '@/components/ui/ReadingCard';
import { HistoryChart3D } from '@/components/ui/HistoryChart3D';
import { SensorGrid, SensorGrid2D, type SensorData } from '@/components/ui/SensorGrid';
import { ControlPanel } from '@/components/ui/ControlPanel';
import { AlertBanner, ToastContainer } from '@/components/ui/AlertBanner';
import { Navigation, Breadcrumb } from '@/components/ui/Navigation';
import { Footer } from '@/components/ui/Footer';
import { ScrollReveal, StaggerContainer } from '@/lib/animations/ScrollReveal';
import { useReducedMotion } from '@/lib/animations/useReducedMotion';
import { getTransition, transitions } from '@/lib/animations/transitions';
import dynamic from 'next/dynamic';

const ThreeCanvas = dynamic(() => import('@/components/three/r3f/ThreeCanvas').then(mod => mod.ThreeCanvas), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%', background: '#0A0F1A' }} />,
});

const HomeCanvasContent = dynamic(() => import('@/components/three/r3f/HomeCanvasContent').then(mod => mod.HomeCanvasContent), {
  ssr: false,
});

import clsx from 'clsx';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [thresholds, setThresholds] = useState({ warn: 200, danger: 500 });
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'warning' | 'error' | 'info'; title: string; message?: string }>>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8765';

  // Reconnect backoff: max 10 attempts, delay grows as 2000 * attempt ms.
  const MAX_RECONNECT_ATTEMPTS = 10;
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  const addToast = (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const connect = useCallback(() => {
    // Clear any pending reconnect timer.
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const attempt = reconnectAttemptRef.current;
    if (attempt > MAX_RECONNECT_ATTEMPTS) {
      addToast('error', 'Connection Failed', 'Could not reconnect to the bridge');
      return;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      console.log('Connected to GASTECT bridge');
      setConnected(true);
      addToast('success', 'Connected', 'WebSocket connection established');
    };

    ws.onclose = () => {
      console.log('Disconnected from bridge');
      setConnected(false);
      reconnectAttemptRef.current += 1;
      if (reconnectAttemptRef.current <= MAX_RECONNECT_ATTEMPTS) {
        addToast('warning', 'Disconnected', `WebSocket connection lost. Reconnecting (attempt ${reconnectAttemptRef.current})...`);
        reconnectTimerRef.current = setTimeout(connect, 2000 * reconnectAttemptRef.current);
      } else {
        addToast('error', 'Connection Failed', 'Maximum reconnect attempts reached. Click Connect to retry.');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      addToast('error', 'Connection Error', 'Failed to connect to WebSocket bridge');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'connected') return;
        if (payload.type === 'threshold_update') {
          setThresholds({ warn: payload.warn, danger: payload.danger });
          return;
        }
        setData(payload);
        setHistory(prev => [...prev.slice(-59), { ...payload, timestamp: payload.timestamp }]);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };
  }, [wsUrl]);

  const handleConnect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    reconnectAttemptRef.current = 0;
    connect();
  };

  const handleDisconnect = () => {
    if (wsRef.current) wsRef.current.close();
  };

  const handleCommand = (command: string, params = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command, params }));
      addToast('info', 'Command Sent', `${command}${Object.keys(params).length ? ` ${JSON.stringify(params)}` : ''}`);
    } else {
      addToast('error', 'Not Connected', 'Please connect to the device first');
    }
  };

  const handleThresholdChange = (warn: number, danger: number) => {
    setThresholds({ warn, danger });
    handleCommand('set_threshold', { sensor: 'gas', level: 'safe', value: warn });
    handleCommand('set_threshold', { sensor: 'gas', level: 'warning', value: danger });
  };

  const handleSilence = () => {
    handleCommand('silence');
    addToast('success', 'Alarm Silenced', 'Buzzer has been silenced');
  };

  const handleEvacuate = () => {
    addToast('error', 'EVACUATION INITIATED', 'Follow emergency protocols immediately!');
    handleCommand('evacuate');
  };

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // Prepare sensor data for grid
  const sensorData: SensorData[] = [
    { name: 'Motion (PIR)', value: data?.motion ?? 0, unit: 'Digital', status: data?.motion ? 'WARNING' : 'SAFE', type: 'digital' },
    { name: 'Touch (Silence)', value: data?.touch ?? 0, unit: 'Digital', status: data?.touch ? 'WARNING' : 'SAFE', type: 'digital' },
    { name: 'Joystick X', value: data?.joy_x ?? 0, unit: '0-1023', status: 'SAFE', type: 'analog' },
    { name: 'Joystick Y', value: data?.joy_y ?? 0, unit: '0-1023', status: 'SAFE', type: 'analog' },
    { name: 'Joystick Button', value: data?.joy_btn ?? 0, unit: 'Digital', status: data?.joy_btn ? 'WARNING' : 'SAFE', type: 'digital' },
    { name: 'System Armed', value: data?.armed ?? 0, unit: 'Digital', status: data?.armed ? 'SAFE' : 'OFFLINE', type: 'digital' },
    { name: 'Alarm Silenced', value: data?.silenced ?? 0, unit: 'Digital', status: data?.silenced ? 'WARNING' : 'SAFE', type: 'digital' },
    { name: 'Servo Valve', value: data?.servo ?? 0, unit: 'Degrees', status: data?.servo === 180 ? 'WARNING' : 'SAFE', type: 'analog' },
  ];

  // Calculate trends
  const ppmTrend = history.length > 10 ? (history[history.length - 1].ppm > history[history.length - 10].ppm ? 'up' : 'down') : 'stable';
  const ppmTrendValue = history.length > 10 ? Math.abs((history[history.length - 1].ppm - history[history.length - 10].ppm) / history[history.length - 10].ppm * 100) : 0;

  const flameTrend = history.length > 10 ? (history[history.length - 1].flame > history[history.length - 10].flame ? 'up' : 'down') : 'stable';
  const flameTrendValue = history.length > 10 ? Math.abs((history[history.length - 1].flame - history[history.length - 10].flame) / Math.max(1, history[history.length - 10].flame) * 100) : 0;

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard' },
  ];

  return (
    <motion.div
      className="app-container"
      initial={reducedMotion ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={getTransition(transitions.smooth, reducedMotion)}
      style={{ minHeight: '100vh', background: 'var(--surface)' }}
    >
      <Navigation connected={connected} status={data?.status || 'UNKNOWN'} ppm={data?.ppm || 0} />

      <ToastContainer toasts={toasts} onClose={removeToast} position="top-right" />

      <main style={{ paddingTop: 'var(--space-xl)', minHeight: 'calc(100vh - var(--nav-height, 72px))' }}>
        <Breadcrumb items={breadcrumbs} />

        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 var(--space-xl) var(--space-2xl)' }}>
          {/* Alert Banner */}
          <AlertBanner
            status={data?.status || 'UNKNOWN'}
            ppm={data?.ppm || 0}
            flame={data?.flame || 0}
            warn={thresholds.warn}
            danger={thresholds.danger}
            onSilence={handleSilence}
            onEvacuate={handleEvacuate}
            onDismiss={() => {}}
          />

          {/* Hero Section */}
          <HeroSection
            status={data?.status || 'UNKNOWN'}
            ppm={data?.ppm || 0}
            connected={connected}
            flame={data?.flame || 0}
            battery={data?.battery || 0}
            onSilence={handleSilence}
            onTest={() => handleCommand('test_alarm')}
          />

          {/* Reading Cards Grid */}
          <ScrollReveal variant="slideUp">
            <ReadingCardGrid
              columns={4}
              gap="var(--space-md)"
              cards={[
                {
                  label: 'Gas Concentration',
                  value: data?.ppm ?? '—',
                  unit: 'PPM',
                  status: data?.status || 'UNKNOWN',
                  icon: '💨',
                  trend: ppmTrend,
                  trendValue: ppmTrendValue,
                },
                {
                  label: 'Flame Intensity',
                  value: data?.flame ?? '—',
                  unit: '',
                  status: data?.flame >= 600 ? 'DANGER' : data?.flame >= 400 ? 'WARNING' : 'SAFE',
                  icon: '🔥',
                  trend: flameTrend,
                  trendValue: flameTrendValue,
                },
                {
                  label: 'Battery Level',
                  value: data?.battery ?? '—',
                  unit: '%',
                  status: data?.battery <= 20 ? 'WARNING' : 'SAFE',
                  icon: '🔋',
                },
                {
                  label: 'Ambient Light',
                  value: data?.ldr ?? '—',
                  unit: '',
                  status: 'SAFE',
                  icon: '☀️',
                },
              ]}
            />
          </ScrollReveal>

          {/* Main Dashboard Grid */}
          <ScrollReveal variant="slideUp">
            <div
              className="dashboard-grid"
              style={{ marginTop: 'var(--space-2xl)' }}
            >
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                {/* 3D Visualization */}
                <motion.section
                  initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={getTransition({ delay: 0.1, ...transitions.smooth }, reducedMotion)}
                  style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xl)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: 'var(--space-md) var(--space-lg)',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      3D Real-Time Sensor Visualization
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: connected ? 'var(--safe)' : 'var(--danger)',
                          boxShadow: `0 0 8px ${connected ? 'var(--safe)' : 'var(--danger)'}`,
                        }}
                      />
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {connected ? 'LIVE' : 'OFFLINE'}
                      </span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '450px' }}>
                    <ThreeCanvas
                      camera={{ position: [0, 2, 8], fov: 50 }}
                      gl={{ antialias: true, alpha: true }}
                      style={{ width: '100%', height: '100%' }}
                      backgroundColor="#0A0F1A"
                    >
                      <HomeCanvasContent status={data?.status || 'UNKNOWN'} ppm={data?.ppm || 0} />
                    </ThreeCanvas>
                  </div>
                </motion.section>

                {/* History Chart 3D */}
                <HistoryChart3D
                  history={history.map(h => ({ ppm: h.ppm, flame: h.flame, timestamp: h.timestamp }))}
                  height="300px"
                  warn={thresholds.warn}
                  danger={thresholds.danger}
                />

                {/* Sensor Grid 2D */}
                <motion.section
                  initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={getTransition({ delay: 0.2, ...transitions.smooth }, reducedMotion)}
                  style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-lg)',
                  }}
                >
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-lg)' }}>
                    Sensor Status Grid
                  </h3>
                  <SensorGrid2D sensors={sensorData} columns={4} />
                </motion.section>
              </div>

              {/* Right Column - Control Panel */}
              <ControlPanel
                connected={connected}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onSendCommand={handleCommand}
                thresholds={thresholds}
                onThresholdChange={handleThresholdChange}
              />
            </div>
          </ScrollReveal>
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