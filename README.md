# Joy at work — marker AR MVP

[Open the website](https://rezasoroush28.github.io/Ar-Mvp/) · [Print AR card](https://rezasoroush28.github.io/Ar-Mvp/marker.html) · [Credits](https://rezasoroush28.github.io/Ar-Mvp/credits.html)

**This is entirely web-based. There is no app to install.** Print the AR card, scan its small QR with the phone camera, open the website in Chrome, tap Start AR and allow Camera, then point at the large square barcode on the same card. Joy appears on that large square. The small QR opens `https://rezasoroush28.github.io/Ar-Mvp/?ar=1`; the large square supplies continuous spatial tracking. The QR and tracking barcode have separate jobs. The browser still requires camera permission.

A mobile-first, static TypeScript/Vite/Three.js app. **Start AR** opens the rear camera and continuously follows an ARToolKit matrix marker. **View 3D** uses the same decoded model, typing loop, animated CRT, lamp lighting, and optional keyboard clicks without camera permission. Sound starts muted. All processing stays in the browser.

## Run and build

Node.js 24 LTS:

```sh
npm ci
npm run dev
# http://127.0.0.1:5173/Ar-Mvp/
npm run build
npx playwright install chromium
npm test
npm run preview
```

On Windows PowerShell with script execution disabled, use `npm.cmd` and `npx.cmd`. Camera requires HTTPS or localhost; a phone cannot access camera through an ordinary LAN HTTP address. Use the deployed HTTPS URL for phone tests.

The repository was empty, with `main` configured as its default branch. There was no .NET host to preserve. GitHub Pages serves the Vite static output independently; no ASP.NET Core runtime, API, account, database, or CDN is required. An ASP.NET Core host can serve `dist` as static files, but is unnecessary for this MVP.

## Print and place

Print `public/marker.html` on matte white A4 paper at **100% / Actual size**; disable Fit to page and browser headers/footers. The complete printable card is `public/ar-card.svg` (180 × 210 mm), also provided as PNG. Measure the **outside black square: exactly 80 × 80 mm**. The standalone marker SVG is 120 × 120 mm including a 20 mm white quiet margin on each side. Keep the white border, avoid glare, and do not crop the black corners. `scripts/make-ar-card.mjs` regenerates the QR and combined card during every build, without adding a QR library to the browser bundle.

- Fixed family: **ARToolKit 3×3**, ID **5**, pattern ratio **0.5**.
- Physical tracked width: **0.080 m**, excluding the white margin.
- `public/marker.svg` contains the exact binary cells; it is a square spatial target, not a QR/UPC scan.
- `src/tracker.ts` uses AR.js's ARToolKit5 core `@ar-js-org/artoolkit5-js@0.3.2` directly with `three@0.185.1`. The native pose binding takes an **integer** width: pass **80 mm**, then convert only the matrix translation to meters. Passing `0.08` directly truncates to zero and produces an invalid pose. The regression fixture checks nonzero position, movement, and rendered geometry.
- Marker pose is converted from ARToolKit camera axes to Three.js, with the marker plane at XZ and +Y pointing off the paper. A parent `anchor` owns pose; a separate child owns model scale/offsets. In AR, the lowest static floor/plinth geometry is measured and centered, its bottom placed exactly at Y=0, and its footprint uniformly fitted within the **80 mm marker square**. The 3D fallback keeps a 0.16 m footprint. Marker dimensions are configured in `src/marker-config.ts`.
- Source bounds are X `[-1.1300, 0.7300]`, Y `[-0.0710, 1.6400]`, Z `[-0.4082, 0.9682]`. The measured bottom is placed at Y=0, and the bounds' XZ center is placed over the marker. Original scene orientation is preserved.
- Moving poses update directly from the detected rectangle so camera-coordinate smoothing does not make the base trail behind the paper. Only motion below 1.5 processing pixels is smoothed to suppress stationary jitter. A 140 ms loss grace reduces flicker. Animation, CRT updates, and keyboard sounds pause when detection stops. The scene hides after the grace and resumes on reacquisition. This is marker-relative tracking: the marker must remain in view; it does not promise off-screen world tracking.
- Rear camera requests 640×480 at up to 30 FPS. Tracking caps the longest processing edge at 640 px and runs at most 30 Hz. Video and overlay use the same aspect-preserving cover crop. DPR is capped at 1.5. Generic calibration is bundled; phone-specific lens calibration has not been performed.

## Source and optimization

The supplied `Joy-Coding (3).html` was copied untouched to ignored `source/Joy-Coding.html` and its embedded GLB extracted to `source/joy-original.glb`. This preserves the latest supplied scene, not a reconstructed substitute. The HTML's lighting, 28 keyboard event timestamps, CRT editor drawing code, and audio synthesis are ported to the shared viewer. The 8.0333338 s clip drives both hands and the screen/audio timeline.

To reproduce from a copy of the supplied HTML:

```sh
# Put the supplied HTML at source/Joy-Coding.html first.
node scripts/inspect-source.mjs
npm run assets
npm run build
```

The scripts verify the GLB v2 header, skin/joints, weights, animation channels/duration, triangle count, and replaceable screen. glTF Transform deduplicates/prunes, resamples redundant keys, welds, flattens static hierarchy, joins compatible static primitives (excluding the skinned character and CRT screen), and applies Meshopt quantization/compression. Sharp encodes sRGB WebP at quality 88, up to 1024 px. Files receive a SHA-256 content suffix; the matching Meshopt decoder is bundled from the pinned Three.js release. `package-lock.json` pins the dependency tree; one renderer and one tracker are used.

| Metric | Extracted source | Mobile runtime |
| --- | ---: | ---: |
| GLB bytes | 15,528,876 | **1,641,120 (1.64 MB / 1.57 MiB)** |
| Triangles | 131,966 | 131,966 |
| Model draw calls | 127 | **16** |
| Nodes | 1,040 | 83 |
| Skin joints | 67 | 67 |
| Animation channels | 201 | 201 |
| Animation sampler keys | 12,591 | 4,293 |
| Clip duration | 8.0333338 s | 8.0333338 s |
| Textures | 5; 1254² and 2048² | 5; 1024² WebP |
| Estimated RGBA memory, including mipmaps | 93.3 MiB | 26.7 MiB |

The result is below the 3–5 MB goal without triangle simplification. Texture downsampling is the main visual tradeoff; geometry, face topology, bones, weights, duration, and seated pose remain. Static joining costs ~0.15 MB versus the unjoined optimized version, in exchange for 111 fewer model draw calls. Three extra calls draw the CRT and soft contact shadows. Dynamic shadow maps are disabled in favor of the source's inexpensive contact shadows. The overhead spotlight remains. KTX2 was deferred: five 1024 px textures use about 27 MiB plus a 1.7 MiB CRT canvas, with no measured phone upload bottleneck yet; adding a transcoder is not justified by current evidence. Revisit on actual device if upload or thermal behavior warrants it.

Raw measurements are in `docs/asset-metrics.json` and are also published at `asset-metrics.json`. `window.joyMetrics` exposes camera/model/tracker-ready time, first rendered scene frame, marker-to-frame delay, representative FPS, draw calls, triangles, and anchor position. Times are milliseconds since the user starts a mode; cached resources are reused within a tab. Failed model requests clear the shared promise and can retry. Exit, navigation, and switching away from an AR tab stop camera tracks. Paused/hidden content stops animation and sound.

At the deployed URL, the synthetic AR fixture reached its first scene frame in **4.41 s cold / 0.78 s warm**, transferring about **1.45 MB / 0 asset bytes**. Conditions: Chromium 145, i7-12700K, SwiftShader software GPU, DPR 1.5, 4× CPU slowdown, 10 Mbps and 80 ms latency. Representative AR FPS was **12.4–12.6**; this throttled desktop simulation did not meet 30 FPS and does not establish A55 performance. [Full results and limitations](docs/verification.md).

## Deployment and validation

`.github/workflows/pages.yml` runs `npm ci`, type and asset checks, the static build, Chromium installation, and browser tests before publishing with the official GitHub Pages actions. The Vite base is `/Ar-Mvp/`; model, calibration, Meshopt decoder, embedded tracker WASM, CSS, and JS are served from this origin and path. No external worker/decoder fetch is needed by the selected barcode path. Pages is configured to use GitHub Actions.

Browser coverage includes mobile layout/initial lazy loading; fallback animation, orbit/zoom, pause, sound toggle; denied permission and retry; failed model fetch/retry; actual ARToolKit decoding of an SVG-backed canvas camera stream; valid moving pose, loss, reacquisition, animation pause, rendered geometry, and camera-track cleanup. The synthetic camera is a fixture, not a test of a real rear camera or optical quality. See `docs/verification.md` for measured load results and remaining phone checks.

### Galaxy A55 / Chrome physical checklist

1. Open the HTTPS app, print and measure the 80 mm marker, and tap Start AR. Allow Camera.
2. Keep all corners visible at about 35–60 cm; tilt the phone to see Joy's face, hands, feet on the step, dark-brown furniture, CRT, and overhead lamp. Confirm the base stays on the paper as the phone moves, rotates, and changes distance.
3. Move/rotate the paper. Cover it, then reveal it: scene and typing pause/hide and return without jumping or stale audio.
4. Turn sound on/off. Confirm keyboard clicks follow the hands/CRT and stop on pause/loss.
5. Leave AR, switch tabs/apps, and navigate away; verify the camera indicator turns off. Reopen. Deny permission and follow recovery; test View 3D with camera denied.
6. In View 3D, drag and pinch, reset, pause/play. Repeat on a cold connection and after a warm reload. Check scene quality and sustained FPS/thermal behavior for at least two minutes. **A55 hardware, actual camera pose/scale, and stable 30 FPS remain to be measured on the phone.**

## Credits and licenses

The four source models are CC BY 4.0 according to their Sketchfab metadata verified November 15, 2026: [Joy — Guilherme Navarro](https://sketchfab.com/3d-models/joy-inside-out-61b8f917ff2648bcb18df5d41b11103d), [chair — shaqsh](https://sketchfab.com/3d-models/old-soviet-chair-f22abd940288406b9f3079a4ee91b53c), [PC — Yolala1232 / Yolala3D | Y3D](https://sketchfab.com/3d-models/gaming-desktop-pc-d1d8282c9916438091f11aeb28787b66), [lamp — PolyDavid](https://sketchfab.com/3d-models/ceiling-light-round-8ccf88710fd34a4bb671a26f3c035111). Source modifications are described in `public/credits.html`. The SVG cells match the ARToolKit 3×3 ID 5 standard, cross-checked with [the barcode collection](https://github.com/nicolocarpignoli/artoolkit-barcode-markers-collection/blob/master/3x3/5.png) and decoded by the real tracker in tests.

Published `credits.html` and `licenses/` retain attribution and licenses for Three.js, ARToolKit, Meshoptimizer, and glTF Transform. The unmodified tracker distribution and exact corresponding source revision are linked there. Application code is MIT; the GLB retains CC BY 4.0 and the tracker retains its LGPL terms.
