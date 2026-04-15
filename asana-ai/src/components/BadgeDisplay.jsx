/**
 * components/BadgeDisplay.jsx
 *
 * Renders mastery badges for ALL poses in ASANA_LIBRARY (not a hand-picked list).
 * Supports two display modes:
 *  - "grid"  → full card grid on Dashboard / Profile page
 *  - "mini"  → compact horizontal pill strip on LiveDetection / SessionPlayer
 *
 * Props:
 *  mastery  – { [pose_key]: count } from Firestore user doc
 *  mode     – "grid" | "mini" (default "grid")
 */

import { getMasteryTier } from '../hooks/useSessionStats'
import { ASANA_LIBRARY }  from '../utils/scheduleGenerator'

// Derive the full pose list dynamically — always in sync with the library
const ALL_POSES = Object.entries(ASANA_LIBRARY).map(([key, info]) => ({
  key,
  label: info.name,
}))

// ── Individual Badge (grid mode) ──────────────────────────────────────────────
function Badge({ label, tier, count }) {
  return (
    <div className="bg-white border border-edge rounded-2xl p-5 shadow-card card-hover text-center
                    hover:border-brand-muted transition-all duration-300 group">
      {/* Badge circle */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-[1.8rem]
                   group-hover:scale-110 transition-transform duration-300"
        style={{ background: tier.color + '18', border: `2px solid ${tier.color}40` }}
      >
        {tier.emoji}
      </div>

      <p className="font-display font-bold text-[0.88rem] text-ink mb-0.5 leading-tight">{label}</p>

      {/* Tier label */}
      <p
        className="text-[0.7rem] font-bold tracking-wide uppercase mb-3"
        style={{ color: tier.color }}
      >
        {tier.label}
      </p>

      {/* Progress to next tier */}
      <NextTierProgress count={count} color={tier.color} />
    </div>
  )
}

// ── Mini pill (strip mode) ───────────────────────────────────────────────────
function MiniBadge({ label, tier, count }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[0.72rem] font-semibold
                 transition-all duration-200 hover:scale-105"
      style={{ borderColor: tier.color + '40', background: tier.color + '12', color: tier.color }}
      title={`${label} — ${tier.label} (${count} high-accuracy sessions)`}
    >
      <span>{tier.emoji}</span>
      {/* Show first word only in mini mode */}
      <span>{label.split(' ')[0]}</span>
    </div>
  )
}

// ── Progress bar toward next tier ────────────────────────────────────────────
function NextTierProgress({ count, color }) {
  const tiers    = [0, 3, 10, 25, 50]
  const nextTier = tiers.find((t) => t > count)

  if (!nextTier) {
    return <p className="text-[0.7rem] text-ink-faint">Maximum tier reached 🏆</p>
  }

  const prevTier = tiers.filter((t) => t <= count).pop() || 0
  const progress = (count - prevTier) / (nextTier - prevTier)

  return (
    <div>
      <div className="h-1.5 bg-surface-mid rounded-full overflow-hidden mb-1">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${progress * 100}%`, background: color }}
        />
      </div>
      <p className="text-[0.68rem] text-ink-faint">
        {count}/{nextTier} sessions to next tier
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BadgeDisplay({ mastery = {}, mode = 'grid' }) {
  if (mode === 'mini') {
    return (
      <div className="flex flex-wrap gap-2">
        {ALL_POSES.map(({ key, label }) => {
          const count = mastery[key] || 0
          const tier  = getMasteryTier(count)
          return <MiniBadge key={key} label={label} tier={tier} count={count} />
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {ALL_POSES.map(({ key, label }) => {
        const count = mastery[key] || 0
        const tier  = getMasteryTier(count)
        return <Badge key={key} label={label} tier={tier} count={count} />
      })}
    </div>
  )
}
