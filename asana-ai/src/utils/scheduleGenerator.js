/**
 * utils/scheduleGenerator.js  (fixed)
 *
 * FIX: urdhva_dhanurasana had `'flexibility'` in its goals array, which is not
 *      a valid goal. The generator's pool logic puts non-matching poses at the
 *      back, so Wheel Pose was always deprioritized regardless of the user's
 *      actual goal. Replaced with 'balance' which is the closest valid match.
 *
 * Valid goals: 'fitness' | 'balance' | 'relax' | 'weight_loss' | 'breathing'
 *
 * ── HOW TO ADD A NEW POSE ──────────────────────────────────────────────────
 * 1. The slug key MUST match the folder name you used in raw_dataset/
 *    and the class label that ends up in train_angle.csv (backend).
 *
 * 2. Copy one of the existing entries and fill in:
 *      name        — display name shown in the UI
 *      intensity   — 'light' | 'moderate' | 'intense'
 *      goals       — one or more of: 'fitness', 'balance', 'relax',
 *                    'weight_loss', 'breathing'
 *      avoid       — conditions to skip this pose for:
 *                    'back_pain', 'knee_issues', 'shoulder',
 *                    'pregnancy', 'hypertension'
 *
 * Example — add Cobra Pose:
 *   bhujangasana: {
 *     name: 'Cobra Pose',
 *     intensity: 'light',
 *     goals: ['relax', 'breathing', 'fitness'],
 *     avoid: ['back_pain'],
 *   },
 * ──────────────────────────────────────────────────────────────────────────
 */

const ASANA_LIBRARY = {
  // ── Existing 5 backend-trained poses ──────────────────────────────────────
  downdog: {
    name: 'Downward Dog',
    intensity: 'moderate',
    goals: ['fitness', 'relax', 'breathing'],
    avoid: ['shoulder'],
  },
  goddess: {
    name: 'Goddess Pose',
    intensity: 'moderate',
    goals: ['fitness', 'balance', 'weight_loss'],
    avoid: ['knee_issues'],
  },
  plank: {
    name: 'Plank',
    intensity: 'intense',
    goals: ['fitness', 'weight_loss'],
    avoid: ['back_pain', 'pregnancy'],
  },
  tree: {
    name: 'Tree Pose',
    intensity: 'light',
    goals: ['balance', 'relax'],
    avoid: [],
  },
  warrior2: {
    name: 'Warrior II',
    intensity: 'moderate',
    goals: ['fitness', 'balance', 'weight_loss'],
    avoid: ['knee_issues', 'hypertension'],
  },

  // ── Extended pose library ─────────────────────────────────────────────────
  urdhva_dhanurasana: {
    name: 'Urdhva Dhanurasana (Wheel Pose)',
    intensity: 'intense',
    // FIX: was ['fitness', 'flexibility', 'balance'] — 'flexibility' is not a
    // valid goal so the pose was always deprioritized. Using 'balance' instead.
    goals: ['fitness', 'balance'],
    avoid: ['back_pain', 'shoulder', 'hypertension'],
  },
  ardha_pincha_mayurasana: {
    name: 'Ardha Pincha Mayurasana',
    intensity: 'moderate',
    goals: ['fitness', 'balance'],
    avoid: ['shoulder', 'hypertension'],
  },
  anjaneyasana: {
    name: 'Anjaneyasana',
    intensity: 'moderate',
    goals: ['fitness', 'balance'],
    avoid: ['knee_issues'],
  },
  dandasana: {
    name: 'Dandasana',
    intensity: 'light',
    goals: ['relax'],
    avoid: [],
  },
  halasana: {
    name: 'Halasana',
    intensity: 'intense',
    goals: ['relax', 'fitness'],
    avoid: ['back_pain', 'hypertension'],
  },
  utkatasana: {
    name: 'Utkatasana',
    intensity: 'moderate',
    goals: ['fitness', 'weight_loss'],
    avoid: ['knee_issues'],
  },
  vajrasana: {
    name: 'Vajrasana',
    intensity: 'light',
    goals: ['relax', 'breathing'],
    avoid: [],
  },
  vasishthasana: {
    name: 'Vasisthasana',
    intensity: 'intense',
    goals: ['fitness', 'balance'],
    avoid: ['shoulder'],
  },
  bitilasana: {
    name: 'Bitilasana',
    intensity: 'light',
    goals: ['relax', 'breathing'],
    avoid: ['back_pain'],
  },
  warrior_three: {
    name: 'Warrior III',
    intensity: 'moderate',
    goals: ['balance', 'fitness'],
    avoid: ['knee_issues'],
  },

  nataraja_asana: {
  name: 'Nataraja Asana',
  intensity: 'moderate',
  goals: ['balance', 'fitness'],
  avoid: ['knee_issues'],
},

sarvangasana: {
  name: 'Sarvangasana',
  intensity: 'intense',
  goals: ['relax', 'fitness'],
  avoid: ['hypertension', 'neck'],
},

ustrasana: {
  name: 'Ustrasana',
  intensity: 'moderate',
  goals: ['fitness', 'relax'],
  avoid: ['back_pain'],
},

uttanasana: {
  name: 'Uttanasana',
  intensity: 'light',
  goals: ['relax', 'breathing'],
  avoid: ['back_pain'],
},

baddha_konasana : {
  name: "Baddha Konasana",
  difficulty: "beginner",
  duration: 30,
  category: "seated",
},

  // ── ADD NEW POSES BELOW THIS LINE ─────────────────────────────────────────
  // bhujangasana: {
  //   name: 'Cobra Pose',
  //   intensity: 'light',
  //   goals: ['relax', 'breathing', 'fitness'],
  //   avoid: ['back_pain'],
  // },
  // virabhadrasana: {
  //   name: 'Warrior I',
  //   intensity: 'moderate',
  //   goals: ['fitness', 'balance'],
  //   avoid: ['knee_issues', 'hypertension'],
  // },
}

