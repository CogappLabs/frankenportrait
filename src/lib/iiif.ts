export type Region = { x: number; y: number; w: number; h: number } | "full";

/**
 * Output width is capped to the region's own width. Getty rejects upscaling
 * with a 400, so asking for a fixed size breaks whenever a band is cut from a
 * small source.
 */
export function iiifUrl(
	serviceBase: string,
	region: Region = "full",
	width = 800,
): string {
	const base = serviceBase.replace(/\/+$/, "");
	if (region === "full") return `${base}/full/${width},/0/default.jpg`;

	const r = `${Math.round(region.x)},${Math.round(region.y)},${Math.round(region.w)},${Math.round(region.h)}`;
	const w = Math.min(Math.round(width), Math.round(region.w));
	return `${base}/${r}/${w},/0/default.jpg`;
}
