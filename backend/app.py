"""
AsanaAI – FastAPI Backend
=========================
Bridges the SVM yoga-pose ML model with the React frontend.

Endpoints
---------
GET  /health     → liveness check
POST /predict    → accepts a JPEG frame, returns pose + joint feedback
"""

import csv
import io
import logging
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.svm import SVC
from typing import List

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("asana-ai")

# ── Paths (relative to this file — adjust if needed) ─────────────────────────
BASE_DIR          = Path(__file__).parent
TRAIN_CSV         = BASE_DIR / "train_angle.csv"
TEACHER_CSV       = BASE_DIR / "teacher_yoga" / "angle_teacher_yoga.csv"

# ── MediaPipe setup ───────────────────────────────────────────────────────────
mp_pose    = mp.solutions.pose
pose_model = mp_pose.Pose(
    static_image_mode=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

# ── Joint metadata ────────────────────────────────────────────────────────────
JOINT_NAMES = [
    "Left Wrist", "Right Wrist",
    "Left Elbow", "Right Elbow",
    "Left Shoulder", "Right Shoulder",
    "Left Knee", "Right Knee",
    "Left Ankle", "Right Ankle",
    "Left Hip", "Right Hip",
]

DISPLAY_POSE_NAMES = {
    "downdog":  "Downward Dog",
    "goddess":  "Goddess Pose",
    "plank":    "Plank",
    "tree":     "Tree Pose",
    "warrior2": "Warrior II",
}

CORRECTION_THRESHOLD = 30   # degrees — same value as the original demo.py
CONFIDENCE_THRESHOLD  = 0.5  # min probability to accept a class


# ── Pydantic response models ──────────────────────────────────────────────────
class JointFeedback(BaseModel):
    name:     str
    status:   str   # "ok" | "fix" | "idle"
    feedback: str


class PredictionResult(BaseModel):
    pose:           str
    confidence:     float
    posture_status: str          # "correct" | "wrong" | "unknown"
    joints:         List[JointFeedback]


# ── Train SVM at startup ──────────────────────────────────────────────────────
def train_model() -> SVC:
    if not TRAIN_CSV.exists():
        raise FileNotFoundError(
            f"Training CSV not found: {TRAIN_CSV}\n"
            "Copy train_angle.csv next to app.py."
        )
    df = pd.read_csv(TRAIN_CSV)
    X  = df.iloc[:, :-1]
    y  = df["target"]
    clf = SVC(kernel="rbf", decision_function_shape="ovo", probability=True)
    clf.fit(X, y)
    log.info("SVM trained on %d samples, classes: %s", len(df), list(clf.classes_))
    return clf


def load_teacher_angles() -> dict:
    """
    Returns { pose_name: [12 angles] } from angle_teacher_yoga.csv.
    Falls back to an empty dict if the file doesn't exist.
    """
    angles = {}
    if not TEACHER_CSV.exists():
        log.warning("Teacher CSV not found at %s — posture feedback disabled.", TEACHER_CSV)
        return angles
    with open(TEACHER_CSV, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row["name_yoga"]
            if name not in angles:
                angles[name] = [
                    float(row["left_wrist_angle"]),
                    float(row["right_wrist_angle"]),
                    float(row["left_elbow_angle"]),
                    float(row["right_elbow_angle"]),
                    float(row["left_shoulder_angle"]),
                    float(row["right_shoulder_angle"]),
                    float(row["left_knee_angle"]),
                    float(row["right_knee_angle"]),
                    float(row["left_ankle_angle"]),
                    float(row["right_ankle_angle"]),
                    float(row["left_hip_angle"]),
                    float(row["right_hip_angle"]),
                ]
    log.info("Loaded teacher angles for poses: %s", list(angles.keys()))
    return angles


# ── Boot ──────────────────────────────────────────────────────────────────────
model          = train_model()
teacher_angles = load_teacher_angles()

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="AsanaAI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────
def calculate_angle(lm1, lm2, lm3) -> float:
    """3-point joint angle using arctan2 (matches original utils.py logic)."""
    angle = np.degrees(
        np.arctan2(lm3.y - lm2.y, lm3.x - lm2.x)
        - np.arctan2(lm1.y - lm2.y, lm1.x - lm2.x)
    )
    return angle + 360 if angle < 0 else angle


def extract_angles(landmarks) -> List[float]:
    lm = landmarks
    P  = mp_pose.PoseLandmark
    return [
        calculate_angle(lm[P.LEFT_ELBOW.value],  lm[P.LEFT_WRIST.value],   lm[P.LEFT_INDEX.value]),
        calculate_angle(lm[P.RIGHT_ELBOW.value], lm[P.RIGHT_WRIST.value],  lm[P.RIGHT_INDEX.value]),
        calculate_angle(lm[P.LEFT_SHOULDER.value],  lm[P.LEFT_ELBOW.value],   lm[P.LEFT_WRIST.value]),
        calculate_angle(lm[P.RIGHT_SHOULDER.value], lm[P.RIGHT_ELBOW.value],  lm[P.RIGHT_WRIST.value]),
        calculate_angle(lm[P.LEFT_ELBOW.value],  lm[P.LEFT_SHOULDER.value],  lm[P.LEFT_HIP.value]),
        calculate_angle(lm[P.RIGHT_HIP.value],   lm[P.RIGHT_SHOULDER.value], lm[P.RIGHT_ELBOW.value]),
        calculate_angle(lm[P.LEFT_HIP.value],    lm[P.LEFT_KNEE.value],      lm[P.LEFT_ANKLE.value]),
        calculate_angle(lm[P.RIGHT_HIP.value],   lm[P.RIGHT_KNEE.value],     lm[P.RIGHT_ANKLE.value]),
        calculate_angle(lm[P.LEFT_HIP.value],    lm[P.LEFT_ANKLE.value],     lm[P.LEFT_FOOT_INDEX.value]),
        calculate_angle(lm[P.RIGHT_HIP.value],   lm[P.RIGHT_ANKLE.value],    lm[P.RIGHT_FOOT_INDEX.value]),
        calculate_angle(lm[P.LEFT_KNEE.value],   lm[P.LEFT_HIP.value],       lm[P.RIGHT_HIP.value]),
        calculate_angle(lm[P.LEFT_HIP.value],    lm[P.RIGHT_HIP.value],      lm[P.RIGHT_KNEE.value]),
    ]


def build_joint_feedback(
    user_angles: List[float],
    teacher: List[float],
) -> tuple[List[JointFeedback], int]:
    """
    Compare user angles to teacher angles.
    Returns (joint list, number of correct joints).
    """
    joints = []
    correct = 0
    for i, (name, user_a, teach_a) in enumerate(
        zip(JOINT_NAMES, user_angles, teacher)
    ):
        diff = user_a - teach_a
        if abs(diff) <= CORRECTION_THRESHOLD:
            joints.append(JointFeedback(name=name, status="ok", feedback="Looking good!"))
            correct += 1
        elif diff < 0:
            joints.append(JointFeedback(
                name=name, status="fix",
                feedback=f"Increase angle by ~{abs(diff):.0f}°",
            ))
        else:
            joints.append(JointFeedback(
                name=name, status="fix",
                feedback=f"Reduce angle by ~{abs(diff):.0f}°",
            ))
    return joints, correct


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "model": "SVM", "classes": list(model.classes_)}


@app.post("/predict", response_model=PredictionResult)
async def predict(file: UploadFile = File(...)):
    # 1. Decode image
    raw = await file.read()
    arr = np.frombuffer(raw, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # 2. Run MediaPipe
    results = pose_model.process(img_rgb)
    if not results.pose_landmarks:
        raise HTTPException(
            status_code=422,
            detail="No human pose detected in the frame. Make sure your full body is visible.",
        )

    # 3. Extract joint angles
    lm          = results.pose_landmarks.landmark
    user_angles = extract_angles(lm)

    # 4. SVM prediction
    proba       = model.predict_proba([user_angles])[0]
    class_idx   = int(np.argmax(proba))
    confidence  = float(proba[class_idx])
    pred_label  = model.classes_[class_idx]

    # Low-confidence → unknown
    if confidence < CONFIDENCE_THRESHOLD:
        return PredictionResult(
            pose="Unknown Pose",
            confidence=confidence,
            posture_status="unknown",
            joints=[JointFeedback(name=n, status="idle", feedback="Hold a recognised pose") for n in JOINT_NAMES],
        )

    display_name = DISPLAY_POSE_NAMES.get(pred_label, pred_label.replace("_", " ").title())

    # 5. Joint feedback vs teacher
    teacher = teacher_angles.get(pred_label)
    if teacher:
        joints, correct_count = build_joint_feedback(user_angles, teacher)
        # Correct if more than 9 / 12 joints are within threshold (matches demo.py)
        posture_status = "correct" if correct_count > 9 else "wrong"
    else:
        # Teacher reference not available for this pose
        joints = [JointFeedback(name=n, status="idle", feedback="No teacher reference available") for n in JOINT_NAMES]
        posture_status = "unknown"

    return PredictionResult(
        pose=display_name,
        confidence=round(confidence, 4),
        posture_status=posture_status,
        joints=joints,
    )
