import { declaresUpscaling } from "../lib/iiif";
import { type Provider, registerProvider } from "../lib/providers";

const SEARCH_API = "https://api.wellcomecollection.org/catalogue/v2/works";
const PAGE_SIZE = 100;
const IIIF_RE = /https:\/\/iiif\.wellcomecollection\.org\/image\/([^/]+)/;

// Public domain and attribution-only. Excludes cc-by-nc and in-copyright, since
// the meme is a derivative the user downloads.
const OPEN_LICENSES = "cc-by,cc0,pdm";

type WellcomeWork = {
	id: string;
	title: string;
	description?: string;
	thumbnail?: { url?: string };
	contributors?: { agent?: { label?: string } }[];
	production?: { dates?: { label?: string }[] }[];
};

type WellcomeResponse = {
	results: WellcomeWork[];
};

function imageBaseFromThumbnail(url: string | undefined): string | undefined {
	if (!url) return undefined;
	const m = url.match(IIIF_RE);
	return m ? `https://iiif.wellcomecollection.org/image/${m[1]}` : undefined;
}

function firstContributor(work: WellcomeWork): string | undefined {
	return work.contributors?.[0]?.agent?.label;
}

function firstDate(work: WellcomeWork): string | undefined {
	return work.production?.[0]?.dates?.[0]?.label;
}

export const wellcomeProvider: Provider = {
	id: "wellcome",
	name: "Wellcome Collection",
	nameKey: "providers.wellcome",
	kind: "search",
	defaultQuery: "portrait",
	search: async (query, page = 1) => {
		const url = new URL(SEARCH_API);
		if (query.trim()) url.searchParams.set("query", query);
		url.searchParams.set("workType", "k,q"); // Pictures, Digital Images
		url.searchParams.set("availabilities", "online");
		url.searchParams.set("items.locations.license", OPEN_LICENSES);
		url.searchParams.set("include", "contributors,production");
		url.searchParams.set("pageSize", String(PAGE_SIZE));
		url.searchParams.set("page", String(page));
		const res = await fetch(url);
		if (!res.ok) throw new Error(`Wellcome search failed: ${res.status}`);
		const json = (await res.json()) as WellcomeResponse;
		return (json.results ?? [])
			.map((w) => {
				const base = imageBaseFromThumbnail(w.thumbnail?.url);
				if (!base) return null;
				const artist = firstContributor(w);
				const date = firstDate(w);
				const ref = `wellcome:${encodeURIComponent(base)}|${encodeURIComponent(w.title)}|${encodeURIComponent(artist ?? "")}|${encodeURIComponent(date ?? "")}`;
				return {
					id: w.id,
					title: w.title,
					subtitle: [artist, date].filter(Boolean).join(" · "),
					thumbnailUrl: w.thumbnail?.url ?? "",
					sourceRef: ref,
				};
			})
			.filter((h): h is NonNullable<typeof h> => h !== null);
	},
	resolve: async (ref) => {
		const body = ref.startsWith("wellcome:") ? ref.slice(9) : ref;
		const [serviceBase, title, artist, date] = body
			.split("|")
			.map((s) => decodeURIComponent(s));
		const infoRes = await fetch(`${serviceBase}/info.json`);
		if (!infoRes.ok)
			throw new Error(`Wellcome info.json failed: ${infoRes.status}`);
		const info = (await infoRes.json()) as { width: number; height: number };
		return {
			serviceBase,
			width: info.width,
			height: info.height,
			upscales: declaresUpscaling(info),
			label: title || serviceBase,
			metadata: {
				title: title || "",
				artist: artist || undefined,
				date: date || undefined,
			},
		};
	},
};

registerProvider(wellcomeProvider);
