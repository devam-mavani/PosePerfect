"""
generate_dataset.py
===================
Processes raw pose images → extracts 12 joint angles via MediaPipe →
appends rows to train_angle.csv.

WHAT'S NEW
----------
  • Multi-folder parallel processing  — all pose folders run concurrently
  • Folder name → label automatically — underscores/hyphens → spaces
                                        e.g. "urdhva_dhanurasana" → "urdhva dhanurasana"
  • --poses flag  — process multiple specific poses at once
                    e.g. --poses tree warrior2 downdog
  • Progress bars — per-image tqdm bar for every pose folder
  • Rich summary  — table showing added/skipped/status per pose at the end
  • --workers     — control how many pose folders run in parallel (default: 4)

IMAGE PREPROCESSING PIPELINE (handles any image regardless of size/format)
---------------------------------------------------------------------------
Every image goes through these steps before MediaPipe:

  1. EXIF auto-rotation   — fixes phone portrait photos rotated 90/180/270°
  2. Alpha-channel strip  — converts RGBA/PNG-with-transparency to RGB
  3. Greyscale upsample   — converts 1-channel to RGB
  4. Letterbox resize     — scales ANY dimension to a fixed square canvas
                            (default 640×640) while preserving aspect ratio
                            using black padding — body proportions stay intact
                            so extracted angles are accurate
  5. CLAHE enhancement    — adaptive histogram equalisation on luminance
                            channel; recovers detail in dark/low-contrast
                            images without blowing out bright ones

After preprocessing every image is guaranteed:
  ✓ 3-channel RGB
  ✓ 640×640 pixels (configurable)
  ✓ Correct upright orientation
  ✓ Reasonable contrast

FOLDER STRUCTURE REQUIRED
--------------------------
backend/
  raw_dataset/
    downdog/               ← folder name becomes the pose label
      img001.jpg
    urdhva_dhanurasana/    ← underscores auto-converted to spaces → "urdhva dhanurasana"
      img001.jpg
    warrior-2/             ← hyphens also auto-converted to spaces → "warrior 2"
      img001.jpg
  train_angle.csv
  teacher_yoga/angle_teacher_yoga.csv

USAGE
-----
  python3 generate_dataset.py                              # all missing poses (parallel)
  python generate_dataset.py --poses tree warrior2        # specific poses only
  python generate_dataset.py --pose bhujangasana          # single pose (legacy flag)
  python generate_dataset.py --dry-run                    # preview, no writes
  python generate_dataset.py --poses tree --force         # re-process existing
  python generate_dataset.py --no-enhance                 # skip CLAHE (faster)
  python generate_dataset.py --target-size 480            # 480×480 canvas
  python generate_dataset.py --workers 2                  # limit parallel workers
"""

import argparse
import csv
import logging
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import List, Optional

import cv2
import mediapipe as mp
import numpy as np
import pandas as pd

# ── Optional tqdm progress bar (install with: pip install tqdm) ───────────────
try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("generate_dataset")

BASE_DIR    = Path(__file__).parent
RAW_DIR     = BASE_DIR / "raw_dataset"
TRAIN_CSV   = BASE_DIR / "train_angle.csv"
TEACHER_CSV = BASE_DIR / "teacher_yoga" / "angle_teacher_yoga.csv"

SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"}

# One MediaPipe instance per thread (not thread-safe to share)
_thread_local = threading.local()

COLUMNS = [
    "left_wrist_angle",    "right_wrist_angle",
    "left_elbow_angle",    "right_elbow_angle",
    "left_shoulder_angle", "right_shoulder_angle",
    "left_knee_angle",     "right_knee_angle",
    "left_ankle_angle",    "right_ankle_angle",
    "left_hip_angle",      "right_hip_angle",
    "target",
]
TEACHER_COLUMNS = COLUMNS[:-1] + ["name_yoga"]

_EXIF_ROTATIONS = {
    3: cv2.ROTATE_180,
    6: cv2.ROTATE_90_CLOCKWISE,
    8: cv2.ROTATE_90_COUNTERCLOCKWISE,
}

# ── CSV write lock (multiple threads append to the same file) ─────────────────
_csv_lock = threading.Lock()