export const LEVEL_DURATION    = { beginner: 35, intermediate: 60, advanced: 180 }
export const BREAK_DURATION    = 10
export const ASANA_LIBRARY_MAP = ASANA_LIBRARY
export { ASANA_LIBRARY }

const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export function generateWeeklySchedule(goal, condition, level, totalMins) {
  const poseDuration = LEVEL_DURATION[level] || 35
  const totalSeconds = totalMins * 60

  const available = Object.entries(ASANA_LIBRARY)
    .filter(([, info]) => !info.avoid.includes(condition))
    .map(([slug, info]) => ({ slug, ...info }))

  const pool = [
    ...available.filter(a => a.goals.includes(goal)),
    ...available.filter(a => !a.goals.includes(goal)),
  ]

  function buildSession(pool, maxSecs) {
    const session = []; let elapsed = 0
    for (const a of pool) {
      const cost = session.length === 0 ? poseDuration : poseDuration + BREAK_DURATION
      if (elapsed + cost > maxSecs && session.length > 0) break
      session.push(a.slug); elapsed += cost
    }
    return session
  }

  function shuffled(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  return DAY_NAMES.map((dayName, day) => {
    if (day === 6) return { day, dayName, isRest: true, asanas: [], totalSecs: 0 }
    const dayPool   = day === 5 ? shuffled(pool.filter(a => a.intensity === 'light')) : shuffled(pool)
    const asanas    = buildSession(dayPool, totalSeconds)
    const totalSecs = asanas.length * poseDuration + Math.max(0, asanas.length - 1) * BREAK_DURATION
    return { day, dayName, isRest: false, asanas, totalSecs }
  })
}

export function getAsanaDisplayName(slug) {
  return ASANA_LIBRARY[slug]?.name ?? slug
}
