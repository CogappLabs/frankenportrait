# Frankenportrait

**https://cogapplabs.github.io/frankenportrait/**

Three museum portraits, cut into eye, nose and mouth bands and stacked into one
face. Every crop is a IIIF Image API request; nothing is downloaded or
re-hosted.

Sources: [Wellcome Collection](https://wellcomecollection.org) (CC-BY, CC0 and
public domain only) and the [Getty Museum](https://www.getty.edu/art/collection/)
(open content only).

## How the bands are cut

Even horizontal thirds only line up when every sitter is framed identically,
which they never are. Each candidate runs through MediaPipe BlazeFace in the
browser, and cuts are placed off the returned eye and mouth keypoints rather
than off image height, with the slice width scaled to the distance between the
eyes. A portrait with no detectable face is skipped and another drawn.

## Develop

```sh
npm ci
npm run dev
```

`npm run build` typechecks and bundles; `npm run lint` runs Biome.

## Deploy

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. No secrets and no server: search, face detection
and composition all happen in the browser.
