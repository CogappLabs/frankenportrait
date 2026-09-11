import type { Slot } from "../lib/shuffle";

type Props = {
	slot: Slot | null;
	loading: boolean;
	/** Candidates rejected so far while hunting for a face in this band. */
	tried: number;
	failed: boolean;
	onReroll: () => void;
	label: string;
};

export function SlotStrip({
	slot,
	loading,
	tried,
	failed,
	onReroll,
	label,
}: Props) {
	const credit = slot
		? `${slot.title}${slot.artist ? ` · ${slot.artist}` : ""} · ${slot.provider}`
		: "";

	return (
		<div className="group relative bg-neutral-800 min-h-24">
			{slot && !loading ? (
				<img
					src={slot.url}
					alt={`${label} from ${slot.title}`}
					className="w-full block"
				/>
			) : (
				<div
					className="w-full h-28 bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 bg-[length:200%_100%] animate-pulse"
					role="status"
					aria-live="polite"
					aria-label={
						loading ? `Looking for a face for ${label}` : `${label} empty`
					}
				/>
			)}

			{loading && (
				<p className="absolute inset-0 flex items-center justify-center text-xs text-neutral-300">
					{tried > 1 ? `Checking portrait ${tried}…` : `Finding ${label}…`}
				</p>
			)}

			{failed && !loading && (
				<p className="absolute inset-0 flex items-center justify-center text-xs text-amber-300">
					No face found for {label}. Reroll or try another search.
				</p>
			)}

			<div className="absolute inset-0 flex items-center justify-between gap-2 p-2 opacity-0 focus-within:opacity-100 group-hover:opacity-100 transition-opacity bg-neutral-950/70">
				<p className="text-xs leading-tight min-w-0">
					<span className="font-semibold">{label}</span>
					{slot ? (
						<>
							{" · "}
							{slot.pageUrl ? (
								<a
									href={slot.pageUrl}
									target="_blank"
									rel="noreferrer"
									className="text-neutral-300 underline hover:text-white"
								>
									{credit}
								</a>
							) : (
								<span className="text-neutral-300">{credit}</span>
							)}
						</>
					) : null}
				</p>
				<button
					type="button"
					onClick={onReroll}
					disabled={loading}
					className="shrink-0 rounded bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-900 hover:bg-white disabled:opacity-50"
				>
					{loading ? "…" : "Reroll"}
				</button>
			</div>
		</div>
	);
}
