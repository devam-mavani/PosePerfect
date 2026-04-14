"""
AsanaAI – FastAPI Backend  (v2 + Notifications)
================================================
Added in this version:
  POST /notify/session     — send scorecard email + Telegram after session
  POST /notify/skip        — send Duolingo-style reminder for skipped session
  Daily scheduler          — 9 PM reminder via APScheduler

All existing endpoints unchanged.
"""

import csv
import logging
from collections import deque, Counter
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional

import cv2
import mediapipe as mp
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
log = logging.getLogger("asana-ai")

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent
TRAIN_CSV   = BASE_DIR / "train_angle.csv"
TEACHER_CSV = BASE_DIR / "teacher_yoga" / "angle_teacher_yoga.csv"

# ── MediaPipe ─────────────────────────────────────────────────────────────────
mp_pose    = mp.solutions.pose
pose_model = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    smooth_landmarks=True,
    min_detection_confidence=0.55,
    min_tracking_confidence=0.55,
)

# ══════════════════════════════════════════════════════════════════════════════
# ▼▼▼  ADD NEW POSES HERE  ▼▼▼
# ══════════════════════════════════════════════════════════════════════════════
DISPLAY_POSE_NAMES: dict[str, str] = {
    "downdog":  "Downward Dog",
    "goddess":  "Goddess Pose",
    "plank":    "Plank",
    "tree":     "Tree Pose",
    "warrior2": "Warrior II",
    "urdhva_dhanurasana": "Urdhva Dhanurasana",
    "ardha_pincha_mayurasana": "Ardha Pincha Mayurasana",
    "anjaneyasana": "Anjaneyasana",
    "dandasana": "Dandasana",
    "halasana": "Halasana",
    "utkatasana": "Utkatasana",
    "vajrasana": "Vajrasana",
    "vasishthasana": "Vasisthasana",
    "bitilasana": "Bitilasana",
    "warrior_three": "Warrior III",
    "nataraja_asana": "Nataraja Asana",
    "sarvangasana": "Sarvangasana",
    "ustrasana": "Ustrasana",
    "uttanasana": "Uttanasana",
}

POSE_DESCRIPTIONS: dict[str, str] = {
    "downdog":  "An inversion that stretches hamstrings, calves, and spine.",
    "goddess":  "A wide-legged squat strengthening inner thighs and glutes.",
    "plank":    "Core-stabilising isometric hold in push-up position.",
    "tree":     "Single-leg balance pose improving focus and stability.",
    "warrior2": "Standing lunge building strength and opening the hips.",
    "urdhva_dhanurasana": "A deep backbend (Wheel Pose) that strengthens the spine, arms, and legs while opening the chest.",
    "ardha_pincha_mayurasana": "Dolphin Pose that strengthens shoulders and core while improving flexibility and stability.",
    "anjaneyasana": "Low lunge pose that stretches hips and strengthens legs.",
    "dandasana": "Staff pose that improves posture and strengthens core.",
    "halasana": "Plow pose that stretches spine and improves flexibility.",
    "utkatasana": "Chair pose that strengthens thighs and core.",
    "vajrasana": "Kneeling pose aiding digestion and relaxation.",
    "vasishthasana": "Side plank pose that builds arm and core strength.",
    "bitilasana": "Cow pose that improves spinal flexibility and posture.",
    "warrior_three": "Balancing pose that strengthens legs and improves stability.",
    "nataraja_asana": "Dancer pose that improves balance, flexibility, and focus.",
    "sarvangasana": "Shoulder stand that improves circulation and strengthens the body.",
    "ustrasana": "Camel pose that stretches chest and strengthens the back.",
    "uttanasana": "Standing forward bend that stretches hamstrings and calms the mind.",
}

