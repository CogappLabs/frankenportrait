import type { FaceDetection } from "./faces";
import type { Region } from "./iiif";

export type BandName = "eyes" | "nose" | "mouth";
export const BANDS: BandName[] = ["eyes", "nose", "mouth"];

/** Slices are cut this many inter-ocular widths either side of centre. */
const HALF_WIDTH = 1.3;

type Bounds = { width: number; height: number };

function clampRegion(r: Region, bounds: Bounds): Region {
	if (r === "full") return r;
	const x = Math.max(0, Math.min(r.x, bounds.width - 1));
	const y = Math.max(0, Math.min(r.y, bounds.height - 1));
	return {
		x,
		y,
		w: Math.max(1, Math.min(r.w, bounds.width - x)),
		h: Math.max(1, Math.min(r.h, bounds.height - y)),
	};
}

/**
 * Horizontal slice of the face for one feature, in source pixels.
 *
 * Cuts are placed off the eye/mouth keypoints rather than off image height, so
 * a head-and-shoulders bust and a full-length portrait yield slices that line
 * up when stacked. Returns null when the detector gave no usable keypoints.
 */
export function bandRegion(
	face: FaceDetection,
	band: BandName,
	bounds: Bounds,
): Region | null {
	const kp = face.keypoints;
	const left = kp?.leftEye;
	const right = kp?.rightEye;
	const mouth = kp?.mouth;
	if (!left || !right || !mouth) return null;

	const eyeY = (left.y + right.y) / 2;
	const eyeX = (left.x + right.x) / 2;
	const ocular = Math.hypot(right.x - left.x, right.y - left.y);
	if (ocular < 4) return null;

	// Eye-to-mouth distance sets the slice heights, so the three bands tile the
	// face without overlap whatever the head's size in frame.
	const drop = mouth.y - eyeY;
	if (drop <= 0) return null;

	const spans: Record<BandName, [number, number]> = {
		eyes: [eyeY - drop * 0.75, eyeY + drop * 0.3],
		nose: [eyeY + drop * 0.3, eyeY + drop * 0.85],
		mouth: [eyeY + drop * 0.85, mouth.y + drop * 0.7],
	};

	const [top, bottom] = spans[band];
	const cx = (eyeX + mouth.x) / 2;
	const halfW = ocular * HALF_WIDTH;

	return clampRegion(
		{ x: cx - halfW, y: top, w: halfW * 2, h: bottom - top },
		bounds,
	);
}

/** Even horizontal thirds, for images where no face was found. */
export function thirdsRegion(band: BandName, bounds: Bounds): Region {
	const i = BANDS.indexOf(band);
	const h = bounds.height / 3;
	return { x: 0, y: i * h, w: bounds.width, h };
}
