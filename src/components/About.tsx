const SOURCES = [
	{
		name: "Wellcome Collection",
		url: "https://wellcomecollection.org",
		api: "catalogue/v2/works",
		note: "Filtered to CC-BY, CC0 and public domain only, since the stitched image is a derivative you download.",
	},
	{
		name: "Getty Museum",
		url: "https://www.getty.edu/art/collection/",
		api: "search/api/search",
		note: "Filtered to open-content records with unrestricted image sizes.",
	},
];

export function About({ onBack }: { onBack: () => void }) {
	return (
		<div className="prose-invert max-w-none text-sm leading-relaxed space-y-6">
			<button
				type="button"
				onClick={onBack}
				className="text-neutral-300 hover:text-white underline"
			>
				← Back
			</button>

			<section className="space-y-3">
				<h2 className="text-xl font-bold">What this is</h2>
				<p>
					Three portraits from two museum collections, cut into an eye band, a
					nose band and a mouth band, and stacked into one face. Reroll any band
					on its own, or shuffle all three.
				</p>
			</section>

			<section className="space-y-3">
				<h2 className="text-xl font-bold">The cropping is all IIIF</h2>
				<p>
					Every crop is a{" "}
					<a
						className="underline"
						href="https://iiif.io/api/image/3.0/"
						target="_blank"
						rel="noreferrer"
					>
						IIIF Image API 3.0
					</a>{" "}
					request. No image is copied or re-hosted: the band you see is a URL of
					the form
				</p>
				<code className="block bg-neutral-800 rounded p-3 text-xs overflow-x-auto">
					{"{service}/{x},{y},{w},{h}/900,/0/default.jpg"}
				</code>
				<p>
					The region is computed per image, the server does the cropping, and
					both collections serve <code>level2</code> endpoints with
					<code> access-control-allow-origin: *</code>, so it works from the
					browser with no proxy and no API key.
				</p>
			</section>

			<section className="space-y-3">
				<h2 className="text-xl font-bold">How the bands are cut</h2>
				<p>
					Naive horizontal thirds only work when every sitter is framed
					identically, which they never are: a bust fills the frame, a
					full-length portrait puts the head in the top eighth. So each
					candidate is run through{" "}
					<a
						className="underline"
						href="https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector"
						target="_blank"
						rel="noreferrer"
					>
						MediaPipe BlazeFace
					</a>{" "}
					in the browser, which returns eye, nose and mouth keypoints.
				</p>
				<p>
					Cuts are placed off those keypoints rather than off image height, and
					the slice width is scaled to the distance between the eyes, so
					features land on features whatever the original framing. A portrait
					with no detectable face is skipped and another drawn, which is why a
					band sometimes checks several before it settles.
				</p>
			</section>

			<section className="space-y-3">
				<h2 className="text-xl font-bold">Sources</h2>
				<ul className="space-y-2">
					{SOURCES.map((s) => (
						<li key={s.name}>
							<a
								className="underline font-semibold"
								href={s.url}
								target="_blank"
								rel="noreferrer"
							>
								{s.name}
							</a>{" "}
							<span className="text-neutral-400">({s.api})</span>
							<br />
							<span className="text-neutral-300">{s.note}</span>
						</li>
					))}
				</ul>
				<p className="text-neutral-300">
					Each search draws several pages from a random offset, so the same term
					gives a different pool each time. Rights and credit for every band are
					shown on hover, and the underlying works stay with their institutions.
				</p>
			</section>

			<section className="space-y-3">
				<h2 className="text-xl font-bold">Built with</h2>
				<p className="text-neutral-300">
					React, Vite, Tailwind and TypeScript, on GitHub Pages. There is no
					server: the browser does the searching, the face detection and the
					stitching. Save draws the three bands onto a canvas and hands you a
					JPEG.
				</p>
			</section>
		</div>
	);
}