CORRECTION_THRESHOLDS: dict[str, dict[str, float]] = {
    "downdog":  {"default": 28, "Left Ankle": 35,  "Right Ankle": 35},
    "goddess":  {"default": 28, "Left Hip":   32,  "Right Hip":   32},
    "plank":    {"default": 22, "Left Shoulder": 25, "Right Shoulder": 25},
    "tree":     {"default": 30, "Left Knee":  40,  "Right Knee":   40},
    "warrior2": {"default": 28, "Left Hip":   32,  "Right Hip":    32},
    "urdhva_dhanurasana": {
    "default": 30,
    "Left Shoulder": 35,
    "Right Shoulder": 35,
    "Left Hip": 35,
    "Right Hip": 35
},
    "ardha_pincha_mayurasana": {
    "default": 28,
    "Left Shoulder": 35,
    "Right Shoulder": 35,
    "Left Elbow": 30,
    "Right Elbow": 30,
    "Left Hip": 30,
    "Right Hip": 30
},
    "anjaneyasana": {
    "default": 28,
    "Left Hip": 35, "Right Hip": 35,
    "Left Knee": 35, "Right Knee": 35
},
"dandasana": {
    "default": 20,
    "Left Knee": 25, "Right Knee": 25,
    "Left Hip": 25, "Right Hip": 25
},
"halasana": {
    "default": 30,
    "Left Hip": 35, "Right Hip": 35,
    "Left Shoulder": 35, "Right Shoulder": 35
},
"utkatasana": {
    "default": 28,
    "Left Knee": 35, "Right Knee": 35,
    "Left Hip": 30, "Right Hip": 30
},
"vajrasana": {
    "default": 18,
    "Left Knee": 20, "Right Knee": 20
},
"vasishthasana": {
    "default": 30,
    "Left Shoulder": 35, "Right Shoulder": 35,
    "Left Hip": 35, "Right Hip": 35
},
"bitilasana": {
    "default": 22,
    "Left Shoulder": 25, "Right Shoulder": 25,
    "Left Hip": 25, "Right Hip": 25
},
"warrior_three": {
    "default": 30,
    "Left Hip": 35, "Right Hip": 35,
    "Left Knee": 30, "Right Knee": 30
},
"nataraja_asana": {
    "default": 30,
    "Left Knee": 35, "Right Knee": 35,
    "Left Hip": 35, "Right Hip": 35,
    "Left Shoulder": 35, "Right Shoulder": 35
},
"sarvangasana": {
    "default": 30,
    "Left Shoulder": 35, "Right Shoulder": 35,
    "Left Hip": 30, "Right Hip": 30
},
"ustrasana": {
    "default": 30,
    "Left Shoulder": 35, "Right Shoulder": 35,
    "Left Hip": 35, "Right Hip": 35
},
"uttanasana": {
    "default": 25,
    "Left Knee": 30, "Right Knee": 30,
    "Left Hip": 30, "Right Hip": 30
},
}
# ══════════════════════════════════════════════════════════════════════════════

JOINT_NAMES = [
    "Left Wrist","Right Wrist","Left Elbow","Right Elbow",
    "Left Shoulder","Right Shoulder","Left Knee","Right Knee",
    "Left Ankle","Right Ankle","Left Hip","Right Hip",
]
SMOOTH_WINDOW        = 7
CONFIDENCE_THRESHOLD = 0.45
DEFAULT_THRESHOLD    = 30


# ── Pydantic models ───────────────────────────────────────────────────────────
class JointFeedback(BaseModel):
    name: str; status: str; feedback: str

class PredictionResult(BaseModel):
    pose: str; confidence: float; posture_status: str
    joints: List[JointFeedback]

class AsanaInfo(BaseModel):
    slug: str; name: str; description: str

class MetricsResult(BaseModel):
    model: str; cv_folds: int; mean_accuracy: float
    std_accuracy: float; per_class: dict

class NotifySessionRequest(BaseModel):
    userEmail:       str
    telegramChatId:  Optional[str] = None
    userName:        str
    completedAsanas: List[List[str]]   # [[slug, displayName], ...]
    skippedAsanas:   List[List[str]]   # [[slug, displayName], ...]
    accuracies:      dict
    avgAccuracy:     int
    durationSec:     int
    streak:          int
    dayName:         str
    status:          str               # "completed" | "ended"
    date:            str

