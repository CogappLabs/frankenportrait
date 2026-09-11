import { type BandName, bandRegion } from "./bands";
import { detectFaces } from "./faces";
import { iiifUrl, type Region } from "./iiif";
import { listProviders, type SearchHit } from "./providers";

export type Slot = {
	band: BandName;
	hit: SearchHit;
	serviceBase: string;
	region: Region;
	url: string;
	title: string;
	artist?: string;
	provider: string;
};

/** Detection runs on a downscaled copy; big IIIF images are slow and needless. */
const DETECT_WIDTH = 640;

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Image failed: ${src}`));
		img.src = src;
	});
}

export function pick<T>(items: T[]): T | undefined {
	return items[Math.floor(Math.random() * items.length)];
}

/** Pages fetched per provider per search. 100 hits a page, so 300 each. */
const POOL_PAGES = 3;

/** Both collections hold >10k portraits; start somewhere random in the first
 * 20 pages so repeat searches for the same term draw different sitters. */
const MAX_OFFSET_PAGE = 20;

export async function searchPool(query: string): Promise<SearchHit[]> {
	const providers = listProviders().filter(
		(p) => p.kind === "search" && p.search,
	);
	const start = 1 + Math.floor(Math.random() * MAX_OFFSET_PAGE);
	const jobs = providers.flatMap((p) =>
		Array.from(
			{ length: POOL_PAGES },
			(_, i) => p.search?.(query, start + i) ?? Promise.resolve([]),
		),
	);
	const results = await Promise.allSettled(jobs);
	const hits = results.flatMap((r) =>
		r.status === "fulfilled" ? r.value : [],
	);

	const seen = new Set<string>();
	return hits.filter((h) => {
		if (seen.has(h.sourceRef)) return false;
		seen.add(h.sourceRef);
		return true;
	});
}

/** Crop one hit to one band, or null when no face is found in it. */
export async function makeSlot(
	hit: SearchHit,
	band: BandName,
): Promise<Slot | null> {
	const provider = listProviders().find((p) =>
		hit.sourceRef.startsWith(`${p.id}:`),
	);
	if (!provider) throw new Error(`No provider for ${hit.sourceRef}`);
	const resolved = await provider.resolve(hit.sourceRef);
	const bounds = { width: resolved.width, height: resolved.height };

	let region: Region | null = null;
	try {
		const probe = await loadImage(
			iiifUrl(resolved.serviceBase, "full", DETECT_WIDTH),
		);
		const faces = await detectFaces(probe);
		const best = faces.sort((a, b) => b.score - a.score)[0];
		if (best) {
			// Keypoints are in probe pixels; bands are cut in source pixels.
			const scale = resolved.width / probe.naturalWidth;
			const scaled = {
				...best,
				keypoints: Object.fromEntries(
					Object.entries(best.keypoints ?? {}).map(([k, p]) => [
						k,
						{ x: p.x * scale, y: p.y * scale },
					]),
				),
			};
			region = bandRegion(scaled, band, bounds);
		}
	} catch {
		// Detector or image load failed; treat as no face.
	}

	if (!region) return null;

	return {
		band,
		hit,
		serviceBase: resolved.serviceBase,
		region,
		url: iiifUrl(resolved.serviceBase, region, 800),
		title: resolved.metadata?.title || resolved.label,
		artist: resolved.metadata?.artist,
		provider: provider.name,
	};
}

/**
 * Draw candidates until one yields a face. Portrait searches return plenty of
 * text plates and specimen photographs, so several misses per slot is normal
 * rather than a failure. onAttempt reports each miss so the UI can say why it
 * is still working.
 */
export async function rollSlot(
	hits: SearchHit[],
	band: BandName,
	onAttempt?: (tried: number) => void,
	attempts = 10,
): Promise<Slot | null> {
	const tried = new Set<string>();
	for (let i = 0; i < attempts; i++) {
		const remaining = hits.filter((h) => !tried.has(h.sourceRef));
		const hit = pick(remaining);
		if (!hit) break;
		tried.add(hit.sourceRef);
		onAttempt?.(tried.size);
		try {
			const slot = await makeSlot(hit, band);
			if (slot) return slot;
		} catch {
			// Resolve failed for this candidate; try another.
		}
	}
	return null;
}