# ── Folder name → pose label ──────────────────────────────────────────────────
def folder_to_label(folder_name: str) -> str:
    """
    Convert a folder name to a human-readable pose label.
    Rules:
      - underscores → spaces      ("urdhva_dhanurasana" → "urdhva dhanurasana")
      - hyphens → spaces          ("warrior-2"          → "warrior 2")
      - strip leading/trailing whitespace
      - lowercase (to stay consistent with existing CSV labels)

    Examples:
      downdog               → downdog
      urdhva_dhanurasana    → urdhva dhanurasana
      Warrior_II            → warrior ii
      tree-pose             → tree pose
    """
    return folder_name.replace("_", " ").replace("-", " ").strip().lower()


# ── Per-thread MediaPipe instance ─────────────────────────────────────────────
def _get_pose_model():
    if not hasattr(_thread_local, "pose_model"):
        _thread_local.pose_model = mp.solutions.pose.Pose(
            static_image_mode=True,
            model_complexity=2,
            min_detection_confidence=0.4,
        )
    return _thread_local.pose_model


# ── Image preprocessing ───────────────────────────────────────────────────────
def _fix_exif_rotation(img: np.ndarray, img_path: Path) -> np.ndarray:
    try:
        from PIL import Image, ExifTags
        with Image.open(img_path) as pil_img:
            exif = pil_img._getexif()
            if exif is None:
                return img
            orient_tag = next(
                (k for k, v in ExifTags.TAGS.items() if v == "Orientation"), None
            )
            if orient_tag and orient_tag in exif:
                rotation = _EXIF_ROTATIONS.get(exif[orient_tag])
                if rotation is not None:
                    img = cv2.rotate(img, rotation)
    except Exception:
        pass
    return img


def _ensure_rgb(img: np.ndarray) -> np.ndarray:
    if img.ndim == 2:
        return cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    if img.shape[2] == 4:
        return cv2.cvtColor(img, cv2.COLOR_BGRA2RGB)
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


def _letterbox(img: np.ndarray, target: int) -> np.ndarray:
    h, w   = img.shape[:2]
    scale  = target / max(h, w)
    new_w  = int(w * scale)
    new_h  = int(h * scale)
    interp  = cv2.INTER_AREA if scale < 1 else cv2.INTER_LANCZOS4
    resized = cv2.resize(img, (new_w, new_h), interpolation=interp)
    canvas = np.zeros((target, target, 3), dtype=np.uint8)
    y_off  = (target - new_h) // 2
    x_off  = (target - new_w) // 2
    canvas[y_off:y_off + new_h, x_off:x_off + new_w] = resized
    return canvas


def _clahe_enhance(img_rgb: np.ndarray) -> np.ndarray:
    lab        = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2LAB)
    l, a, b    = cv2.split(lab)
    clahe      = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l)
    return cv2.cvtColor(cv2.merge([l_enhanced, a, b]), cv2.COLOR_LAB2RGB)


def preprocess_image(
    img_path: Path, target_size: int = 640, enhance: bool = True,
) -> Optional[np.ndarray]:
    img = cv2.imread(str(img_path), cv2.IMREAD_UNCHANGED)
    if img is None:
        return None
    img = _fix_exif_rotation(img, img_path)
    img = _ensure_rgb(img)
    img = _letterbox(img, target_size)
    if enhance:
        img = _clahe_enhance(img)
    return img


# ── Angle extraction (must stay identical to app.py) ─────────────────────────
def _angle(lm1, lm2, lm3) -> float:
    a = np.degrees(
        np.arctan2(lm3.y - lm2.y, lm3.x - lm2.x)
        - np.arctan2(lm1.y - lm2.y, lm1.x - lm2.x)
    )
    return float(a + 360 if a < 0 else a)


def extract_angles(lm) -> List[float]:
    P = mp.solutions.pose.PoseLandmark
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


def process_image(
    img_path: Path, target_size: int = 640, enhance: bool = True,
) -> Optional[List[float]]:
    img = preprocess_image(img_path, target_size=target_size, enhance=enhance)
    if img is None:
        return None
    results = _get_pose_model().process(img)
    if not results.pose_landmarks:
        return None
    return extract_angles(results.pose_landmarks.landmark)


# ── CSV helpers ───────────────────────────────────────────────────────────────
def load_existing_labels() -> set:
    """Load all unique labels currently in train_angle.csv."""
    if not TRAIN_CSV.exists():
        return set()
    return set(pd.read_csv(TRAIN_CSV)["target"].unique())