class NotifySkipRequest(BaseModel):
    userEmail:          str
    telegramChatId:     Optional[str] = None
    userName:           str
    asanaCount:         int
    estimatedMinutes:   int


# ── Feature helpers ───────────────────────────────────────────────────────────
def _angle(lm1, lm2, lm3) -> float:
    a = np.degrees(
        np.arctan2(lm3.y - lm2.y, lm3.x - lm2.x)
        - np.arctan2(lm1.y - lm2.y, lm1.x - lm2.x)
    )
    return float(a + 360 if a < 0 else a)

def extract_angles(lm) -> List[float]:
    P = mp_pose.PoseLandmark
    return [
        _angle(lm[P.LEFT_ELBOW.value],    lm[P.LEFT_WRIST.value],    lm[P.LEFT_INDEX.value]),
        _angle(lm[P.RIGHT_ELBOW.value],   lm[P.RIGHT_WRIST.value],   lm[P.RIGHT_INDEX.value]),
        _angle(lm[P.LEFT_SHOULDER.value], lm[P.LEFT_ELBOW.value],    lm[P.LEFT_WRIST.value]),
        _angle(lm[P.RIGHT_SHOULDER.value],lm[P.RIGHT_ELBOW.value],   lm[P.RIGHT_WRIST.value]),
        _angle(lm[P.LEFT_ELBOW.value],    lm[P.LEFT_SHOULDER.value], lm[P.LEFT_HIP.value]),
        _angle(lm[P.RIGHT_HIP.value],     lm[P.RIGHT_SHOULDER.value],lm[P.RIGHT_ELBOW.value]),
        _angle(lm[P.LEFT_HIP.value],      lm[P.LEFT_KNEE.value],     lm[P.LEFT_ANKLE.value]),
        _angle(lm[P.RIGHT_HIP.value],     lm[P.RIGHT_KNEE.value],    lm[P.RIGHT_ANKLE.value]),
        _angle(lm[P.LEFT_HIP.value],      lm[P.LEFT_ANKLE.value],    lm[P.LEFT_FOOT_INDEX.value]),
        _angle(lm[P.RIGHT_HIP.value],     lm[P.RIGHT_ANKLE.value],   lm[P.RIGHT_FOOT_INDEX.value]),
        _angle(lm[P.LEFT_KNEE.value],     lm[P.LEFT_HIP.value],      lm[P.RIGHT_HIP.value]),
        _angle(lm[P.LEFT_HIP.value],      lm[P.RIGHT_HIP.value],     lm[P.RIGHT_KNEE.value]),
    ]

_ANGLE_SWAP = [(0,1),(2,3),(4,5),(6,7),(8,9),(10,11)]
def _mirror(row):
    r = row.copy()
    for a, b in _ANGLE_SWAP: r[a], r[b] = r[b], r[a]
    return r

def load_training_data():
    if not TRAIN_CSV.exists():
        raise FileNotFoundError(f"train_angle.csv not found at {TRAIN_CSV}")
    df    = pd.read_csv(TRAIN_CSV)
    X     = df.iloc[:, :-1].values.astype(float)
    y     = df["target"].values
    X_aug = np.vstack([X, np.array([_mirror(r) for r in X])])
    y_aug = np.concatenate([y, y])
    log.info("Dataset: %d samples (with mirror augmentation)", len(X_aug))
    return X_aug, y_aug

def build_ensemble():
    svm = SVC(kernel="rbf", C=10, gamma="scale", decision_function_shape="ovo",
              probability=True, random_state=42)
    rf  = RandomForestClassifier(n_estimators=300, random_state=42, n_jobs=-1)
    knn = KNeighborsClassifier(n_neighbors=7, weights="distance")
    clf = VotingClassifier([("svm", svm), ("rf", rf), ("knn", knn)], voting="soft")
    return Pipeline([("scaler", StandardScaler()), ("ensemble", clf)])

def train_model():
    X, y = load_training_data()
    pipe = build_ensemble()
    pipe.fit(X, y)
    log.info("Ensemble trained. Classes: %s", list(pipe["ensemble"].classes_))
    return pipe, X, y

