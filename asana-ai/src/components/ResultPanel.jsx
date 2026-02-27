/**
 * components/ResultPanel.jsx
 *
 * Renders four analysis cards:
 *   1. Posture Status  (correct / wrong / idle)
 *   2. Detected Pose   name
 *   3. Confidence Bar
 *   4. Joint Feedback  list
 *
 * Props:
 *  result   – PredictionResult | null
 *  loading  – boolean (prediction in-flight)
 */

import LoadingSpinner from './LoadingSpinner'
import { IDLE_JOINTS } from '../constants'

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-sage/10 bg-charcoal-mid p-5">
      <p className="text-[0.65rem] font-semibold tracking-[0.12em] uppercase text-muted mb-4">
        {title}
      </p>
      {children}
    </div>
  )
}

function PostureStatus({ posture, loading }) {
  const map = {
    correct: {
      icon:  '✓',
      label: 'Correct',
      sub:   'Great form! Keep it up.',
      orbCls: 'bg-green-posture/10 shadow-[0_0_20px_rgba(90,158,111,0.2)]',
      textCls: 'text-green-posture',
    },
    wrong: {
      icon:  '✗',
      label: 'Needs Fix',
      sub:   'Check highlighted joints.',
      orbCls: 'bg-red-posture/10 shadow-[0_0_20px_rgba(212,104,90,0.2)]',
      textCls: 'text-red-posture',
    },
    idle: {
      icon:  '—',
      label: 'Waiting',
      sub:   'Start camera to detect.',
      orbCls: 'bg-white/5',
      textCls: 'text-muted',
    },
  }

  const cfg = map[posture] ?? map.idle

  if (loading) {
    return <LoadingSpinner label="Analysing pose…" />
  }

  return (
    <div className="flex items-center gap-4">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shrink-0 ${cfg.orbCls}`}>
        {cfg.icon}
      </div>
      <div>
        <p className={`font-display text-[1.5rem] font-extrabold leading-none ${cfg.textCls}`}>
          {cfg.label}
        </p>
        <p className="text-[0.78rem] text-muted mt-1">{cfg.sub}</p>
      </div>
    </div>
  )
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value ?? 0) * 100)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[0.78rem] text-muted">Model certainty</span>
        <span className="font-display font-bold text-sage-light">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sage-dark to-sage-light conf-fill-transition"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

const JOINT_STATUS = {
  ok:   { dot: 'bg-green-posture', label: 'text-off-white' },
  fix:  { dot: 'bg-red-posture',   label: 'text-off-white' },
  idle: { dot: 'bg-muted opacity-40', label: 'text-muted'  },
}

function JointRow({ name, status, feedback }) {
  const cfg = JOINT_STATUS[status] ?? JOINT_STATUS.idle
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.03]">
      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
      <span className={`text-[0.82rem] font-medium flex-1 ${cfg.label}`}>{name}</span>
      <span className="text-[0.73rem] text-muted italic">{feedback}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

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
          <p className="font-display text-[1.8rem] font-extrabold tracking-tight leading-none">
            {poseName}
          </p>
        ) : (
          <p className="text-muted text-[0.9rem]">No pose detected yet</p>
        )}
      </Card>

      {/* 3. Confidence */}
      <Card title="Confidence Score">
        <ConfidenceBar value={conf} />
      </Card>

      {/* 4. Joint feedback */}
      <Card title="Joint Feedback">
        <div className="flex flex-col gap-2">
          {joints.map((joint, i) => (
            <JointRow key={i} {...joint} />
          ))}
        </div>
      </Card>
    </div>
  )
}
