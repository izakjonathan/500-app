'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAppStore } from '@/lib/state/appStore';
import type { AdventureMode } from '@/lib/types';
import { formatDistance } from '@/lib/utils';
import { GlassCard } from '@/components/ui/GlassCard';

const modes: Array<{ id: AdventureMode; label: string; hint: string; glyph: string }> = [
  { id: 'bars', label: 'Bars', hint: 'One spontaneous stop', glyph: '✦' },
  { id: 'nature', label: 'Nature', hint: 'There and back', glyph: '◌' },
  { id: 'explore', label: 'Explore', hint: 'Nearby curiosity', glyph: '◇' },
  { id: 'bus', label: 'Bus', hint: 'Ride first', glyph: '↗' }
];

const radiusOptions = [800, 1500, 3000, 7000];

const suspenseLines: Record<AdventureMode, string[]> = {
  bars: ['Scanning warm windows…', 'Dodging obvious choices…', 'Listening for the busy corner…', 'Locking onto the first round…'],
  nature: ['Finding green space…', 'Measuring the way back…', 'Choosing the nicer detour…', 'Setting the walking loop…'],
  explore: ['Looking for odd details…', 'Ignoring the predictable route…', 'Shuffling nearby curiosities…', 'Choosing your tiny mission…'],
  bus: ['Letting transit decide…', 'Starting the invisible timer…', 'Choosing a direction, not a plan…', 'Preparing the mystery stop…']
};

export function AdventureApp() {
  const reduce = useReducedMotion();
  const {
    hydrate,
    hydrated,
    mode,
    setMode,
    radiusMeters,
    setRadius,
    discovery,
    setDiscovery,
    phase,
    current,
    error,
    recent,
    stale,
    generate,
    clearRecent,
    clearMemory
  } = useAppStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  const isGenerating = phase === 'locating' || phase === 'spinning' || phase === 'revealing';
  const modeLabel = modes.find((item) => item.id === mode)?.label ?? 'Explore';

  return (
    <main className="app-shell">
      <div className="bg-scene" />
      <div className="bg-noise" />
      <div className="bg-orb one" />
      <div className="bg-orb two" />

      <section className="content-stack">
        <header className="topbar">
          <div>
            <p className="eyebrow">Adventure Roulette</p>
            <h1>Let chance pick the plan.</h1>
          </div>
          <div className={hydrated ? 'status-dot ready' : 'status-dot'} aria-label={hydrated ? 'Ready' : 'Loading'} />
        </header>

        <GlassCard className="mode-card">
          <div className="mode-grid" role="tablist" aria-label="Adventure modes">
            {modes.map((item) => (
              <button
                key={item.id}
                className={mode === item.id ? 'mode active' : 'mode'}
                onClick={() => setMode(item.id)}
                aria-pressed={mode === item.id}
              >
                <i>{item.glyph}</i>
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="control-card">
          <div className="row"><span>Radius</span><strong>{radiusMeters >= 1000 ? `${radiusMeters / 1000} km` : `${radiusMeters} m`}</strong></div>
          <div className="radius-row">
            {radiusOptions.map((r) => (
              <button key={r} className={radiusMeters === r ? 'chip active' : 'chip'} onClick={() => setRadius(r)}>
                {r >= 1000 ? `${r / 1000}k` : r}
              </button>
            ))}
          </div>
          <button className={discovery ? 'discovery active' : 'discovery'} onClick={() => setDiscovery(!discovery)}>
            <span>Discovery preference</span><b>{discovery ? 'On' : 'Off'}</b>
          </button>
        </GlassCard>

        <div className="stage" aria-live="polite">
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <SuspensePanel key="suspense" mode={mode} phase={phase} reduce={Boolean(reduce)} />
            ) : current ? (
              <motion.div
                key={current.id}
                className="result-wrap"
                initial={reduce ? false : { opacity: 0, y: 28, scale: 0.965, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -12, scale: 0.985 }}
                transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
              >
                <GlassCard className="result-card">
                  <motion.div
                    className="reveal-shine"
                    initial={reduce ? false : { x: '-120%' }}
                    animate={reduce ? undefined : { x: '120%' }}
                    transition={{ delay: 0.12, duration: 0.9, ease: 'easeOut' }}
                  />
                  <p className="reveal-label">Your {modeLabel.toLowerCase()} adventure</p>
                  <h2>{current.name}</h2>
                  <p className="subtitle">{current.subtitle}</p>
                  <p className="description">{current.description}</p>
                  <div className="meta-row">
                    <span>{current.mode === 'nature' ? `Round trip: ${formatDistance(current.totalWalkMeters)}` : formatDistance(current.distanceMeters)}</span>
                    {current.estimatedMinutes ? <span>≈ {current.estimatedMinutes} min</span> : null}
                    {stale ? <span>Fallback idea</span> : null}
                  </div>
                  <div className="tag-row">{current.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                </GlassCard>
              </motion.div>
            ) : (
              <motion.div key="empty" className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="empty-orbit" />
                <p>Choose a mode, set the radius, then spin the city.</p>
              </motion.div>
            )}
          </AnimatePresence>
          {error ? <p className="error-text">{error}</p> : null}
        </div>

        <motion.button
          className="generate-button"
          onClick={generate}
          disabled={!hydrated || isGenerating}
          whileTap={reduce || isGenerating ? undefined : { scale: 0.985 }}
        >
          <span>{isGenerating ? 'Choosing…' : current ? 'Spin again' : 'Generate'}</span>
        </motion.button>

        <GlassCard className="history-card">
          <div className="row">
            <span>Recent</span>
            <div><button onClick={clearRecent}>Clear recent</button><button onClick={clearMemory}>Clear memory</button></div>
          </div>
          <div className="recent-row">{recent.length ? recent.map((item) => <span key={item.id}>{item.name}</span>) : <em>Nothing yet</em>}</div>
        </GlassCard>
      </section>
    </main>
  );
}

function SuspensePanel({ mode, phase, reduce }: { mode: AdventureMode; phase: string; reduce: boolean }) {
  const lines = suspenseLines[mode];
  const [index, setIndex] = useState(0);
  const text = useMemo(() => phase === 'locating' ? 'Finding your position…' : lines[index % lines.length], [index, lines, phase]);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => setIndex((value) => value + 1), 560);
    return () => window.clearInterval(timer);
  }, [reduce]);

  return (
    <motion.div
      className="suspense"
      initial={reduce ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.28 }}
    >
      <div className="roulette-field">
        <div className="roulette-ring" />
        <div className="roulette-core"><span>{mode === 'bars' ? '✦' : mode === 'nature' ? '◌' : mode === 'bus' ? '↗' : '◇'}</span></div>
        <div className="tick a" /><div className="tick b" /><div className="tick c" />
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={text}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
        >{text}</motion.p>
      </AnimatePresence>
      <small>{phase === 'locating' ? 'Location stays on this request only' : 'Filtering out recent adventures'}</small>
      <div className="suspense-dots"><i /><i /><i /></div>
    </motion.div>
  );
}