def load_teacher_angles():
    if not TEACHER_CSV.exists():
        log.warning("Teacher CSV missing — joint feedback disabled.")
        return {}
    rows: dict = {}
    with open(TEACHER_CSV, newline="") as f:
        for row in csv.DictReader(f):
            n = row["name_yoga"]
            rows.setdefault(n, []).append([
                float(row["left_wrist_angle"]),    float(row["right_wrist_angle"]),
                float(row["left_elbow_angle"]),    float(row["right_elbow_angle"]),
                float(row["left_shoulder_angle"]), float(row["right_shoulder_angle"]),
                float(row["left_knee_angle"]),     float(row["right_knee_angle"]),
                float(row["left_ankle_angle"]),    float(row["right_ankle_angle"]),
                float(row["left_hip_angle"]),      float(row["right_hip_angle"]),
            ])
    return {n: np.mean(v, axis=0) for n, v in rows.items()}


# ── Boot ──────────────────────────────────────────────────────────────────────
model, X_train, y_train = train_model()
teacher_angles          = load_teacher_angles()
_smooth_buf: deque      = deque(maxlen=SMOOTH_WINDOW)
_cv_cache: Optional[MetricsResult] = None

def get_classes(): return list(model["ensemble"].classes_)


# ── Scheduler lifespan ────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from scheduler import create_scheduler
        scheduler = create_scheduler()
        scheduler.start()
        log.info("Daily reminder scheduler started.")
        yield
        scheduler.shutdown()
    except Exception as e:
        log.warning("Scheduler not started: %s", e)
        yield


# ── FastAPI ───────────────────────────────────────────────────────────────────
app = FastAPI(title="AsanaAI Backend", version="2.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])


# ── Joint feedback ────────────────────────────────────────────────────────────
def build_joint_feedback(user_angles, teacher, pose_slug):
    thresholds = CORRECTION_THRESHOLDS.get(pose_slug, {})
    joints, correct = [], 0
    for name, u, t in zip(JOINT_NAMES, user_angles, teacher):
        thresh = thresholds.get(name, thresholds.get("default", DEFAULT_THRESHOLD))
        diff   = u - t
        if abs(diff) <= thresh:
            joints.append(JointFeedback(name=name, status="ok",  feedback="Looking good!"))
            correct += 1
        elif diff < 0:
            joints.append(JointFeedback(name=name, status="fix",
                                        feedback=f"Increase angle by ~{abs(diff):.0f}°"))
        else:
            joints.append(JointFeedback(name=name, status="fix",
                                        feedback=f"Reduce angle by ~{abs(diff):.0f}°"))
    return joints, correct


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "model": "Ensemble (SVM + RF + KNN)",
            "classes": get_classes(), "smooth_window": SMOOTH_WINDOW}

@app.get("/asanas", response_model=List[AsanaInfo])
def list_asanas():
    return [AsanaInfo(slug=s,
                      name=DISPLAY_POSE_NAMES.get(s, s.replace("_"," ").title()),
                      description=POSE_DESCRIPTIONS.get(s, ""))
            for s in get_classes()]

@app.get("/metrics", response_model=MetricsResult)
def get_metrics():
    global _cv_cache
    if _cv_cache: return _cv_cache
    cv     = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="accuracy", n_jobs=-1)
    from sklearn.model_selection import cross_val_predict
    from sklearn.metrics import classification_report
    y_pred  = cross_val_predict(model, X_train, y_train, cv=cv)
    report  = classification_report(y_train, y_pred, output_dict=True)
    per_cls = {k: round(v["f1-score"], 4) for k, v in report.items()
               if k not in ("accuracy","macro avg","weighted avg")}
    _cv_cache = MetricsResult(model="Ensemble (SVM+RF+KNN)", cv_folds=5,
                               mean_accuracy=round(float(scores.mean()),4),
                               std_accuracy=round(float(scores.std()),4),
                               per_class=per_cls)
    return _cv_cache





