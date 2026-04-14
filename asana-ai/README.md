# AsanaAI — Yoga Pose Detection System

A modern, production-ready React frontend for real-time yoga pose detection using computer vision.

---

## ✨ Features

- 📷 **Live webcam feed** with automatic frame capture
- 🧘 **Pose classification** with confidence scoring
- 🦴 **Joint-level feedback** — green/red indicators per joint
- ⚡ **Low-latency** detection loop (configurable interval)
- 🔒 **Privacy-first** — video stays on your device
- 🎨 **Fitness-themed UI** — dark, clean, and responsive

---

## 🗂 Project Structure

```
asana-ai/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Navbar.jsx           # Fixed top navigation (React Router NavLink)
│   │   ├── WebcamFeed.jsx       # Camera UI & start/stop controls
│   │   ├── ResultPanel.jsx      # Prediction result cards
│   │   └── LoadingSpinner.jsx   # Reusable spinner
│   ├── pages/
│   │   ├── Home.jsx             # Landing page with feature grid
│   │   ├── LiveDetection.jsx    # Main detection view
│   │   └── About.jsx            # Project info, API contract, team
│   ├── hooks/
│   │   └── useWebcamDetection.js  # Camera access + prediction loop
│   ├── services/
│   │   └── api.js               # Axios client, predictPose(), checkHealth()
│   ├── constants/
│   │   └── index.js             # Poses, team, config values
│   ├── styles/
│   │   └── index.css            # Tailwind base + CSS custom properties
│   ├── App.jsx                  # Root layout (Navbar + Outlet)
│   └── main.jsx                 # Router config + ReactDOM.createRoot
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
└── package.json
```

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit VITE_API_URL if your backend runs on a different port
```

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for production

```bash
npm run build
npm run preview   # preview the production build locally
```

---

## 🔌 Backend API

The frontend expects a backend running at `http://localhost:8000` (configurable via `VITE_API_URL`).

### `POST /predict`

**Request:** `multipart/form-data` with a `file` field containing a JPEG image blob.

**Response:**

```json
{
  "pose":           "Warrior II",
  "confidence":     0.94,
  "posture_status": "correct",
  "joints": [
    { "name": "Left Shoulder",  "status": "ok",  "feedback": "Aligned" },
    { "name": "Right Hip",      "status": "fix", "feedback": "Rotate outward" }
  ]
}
```

| Field            | Type                    | Description                          |
|------------------|-------------------------|--------------------------------------|
| `pose`           | `string`                | Classified yoga pose name            |
| `confidence`     | `number` (0–1)          | Model certainty                      |
| `posture_status` | `"correct"` \| `"wrong"` | Overall posture verdict             |
| `joints`         | `Array<JointFeedback>`  | Per-joint analysis                   |

### `GET /health` *(optional)*

Returns `200 OK` if the backend is reachable. Used by `checkHealth()` in `services/api.js`.

---

## 🛠 Tech Stack

| Layer       | Technology                         |
|-------------|------------------------------------|
| Framework   | React 18 + Vite                    |
| Routing     | React Router v6                    |
| Styling     | Tailwind CSS                       |
| HTTP client | Axios                              |
| Backend     | FastAPI + MediaPipe / PyTorch      |
| Fonts       | Syne (display) + DM Sans (body)    |

---

## 📄 License

MIT
