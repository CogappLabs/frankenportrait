import { declaresUpscaling } from "../lib/iiif";
import { type Provider, registerProvider } from "../lib/providers";

const SEARCH_API = "https://www.getty.edu/search/api/search";
const PAGE_SIZE = 100;
const ARTIST_DATE_RE = /\((?:[^,()]+,\s*)?([^()]*?\d{3,4}[^()]*)\)/;

type GettyResult = {
	id: string;
	title: string;
	description?: string;
	url?: string;
	open_content?: boolean;
	thumbnail?: {
		image_service?: string;
		alt_text?: string;
		size_restricted?: boolean;
	};
};

type GettyResponse = {
	data: GettyResult[];
};

function parseDescription(desc: string | undefined): {
	date?: string;
	artist?: string;
	medium?: string;
} {
	if (!desc) return {};
	const parts = desc.split(";").map((p) => p.trim());
	const date = parts[0] || undefined;
	const artist = parts[1] || undefined;
	const medium = parts[2] || undefined;
	return { date, artist, medium };
}

function shortYear(s: string | undefined): string | undefined {
	if (!s) return undefined;
	const m = s.match(/\d{3,4}/);
	return m ? m[0] : s;
}

function artistOnly(s: string | undefined): string | undefined {
	if (!s) return undefined;
	return s
		.replace(ARTIST_DATE_RE, "")
		.trim()
		.replace(/\s*\(\s*\)\s*/g, "");
}

export const gettyProvider: Provider = {
	id: "getty",
	name: "Getty Museum",
	nameKey: "providers.getty",
	kind: "search",
	defaultQuery: "portrait",
	search: async (query, page = 1) => {
		const url = new URL(SEARCH_API);
		if (query.trim()) url.searchParams.set("q", query);
		url.searchParams.set("source_app", "museum_collection_pages");
		url.searchParams.set("open_content", "true");
		url.searchParams.set("size", String(PAGE_SIZE));
		url.searchParams.set("from", String((page - 1) * PAGE_SIZE));
		const res = await fetch(url);
		if (!res.ok) throw new Error(`Getty search failed: ${res.status}`);
		const json = (await res.json()) as GettyResponse;
		return (json.data ?? [])
			.filter(
				(r) =>
					r.thumbnail?.image_service &&
					!r.thumbnail.size_restricted &&
					r.open_content,
			)
			.map((r) => {
				const meta = parseDescription(r.description);
				const artist = artistOnly(meta.artist);
				const year = shortYear(meta.date);
				const ref = `getty:${encodeURIComponent(r.thumbnail?.image_service ?? "")}|${encodeURIComponent(r.title)}|${encodeURIComponent(artist ?? "")}|${encodeURIComponent(year ?? "")}|${encodeURIComponent(r.url ?? "")}`;
				return {
					id: r.id,
					title: r.title,
					subtitle: [artist, year].filter(Boolean).join(" · "),
					thumbnailUrl: `${r.thumbnail?.image_service}/full/!300,300/0/default.jpg`,
					sourceRef: ref,
				};
			});
	},
	resolve: async (ref) => {
		const body = ref.startsWith("getty:") ? ref.slice(6) : ref;
		const [serviceBase, title, artist, year, pageUrl] = body
			.split("|")
			.map((s) => decodeURIComponent(s));
		const infoRes = await fetch(`${serviceBase}/info.json`);
		if (!infoRes.ok)
			throw new Error(`Getty info.json failed: ${infoRes.status}`);
		const info = (await infoRes.json()) as { width: number; height: number };
		return {
			serviceBase,
			width: info.width,
			height: info.height,
			upscales: declaresUpscaling(info),
			pageUrl: pageUrl || undefined,
			label: title || serviceBase,
			metadata: {
				title: title || "",
				artist: artist || undefined,
				date: year || undefined,
			},
		};
	},
};

registerProvider(gettyProvider);