@app.post("/notify/session")
async def notify_session(req: NotifySessionRequest):
    """
    Called by frontend after session ends (completed or ended early).
    Sends email scorecard + Telegram message.
    """
    from notifications import send_session_email, send_session_telegram
    data = req.model_dump()
    results = {}

    if req.userEmail:
        results["email"] = send_session_email(req.userEmail, data)
    if req.telegramChatId:
        results["telegram"] = await send_session_telegram(req.telegramChatId, data)

    return {"sent": results}


@app.post("/notify/skip")
async def notify_skip(req: NotifySkipRequest):
    """
    Called by frontend when user explicitly skips today's session.
    Sends Duolingo-style reminder.
    """
    from notifications import send_skip_reminder_email, send_skip_reminder_telegram
    data = req.model_dump()
    results = {}

    if req.userEmail:
        results["email"] = send_skip_reminder_email(req.userEmail, req.userName, data)
    if req.telegramChatId:
        results["telegram"] = await send_skip_reminder_telegram(
            req.telegramChatId, req.userName, data)

    return {"sent": results}


# ─────────────────────────────────────────────────────────────────────────────
# ADD THIS to backend/app.py
#
# 1. Add AdminMessageRequest to your Pydantic models section
# 2. Add the /notify/admin-message route
# ─────────────────────────────────────────────────────────────────────────────

# ── Add to Pydantic models (alongside existing ones) ──────────────────────────

class AdminMessageRequest(BaseModel):
    userEmail:      str
    telegramChatId: Optional[str] = None
    userName:       str
    customMessage:  str
    subject:        Optional[str] = "Message from PosePerfect"
    # unused but sent by frontend to reuse same schema:
    asanaCount:       int = 0
    estimatedMinutes: int = 0


# ── Add this route (alongside /notify/session and /notify/skip) ───────────────

@app.post("/notify/admin-message")
async def notify_admin_message(req: AdminMessageRequest):
    """
    Admin-only endpoint: send a free-form message to a user
    via email and/or Telegram from the Admin panel.
    """
    from notifications import send_admin_email, send_admin_telegram
    results = {}

    if req.userEmail:
        results["email"] = send_admin_email(
            req.userEmail,
            req.userName,
            req.subject or "Message from PosePerfect",
            req.customMessage,
        )
    if req.telegramChatId:
        results["telegram"] = await send_admin_telegram(
            req.telegramChatId,
            req.userName,
            req.customMessage,
        )

    return {"sent": results}



@app.post("/predict", response_model=PredictionResult)
async def predict(file: UploadFile = File(...)):
    raw = await file.read()
    arr = np.frombuffer(raw, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = pose_model.process(img_rgb)
    if not results.pose_landmarks:
        raise HTTPException(status_code=422,
            detail="No pose detected. Ensure full body is visible.")

    lm          = results.pose_landmarks.landmark
    user_angles = extract_angles(lm)
    proba       = model.predict_proba([user_angles])[0]
    classes     = get_classes()
    class_idx   = int(np.argmax(proba))
    confidence  = float(proba[class_idx])
    raw_label   = classes[class_idx]

    _smooth_buf.append(raw_label)
    smoothed      = Counter(_smooth_buf).most_common(1)[0][0]
    smoothed_conf = float(proba[classes.index(smoothed)]) if smoothed in classes else confidence

    if smoothed_conf < CONFIDENCE_THRESHOLD:
        return PredictionResult(pose="Unknown Pose", confidence=round(smoothed_conf,4),
            posture_status="unknown",
            joints=[JointFeedback(name=n, status="idle",
                                  feedback="Hold a recognised pose") for n in JOINT_NAMES])

    display = DISPLAY_POSE_NAMES.get(smoothed, smoothed.replace("_"," ").title())
    teacher = teacher_angles.get(smoothed)
    if teacher is not None:
        joints, correct = build_joint_feedback(user_angles, teacher, smoothed)
        status = "correct" if correct >= 9 else "wrong"
    else:
        joints = [JointFeedback(name=n, status="idle",
                                feedback="No teacher reference available") for n in JOINT_NAMES]
        status = "unknown"

    return PredictionResult(pose=display, confidence=round(smoothed_conf,4),
                            posture_status=status, joints=joints)
