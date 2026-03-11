# 🧘 PosePerfect — Real-Time Yoga Pose Correction

PosePerfect is a full-stack AI application that detects and corrects yoga poses in real time using your webcam. It combines a MediaPipe-powered pose estimation pipeline with a trained SVM classifier to identify poses and provide per-joint feedback so you can refine your form instantly.

---

## ✨ Features

- **Live Pose Detection** — Streams webcam frames to the backend and classifies your pose in real time
- **Joint-Level Feedback** — Compares each of 12 joints against reference teacher angles and flags corrections
- **5 Supported Poses** — Downward Dog, Goddess Pose, Plank, Tree Pose, Warrior II
- **Confidence Scoring** — Only surfaces predictions above a 50% confidence threshold
- **Clean React UI** — Minimal, responsive interface built with Tailwind CSS

---

## 🏗️ Tech Stack

| Layer    | Technology                                            |
| -------- | ----------------------------------------------------- |
| Frontend | React 18, Vite, Tailwind CSS, React Router            |
| Backend  | FastAPI, Uvicorn                                      |
| ML / CV  | MediaPipe Pose, scikit-learn SVM (RBF kernel), OpenCV |
| Data     | NumPy, Pandas                                         |

--

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+

### 1. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

### 2. Frontend Setup

```bash
cd asana-ai

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🔌 API Reference

### `GET /health`

Returns a liveness check confirming the server is running.

### `POST /predict`

Accepts a JPEG image frame and returns pose classification with joint feedback.

**Request:** `multipart/form-data` with a `file` field containing a JPEG image.

**Response:**

```json
{
  "pose": "Warrior II",
  "confidence": 0.87,
  "posture_status": "correct",
  "joints": [
    {
      "name": "Left Knee",
      "status": "fix",
      "feedback": "Adjust Left Knee by -15°"
    },
    { "name": "Right Shoulder", "status": "ok", "feedback": "Good" }
  ]
}
```

---

## 🧠 How It Works

1. The webcam feed in the browser captures frames and sends them to the `/predict` endpoint.
2. MediaPipe extracts 33 body landmarks from the frame.
3. Joint angles are computed for 12 key joints (wrists, elbows, shoulders, hips, knees, ankles).
4. A pre-trained SVM classifier (RBF kernel) predicts the pose from these angles.
5. Predicted angles are compared against teacher reference angles. Joints exceeding a **30° correction threshold** are flagged with directional feedback.
6. Results are returned to the React frontend and displayed in the results panel.

---

## 🤸 Supported Poses

| Pose         | Label      |
| ------------ | ---------- |
| Downward Dog | `downdog`  |
| Goddess Pose | `goddess`  |
| Plank        | `plank`    |
| Tree Pose    | `tree`     |
| Warrior II   | `warrior2` |

---

## 🛠️ Development

```bash
# Lint the frontend
cd asana-ai && npm run lint

# Build for production
npm run build
```

---

## 📄 License

This project is open source. Feel free to use, modify, and distribute it.
