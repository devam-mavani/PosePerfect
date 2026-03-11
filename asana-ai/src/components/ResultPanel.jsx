/**
 * components/ResultPanel.jsx
 *
 * Bear-inspired result panel — warm white cards, serif headings, rust accent.
 */

import LoadingSpinner from './LoadingSpinner'
import { IDLE_JOINTS } from '../constants'

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-warm bg-paper-card shadow-card p-5 ${className}`}>
      <p className="text-[0.64rem] font-semibold tracking-[0.13em] uppercase text-ink-faint mb-4">
        {title}
      </p>
      {children}
    </div>
  )
}

function PostureStatus({ posture, loading }) {
  const map = {
    correct: {
      icon:     '✓',
      label:    'Correct',
      sub:      'Great form — keep it up!',
      bg:       'bg-green-50',
      border:   'border-green-200',
      iconCls:  'bg-green-100 text-status-ok',
      textCls:  'text-status-ok',
    },
    wrong: {
      icon:     '✗',
      label:    'Needs Fix',
      sub:      'Check the highlighted joints.',
      bg:       'bg-red-50',
      border:   'border-red-200',
      iconCls:  'bg-red-100 text-status-bad',
      textCls:  'text-status-bad',
    },
    idle: {
      icon:     '·',
      label:    'Waiting',
      sub:      'Start the camera to begin.',
      bg:       'bg-paper-mid',
      border:   'border-warm',
      iconCls:  'bg-paper-dark text-ink-faint',
      textCls:  'text-ink-muted',
    },
  }

  const cfg = map[posture] ?? map.idle

  if (loading) {
    return <LoadingSpinner label="Analysing pose…" />
  }

  return (
    <div className={`flex items-center gap-4 rounded-lg border px-4 py-3 ${cfg.bg} ${cfg.border}`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${cfg.iconCls}`}>
        {cfg.icon}
      </div>
      <div>
        <p className={`font-display text-[1.45rem] font-bold leading-none ${cfg.textCls}`}>
          {cfg.label}
        </p>
        <p className="text-[0.78rem] text-ink-muted mt-1">{cfg.sub}</p>
      </div>
    </div>
  )
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value ?? 0) * 100)
  const color = pct >= 75 ? 'bg-status-ok' : pct >= 50 ? 'bg-bear' : 'bg-status-bad'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[0.78rem] text-ink-muted">Model certainty</span>
        <span className={`font-display font-bold text-[1rem] ${
          pct >= 75 ? 'text-status-ok' : pct >= 50 ? 'text-bear' : 'text-status-bad'
        }`}>
          {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-paper-mid overflow-hidden">
        <div
          className={`h-full rounded-full conf-fill-transition ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function JointRow({ name, status, feedback }) {
  const cfg = {
    ok:   { dot: 'bg-status-ok',  text: 'text-ink',       fb: 'text-status-ok' },
    fix:  { dot: 'bg-status-bad', text: 'text-ink',       fb: 'text-status-bad' },
    idle: { dot: 'bg-warm',       text: 'text-ink-faint', fb: 'text-ink-faint' },
  }[status] ?? { dot: 'bg-warm', text: 'text-ink-faint', fb: 'text-ink-faint' }

  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-paper border border-warm/60">
      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
      <span className={`text-[0.82rem] font-medium flex-1 ${cfg.text}`}>{name}</span>
      <span className={`text-[0.73rem] italic ${cfg.fb}`}>{feedback}</span>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ResultPanel({ result, loading }) {
  const posture  = result?.posture_status ?? 'idle'
  const poseName = result?.pose            ?? null
  const conf     = result?.confidence      ?? 0
  const joints   = result?.joints          ?? IDLE_JOINTS

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Posture status */}
      <Card title="Posture Status">
        <PostureStatus posture={posture} loading={loading} />
      </Card>

      {/* 2. Detected pose */}
      <Card title="Detected Pose">
        {poseName ? (
          <p className="font-display text-[1.9rem] font-bold tracking-tight text-ink leading-none">
            {poseName}
          </p>
        ) : (
          <p className="text-ink-muted text-[0.9rem] italic">No pose detected yet</p>
        )}
      </Card>

      {/* 3. Confidence */}
      <Card title="Confidence Score">
        <ConfidenceBar value={conf} />
      </Card>

      {/* 4. Joint feedback */}
      <Card title="Joint Feedback">
        <div className="flex flex-col gap-1.5">
          {joints.map((joint, i) => (
            <JointRow key={i} {...joint} />
          ))}
        </div>
      </Card>
    </div>
  )
}
