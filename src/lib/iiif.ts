export type Region = { x: number; y: number; w: number; h: number } | "full";

export function iiifUrl(
	serviceBase: string,
	region: Region = "full",
	width = 800,
): string {
	const base = serviceBase.replace(/\/+$/, "");
	const r =
		region === "full"
			? "full"
			: `${Math.round(region.x)},${Math.round(region.y)},${Math.round(region.w)},${Math.round(region.h)}`;
	return `${base}/${r}/${width},/0/default.jpg`;
}
