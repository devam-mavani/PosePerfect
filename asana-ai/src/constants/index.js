/** Default joint list shown when no prediction has been received yet. */
export const IDLE_JOINTS = [
  { name: 'Left Shoulder',  status: 'idle', feedback: '—' },
  { name: 'Right Shoulder', status: 'idle', feedback: '—' },
  { name: 'Left Hip',       status: 'idle', feedback: '—' },
  { name: 'Right Hip',      status: 'idle', feedback: '—' },
  { name: 'Left Knee',      status: 'idle', feedback: '—' },
  { name: 'Right Knee',     status: 'idle', feedback: '—' },
]

/** Supported yoga poses (display list for About page). */
export const SUPPORTED_POSES = [
  'Warrior I (Virabhadrasana I)',
  'Warrior II (Virabhadrasana II)',
  'Warrior III (Virabhadrasana III)',
  'Tree Pose (Vrksasana)',
  'Downward-Facing Dog (Adho Mukha Svanasana)',
  'Chair Pose (Utkatasana)',
  'Cobra Pose (Bhujangasana)',
  'Triangle Pose (Trikonasana)',
  'Mountain Pose (Tadasana)',
  'Child Pose (Balasana)',
]

/** Technology stack labels for About page. */
export const TECH_STACK = [
  'React 18',
  'Vite',
  'React Router v6',
  'Tailwind CSS',
  'Axios',
  'FastAPI',
  'MediaPipe',
  'TensorFlow / PyTorch',
  'OpenCV',
  'Python 3.11',
]

/** Team members for About page. */
export const TEAM = [
  { avatar: '🧑‍💻', name: 'Arjun Mehta',  role: 'ML Engineer' },
  { avatar: '👩‍🎨', name: 'Priya Nair',   role: 'UI / UX Designer' },
  { avatar: '👨‍🔬', name: 'Dev Sharma',   role: 'Computer Vision' },
]

/** API base URL — override via VITE_API_URL env variable. */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/** Interval (ms) between webcam frame captures during live detection. */
export const CAPTURE_INTERVAL_MS = 1500
