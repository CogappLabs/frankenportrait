import { useCallback, useEffect, useRef, useState } from "react";
import { About } from "./components/About";
import { SlotStrip } from "./components/SlotStrip";
import { BANDS, type BandName } from "./lib/bands";
import { saveFrankenportrait } from "./lib/compose";
import type { SearchHit } from "./lib/providers";
import { rollSlot, type Slot, searchPool } from "./lib/shuffle";

const LABELS: Record<BandName, string> = {
	eyes: "Eyes",
	nose: "Nose",
	mouth: "Mouth",
};

type BandState = {
	slot: Slot | null;
	loading: boolean;
	tried: number;
	flipped: boolean;
};

const EMPTY: Record<BandName, BandState> = {
	eyes: { slot: null, loading: false, tried: 0, flipped: false },
	nose: { slot: null, loading: false, tried: 0, flipped: false },
	mouth: { slot: null, loading: false, tried: 0, flipped: false },
};

export default function App() {
	const [query, setQuery] = useState("portrait");
	const [pool, setPool] = useState<SearchHit[]>([]);
	const [bands, setBands] = useState<Record<BandName, BandState>>(EMPTY);
	const [error, setError] = useState<string | null>(null);
	const [searching, setSearching] = useState(false);
	const [showAbout, setShowAbout] = useState(false);
	const [saving, setSaving] = useState(false);
	const poolRef = useRef<SearchHit[]>([]);

	const patch = useCallback((band: BandName, next: Partial<BandState>) => {
		setBands((b) => ({ ...b, [band]: { ...b[band], ...next } }));
	}, []);

	const rerollBand = useCallback(
		async (band: BandName) => {
			const hits = poolRef.current;
			if (!hits.length) return;
			patch(band, { loading: true, tried: 0, slot: null, flipped: false });
			try {
				const slot = await rollSlot(hits, band, (tried) =>
					patch(band, { tried }),
				);
				patch(band, { slot, loading: false });
			} catch (e) {
				setError(e instanceof Error ? e.message : String(e));
				patch(band, { loading: false });
			}
		},
		[patch],
	);

	const flipBand = useCallback((band: BandName) => {
		setBands((b) => ({
			...b,
			[band]: { ...b[band], flipped: !b[band].flipped },
		}));
	}, []);

	const shuffleAll = useCallback(async () => {
		if (!poolRef.current.length) return;
		await Promise.all(BANDS.map((b) => rerollBand(b)));
	}, [rerollBand]);

	const loadPool = useCallback(
		async (q: string) => {
			setError(null);
			setSearching(true);
			setBands(EMPTY);
			try {
				const hits = await searchPool(q);
				poolRef.current = hits;
				setPool(hits);
				setSearching(false);
				if (!hits.length) {
					setError(`Nothing found for "${q}"`);
					return;
				}
				await Promise.all(BANDS.map((b) => rerollBand(b)));
			} catch (e) {
				setError(e instanceof Error ? e.message : String(e));
				setSearching(false);
			}
		},
		[rerollBand],
	);

	useEffect(() => {
		void loadPool("portrait");
	}, [loadPool]);

	const filled = BANDS.filter((b) => bands[b].slot !== null);
	const complete = filled.map((b) => bands[b].slot as Slot);
	const flips = filled.map((b) => bands[b].flipped);

	const save = useCallback(async () => {
		if (complete.length !== BANDS.length) return;
		setSaving(true);
		try {
			await saveFrankenportrait(complete, flips);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setSaving(false);
		}
	}, [complete, flips]);

	const anyBusy = searching || BANDS.some((b) => bands[b].loading);

	return (
		<div className="min-h-screen p-4 sm:p-8 max-w-2xl mx-auto">
			<header className="mb-6 flex items-baseline justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold">Frankenportrait</h1>
					<p className="text-neutral-300 text-sm mt-1">
						One face from three museum portraits, cut on the eyes and mouth and
						served straight from IIIF.
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowAbout((v) => !v)}
					className="shrink-0 text-sm text-neutral-300 hover:text-white underline"
				>
					{showAbout ? "Back" : "About"}
				</button>
			</header>

			{showAbout && <About onBack={() => setShowAbout(false)} />}
			{!showAbout && (
				<>
					<form
						className="flex gap-2 mb-6"
						onSubmit={(e) => {
							e.preventDefault();
							void loadPool(query);
						}}
					>
						<label htmlFor="q" className="sr-only">
							Search the collections
						</label>
						<input
							id="q"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="flex-1 rounded bg-neutral-800 px-3 py-2 text-sm"
							placeholder="portrait"
						/>
						<button
							type="submit"
							disabled={anyBusy}
							className="rounded bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-white disabled:opacity-50"
						>
							Search
						</button>
					</form>

					{error && (
						<p role="alert" className="mb-4 text-sm text-amber-300">
							{error}
						</p>
					)}

					<div className="overflow-hidden rounded-lg border border-neutral-700">
						{BANDS.map((band) => (
							<SlotStrip
								key={band}
								slot={bands[band].slot}
								loading={bands[band].loading || searching}
								tried={bands[band].tried}
								failed={
									!searching &&
									!bands[band].loading &&
									bands[band].slot === null
								}
								flipped={bands[band].flipped}
								label={LABELS[band]}
								onReroll={() => void rerollBand(band)}
								onFlip={() => flipBand(band)}
							/>
						))}
					</div>

					<div className="mt-4 flex items-center justify-between gap-4">
						<button
							type="button"
							onClick={() => void shuffleAll()}
							disabled={anyBusy || !pool.length}
							className="rounded bg-neutral-100 px-5 py-2 font-semibold text-neutral-900 hover:bg-white disabled:opacity-50"
						>
							{anyBusy ? "Stitching…" : "Shuffle all"}
						</button>
						<button
							type="button"
							onClick={() => void save()}
							disabled={anyBusy || saving || complete.length !== BANDS.length}
							className="rounded border border-neutral-500 px-5 py-2 font-semibold hover:bg-neutral-800 disabled:opacity-50"
						>
							{saving ? "Saving…" : "Save"}
						</button>
						<p className="ml-auto text-xs text-neutral-400">
							{searching
								? "Searching…"
								: `${pool.length} portraits in the pool`}
						</p>
					</div>
				</>
			)}
		</div>
	);
}