def append_to_train_csv(rows: list, dry_run: bool):
    if dry_run:
        log.info("  [DRY RUN] Would append %d rows", len(rows))
        return
    with _csv_lock:
        file_exists = TRAIN_CSV.exists()
        with open(TRAIN_CSV, "a", newline="") as f:
            w = csv.writer(f)
            if not file_exists:
                w.writerow(COLUMNS)
            w.writerows(rows)


def append_to_teacher_csv(angles: list, label: str, dry_run: bool):
    if dry_run:
        log.info("  [DRY RUN] Would write teacher ref for '%s'", label)
        return
    with _csv_lock:
        TEACHER_CSV.parent.mkdir(exist_ok=True)
        file_exists = TEACHER_CSV.exists()
        with open(TEACHER_CSV, "a", newline="") as f:
            w = csv.writer(f)
            if not file_exists:
                w.writerow(TEACHER_COLUMNS)
            w.writerow(angles + [label])


# ── Per-folder processing (runs in a thread) ──────────────────────────────────
def process_pose_folder(
    pose_dir: Path,
    existing_labels: set,
    dry_run: bool,
    target_size: int,
    enhance: bool,
    force: bool,
) -> dict:
    """
    Process a single pose folder. Returns a result dict:
      { label, folder, added, skipped, status }
    """
    folder_name = pose_dir.name
    label       = folder_to_label(folder_name)  # ← name comes from folder

    result = {
        "folder": folder_name,
        "label":  label,
        "added":  0,
        "skipped": 0,
        "status": "",
    }

    if label in existing_labels and not force:
        result["status"] = "skipped (already exists)"
        return result

    is_new = label not in existing_labels

    images = sorted([
        p for p in pose_dir.iterdir()
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTS
    ])

    if not images:
        result["status"] = "⚠ no images found"
        return result

    rows, teacher_all, skipped = [], [], 0

    # Progress bar per pose (shows filename while processing)
    iterator = (
        tqdm(images, desc=f"  {label}", unit="img", leave=False)
        if HAS_TQDM else images
    )

    for img_path in iterator:
        angles = process_image(img_path, target_size=target_size, enhance=enhance)
        if angles is None:
            skipped += 1
            if HAS_TQDM:
                iterator.set_postfix({"skipped": skipped})  # type: ignore
        else:
            rows.append(angles + [label])
            teacher_all.append(angles)

    if not rows:
        result["status"] = "✗ 0 poses detected"
        result["skipped"] = skipped
        return result

    append_to_train_csv(rows, dry_run)

    if is_new and teacher_all:
        avg = np.mean(teacher_all, axis=0).tolist()
        append_to_teacher_csv(avg, label, dry_run)

    result["added"]   = len(rows)
    result["skipped"] = skipped
    result["status"]  = "✓ done" + (" (teacher ref updated)" if is_new else "")
    return result


