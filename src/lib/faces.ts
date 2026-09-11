import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";
const MODEL_URL =
	"https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

export type FaceBox = {
	x: number;
	y: number;
	w: number;
	h: number;
	score: number;
};

export type Point = { x: number; y: number };

export type FaceDetection = FaceBox & {
	keypoints?: {
		rightEye?: Point;
		leftEye?: Point;
		noseTip?: Point;
		mouth?: Point;
		rightEar?: Point;
		leftEar?: Point;
	};
};

let detectorPromise: Promise<FaceDetector> | null = null;

async function loadDetector(): Promise<FaceDetector> {
	if (!detectorPromise) {
		detectorPromise = (async () => {
			const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
			return FaceDetector.createFromOptions(fileset, {
				baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
				runningMode: "IMAGE",
			});
		})();
	}
	return detectorPromise;
}

const KP_LABELS = [
	"rightEye",
	"leftEye",
	"noseTip",
	"mouth",
	"rightEar",
	"leftEar",
] as const;

export async function detectFaces(
	img: HTMLImageElement,
): Promise<FaceDetection[]> {
	const detector = await loadDetector();
	const result = detector.detect(img);
	const w = img.naturalWidth;
	const h = img.naturalHeight;
	return (result.detections ?? [])
		.map((d): FaceDetection | null => {
			const b = d.boundingBox;
			if (!b) return null;
			const score = d.categories?.[0]?.score ?? 0;
			const keypoints: FaceDetection["keypoints"] = {};
			(d.keypoints ?? []).forEach((kp, i) => {
				const label = KP_LABELS[i];
				if (!label) return;
				keypoints[label] = { x: kp.x * w, y: kp.y * h };
			});
			return {
				x: b.originX,
				y: b.originY,
				w: b.width,
				h: b.height,
				score,
				keypoints,
			};
		})
		.filter((f): f is FaceDetection => f !== null);
}

export function expandBox(
	box: FaceBox,
	factor: number,
	bounds: { width: number; height: number },
): FaceBox {
	const cx = box.x + box.w / 2;
	const cy = box.y + box.h / 2;
	const nw = box.w * factor;
	const nh = box.h * factor;
	const x = Math.max(0, cx - nw / 2);
	const y = Math.max(0, cy - nh / 2);
	const w = Math.min(bounds.width - x, nw);
	const h = Math.min(bounds.height - y, nh);
	return { x, y, w, h, score: box.score };
}

export function scaleBox(
	box: FaceBox,
	fromSize: { width: number; height: number },
	toSize: { width: number; height: number },
): FaceBox {
	const sx = toSize.width / fromSize.width;
	const sy = toSize.height / fromSize.height;
	return {
		x: box.x * sx,
		y: box.y * sy,
		w: box.w * sx,
		h: box.h * sy,
		score: box.score,
	};
}
