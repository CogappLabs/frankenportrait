export type Region = { x: number; y: number; w: number; h: number } | "full";

/** True when info.json advertises the IIIF 3 sizeUpscaling feature. */
export function declaresUpscaling(info: unknown): boolean {
	const features = (info as { extraFeatures?: unknown })?.extraFeatures;
	return Array.isArray(features) && features.includes("sizeUpscaling");
}

/**
 * The two servers are opposites on upscaling: Getty is IIIF 3 and needs the "^"
 * prefix, rejecting a plain size it would have to enlarge; Wellcome is IIIF 2,
 * rejects "^" outright, and enlarges a plain size happily. So ask for "^w," only
 * where info.json advertised it, and never ask a IIIF 2 service to shrink below
 * what it has.
 */
export function iiifUrl(
	serviceBase: string,
	region: Region = "full",
	width = 800,
	upscales = false,
): string {
	const base = serviceBase.replace(/\/+$/, "");
	const want = Math.round(width);

	if (region === "full") return `${base}/full/${want},/0/default.jpg`;

	const r = `${Math.round(region.x)},${Math.round(region.y)},${Math.round(region.w)},${Math.round(region.h)}`;
	const native = Math.round(region.w);
	if (want <= native) return `${base}/${r}/${want},/0/default.jpg`;
	return upscales
		? `${base}/${r}/^${want},/0/default.jpg`
		: `${base}/${r}/${want},/0/default.jpg`;
}
