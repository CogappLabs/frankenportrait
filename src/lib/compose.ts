import type { Slot } from "./shuffle";

/** Output width; each band keeps its own aspect ratio at this width. */
const WIDTH = 900;

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Image failed: ${src}`));
		img.src = src;
	});
}

/**
 * Stack the three bands into one portrait. Each is drawn at full canvas width,
 * so the inter-ocular normalising done when the band was cut is what makes the
 * features line up rather than anything here.
 */
export async function composeCanvas(
	slots: Slot[],
	flipped: boolean[] = [],
): Promise<HTMLCanvasElement> {
	const images = await Promise.all(slots.map((s) => loadImage(s.url)));
	const heights = images.map((img) =>
		Math.round((img.naturalHeight / img.naturalWidth) * WIDTH),
	);

	const canvas = document.createElement("canvas");
	canvas.width = WIDTH;
	canvas.height = heights.reduce((a, b) => a + b, 0);
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("No 2d context");

	let y = 0;
	images.forEach((img, i) => {
		if (flipped[i]) {
			ctx.save();
			ctx.translate(WIDTH, y);
			ctx.scale(-1, 1);
			ctx.drawImage(img, 0, 0, WIDTH, heights[i]);
			ctx.restore();
		} else {
			ctx.drawImage(img, 0, y, WIDTH, heights[i]);
		}
		y += heights[i];
	});
	return canvas;
}

export function canvasToBlob(
	canvas: HTMLCanvasElement,
	type = "image/jpeg",
	quality = 0.92,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
			type,
			quality,
		);
	});
}

export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function saveFrankenportrait(
	slots: Slot[],
	flipped: boolean[] = [],
): Promise<void> {
	const canvas = await composeCanvas(slots, flipped);
	const blob = await canvasToBlob(canvas);
	downloadBlob(blob, `frankenportrait-${Date.now()}.jpg`);
}