# ── Summary table printer ─────────────────────────────────────────────────────
def print_summary(results: list, dry_run: bool):
    col_w = [20, 28, 8, 8, 30]
    header = ["FOLDER", "LABEL (pose name)", "ADDED", "SKIPPED", "STATUS"]
    sep    = "  ".join("─" * w for w in col_w)

    print("\n" + sep)
    print("  ".join(h.ljust(w) for h, w in zip(header, col_w)))
    print(sep)
    for r in results:
        row = [
            r["folder"][:col_w[0]],
            r["label"][:col_w[1]],
            str(r["added"]),
            str(r["skipped"]),
            r["status"][:col_w[4]],
        ]
        print("  ".join(v.ljust(w) for v, w in zip(row, col_w)))
    print(sep)

    total_added   = sum(r["added"]   for r in results)
    total_skipped = sum(r["skipped"] for r in results)
    print(f"\n  Total rows added : {total_added}")
    print(f"  Total imgs skipped: {total_skipped}  (pose not detected)")

    if total_added > 0 and not dry_run:
        new_poses = [r["label"] for r in results if "done" in r["status"] and "teacher" in r["status"]]
        if new_poses:
            print("\n  ── Next steps for new poses ──")
            print("  1. backend/app.py        → DISPLAY_POSE_NAMES, POSE_DESCRIPTIONS, CORRECTION_THRESHOLDS")
            print("  2. scheduleGenerator.js  → ASANA_LIBRARY")
            print("  3. constants/index.js    → SUPPORTED_POSES")
            for p in new_poses:
                print(f"  4. public/asana-images/{p.replace(' ', '_')}.svg")
        print("\n  Restart backend: uvicorn app:app --reload\n")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description=(
            "Build training dataset from raw pose images.\n"
            "Folder name → pose label automatically (underscores/hyphens → spaces).\n"
            "Multiple folders processed in parallel."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    # --poses accepts multiple values: --poses tree warrior2 downdog
    parser.add_argument(
        "--poses", nargs="+", metavar="POSE",
        help="Process only these pose folders (space-separated). E.g: --poses tree warrior2",
    )
    # legacy single-pose flag kept for backward compatibility
    parser.add_argument("--pose",       type=str,  help="Process only this single pose folder (legacy).")
    parser.add_argument("--force",      action="store_true", help="Re-process poses already in CSV.")
    parser.add_argument("--dry-run",    action="store_true", help="Preview only — no file writes.")
    parser.add_argument("--no-enhance", action="store_true", help="Skip CLAHE contrast enhancement.")
    parser.add_argument("--target-size",type=int, default=640,
                        help="Letterbox canvas size in pixels (default: 640).")
    parser.add_argument("--workers",    type=int, default=4,
                        help="Parallel worker threads for processing folders (default: 4).")
    args = parser.parse_args()

    if not RAW_DIR.exists():
        log.error(
            "raw_dataset/ not found at %s\n"
            "Create it with sub-folders per pose, e.g.:\n"
            "  raw_dataset/downdog/img001.jpg\n"
            "  raw_dataset/urdhva_dhanurasana/img001.jpg",
            RAW_DIR,
        )
        sys.exit(1)

    # Resolve which pose folders to process
    selected_folders: list[str] = []
    if args.poses:
        selected_folders = args.poses
    elif args.pose:
        selected_folders = [args.pose]

    if selected_folders:
        pose_dirs = []
        for name in selected_folders:
            d = RAW_DIR / name
            if not d.exists():
                log.error("Pose folder not found: %s", d)
                sys.exit(1)
            pose_dirs.append(d)
    else:
        pose_dirs = sorted(d for d in RAW_DIR.iterdir() if d.is_dir())

    if not pose_dirs:
        log.error("No pose folders found in %s", RAW_DIR)
        sys.exit(1)

    existing_labels = load_existing_labels()
    enhance         = not args.no_enhance

    log.info("Existing labels  : %s", sorted(existing_labels) or "(none)")
    log.info("Folders to process: %d", len(pose_dirs))
    log.info("Parallel workers : %d", min(args.workers, len(pose_dirs)))
    log.info("Target image size: %dpx  |  CLAHE: %s  |  Force: %s",
             args.target_size, "on" if enhance else "off", args.force)

    if not HAS_TQDM:
        log.info("Tip: pip install tqdm  for per-image progress bars")

    print()

    # ── Parallel execution ────────────────────────────────────────────────────
    results = []
    n_workers = min(args.workers, len(pose_dirs))

    with ThreadPoolExecutor(max_workers=n_workers) as executor:
        futures = {
            executor.submit(
                process_pose_folder,
                pose_dir,
                existing_labels,
                args.dry_run,
                args.target_size,
                enhance,
                args.force,
            ): pose_dir
            for pose_dir in pose_dirs
        }

        for future in as_completed(futures):
            pose_dir = futures[future]
            try:
                result = future.result()
                results.append(result)
                # Live progress log per completed folder
                label = result["label"]
                added = result["added"]
                status = result["status"]
                log.info("[%-28s]  label='%s'  added=%d  %s",
                         pose_dir.name, label, added, status)
            except Exception as exc:
                log.error("Error processing %s: %s", pose_dir.name, exc)
                results.append({
                    "folder":  pose_dir.name,
                    "label":   folder_to_label(pose_dir.name),
                    "added":   0,
                    "skipped": 0,
                    "status":  f"✗ error: {exc}",
                })

    # Sort results in original folder order for readability
    order = {d.name: i for i, d in enumerate(pose_dirs)}
    results.sort(key=lambda r: order.get(r["folder"], 999))

    print_summary(results, args.dry_run)


if __name__ == "__main__":
    main()
