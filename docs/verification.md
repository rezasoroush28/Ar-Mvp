# Verification record

Date: November 15, 2026 (Asia/Tehran).

## Completed locally

- TypeScript strict check and Vite production build under `/Ar-Mvp/`.
- GLB v2 header and file length; 67-joint skin, joint/weight attributes, 201 animation channels, unchanged 8.0333338-second duration and 131,966 triangles; replaceable CRT screen retained.
- Chromium 145, Windows desktop, mobile viewport 412 × 915. Six browser scenarios pass locally and on the Linux GitHub Actions runner: fallback controls and animation; denied camera/retry/fallback; failed GLB fetch/retry; actual barcode detection/pose movement/loss/reacquisition, paused animation on loss, rendered geometry, stopped media tracks on exit, AR restart and navigation cleanup; leaving while camera permission is pending, with a late stream safely stopped; and failed tracker download during a pending prompt, with recovery and no leaked capture.
- Real detector uses generated SVG frames through a canvas `captureStream` video. It is not a mocked marker-found callback. Tests validate a nonzero negative camera-space Z, moving X position, and more than 100,000 rendered triangles. The current fixture uses the complete printable AR card, including its adjacent QR and instructions.
- Visual screenshots checked for Joy, seated typing pose, original dark-brown furniture, lamp, CRT, face/eyes, and preserved model geometry. Soft contact shadows replace the source's expensive dynamic shadow map.
- Default-muted audio can be enabled through a user gesture. Synthesized clicks reuse the 28 source timestamps and pause on loss/exit.
- `npm audit`: zero known vulnerabilities after pinned Axios and esbuild overrides and patched Vite.

## Deployment

Pages uses GitHub Actions, on `main`, with HTTPS enforced. The official workflow runs build and browser checks before deployment. [Successful deployment and all six browser checks](https://github.com/rezasoroush28/Ar-Mvp/actions/runs/43709723186) published https://rezasoroush28.github.io/Ar-Mvp/. The homepage, printable marker page, SVG, calibration, runtime GLB, credits, and unmodified tracker download returned HTTP 200. The GLB response uses `model/gltf-binary`. The landing and viewer scripts, CSS, embedded WASM/decoder and calibration load from the same `/Ar-Mvp/` origin/path.

## Device limitations

No Samsung Galaxy A55 was attached. Actual rear-camera selection, optics/calibration accuracy, measured physical size/alignment, permission UI, audio perception, thermal behavior, and sustained 30 FPS need the physical checklist in README. Desktop software-renderer FPS is not an A55 measurement. Synthetic fixture testing verifies the implementation and integration, not real-world lighting, marker distance, occlusion, or lens performance.

## Deployed cold/warm measurement

Measured at the live HTTPS URL, with runtime from commit `9b6461a`, Chromium 145 on Windows, Intel Core i7-12700K, **ANGLE SwiftShader software rendering**, 412 × 915 mobile viewport, DPR 1.5, **4× CPU slowdown**, and CDP network shaping at **10 Mbps download / 2 Mbps upload / 80 ms latency**. One cold/warm pair per mode, not statistical percentiles. Warm visits reload in the same browser context with HTTP cache enabled. AR uses an SVG canvas camera fixture; camera-ready time excludes a human permission decision and real hardware startup. All times below start at the button tap and include lazy viewer download/initialization.

| Measurement | 3D cold | 3D warm | AR fixture cold | AR fixture warm |
| --- | ---: | ---: | ---: | ---: |
| Asset transfer bytes | 1,149,914 | 0 | 1,454,891 | 0 |
| Camera ready | — | — | 735 ms | 176 ms |
| Model decoded and ready | 2,635 ms | 192 ms | 3,898 ms | 570 ms |
| Tracker ready | — | — | 4,141 ms | 393 ms |
| First rendered scene frame | 2,827 ms | 368 ms | 4,412 ms | 781 ms |
| First marker detection → scene frame | — | — | 199 ms | 345 ms |
| Representative frame rate | 17.4 FPS | 19.7 FPS | 12.6 FPS | 12.4 FPS |

Transfers are Resource Timing entries (compiled scripts/CSS, model, calibration, fixture image); the navigation HTML is excluded. Zero warm transfer indicates browser-cache reuse, not zero decode/render cost. Rendered frame timing records the return from the first `renderer.render` with visible geometry; actual display presentation can be later. FPS is a representative one-second window after a 3.5-second settle, not sustained thermal performance. There are 19 render calls (16 model + CRT + 2 contact shadows) and 131,972 rendered triangles.

**The 30 FPS target was not reached on this intentionally throttled software renderer. This is not a Galaxy A55 result.** Actual A55 GPU rendering and two-minute thermal/FPS testing remain unverified. No texture-upload bottleneck has been established on the phone; KTX2 remains deferred pending those measurements.

Raw per-resource transfer/duration, GPU and browser strings, and app timings: [load-benchmark.json](load-benchmark.json). Reproduce with a built preview or the deployment:

```sh
node scripts/benchmark.mjs https://rezasoroush28.github.io/Ar-Mvp/
```

The untouched local source copy was SHA-256 matched to the supplied file: `FC4315A6C3E816DD3FBAD5CE21DABD1D603C3695B5130EAE29CFE25CF23F39E5`. `scripts/reference-preview.mjs` renders that original HTML locally for visual comparison without publishing it.

## Scan-to-website card

The experience is entirely web-based; no application installation is required. A seventh browser scenario verifies that both the standalone QR PNG and QR within the complete printable card decode to `https://rezasoroush28.github.io/Ar-Mvp/?ar=1`. That URL shows a focused browser entry with Start AR and instructions. The camera is requested only after the button tap. Print layout preserves the card at 180 × 210 mm, including the unchanged 80 mm tracking square and its quiet border. The QR opens the website; the large barcode anchors Joy on the same card. Native phone-camera QR recognition and actual phone tracking remain physical checks.

## Base alignment and perspective

The base is measured from vertices near the lowest static floor/plinth, excluding character skin bounds and overhead objects. Its bottom is placed at marker-plane Y=0, its footprint center at marker XZ=(0,0), and its longest footprint dimension fitted to 0.080 m with uniform scale. The 3D fallback uses 0.160 m. The CRT overlay is assembled before placement so its coordinates are not scaled twice.

An eighth browser scenario feeds the actual tracker perspective-rendered camera frames from a known pinhole camera and verifies that projected marker-plane corners stay within 4 processing pixels of the physical target across flat view, pitch up to 55°, yaw up to 40°, roll up to 35°, 0.32–0.40 m distance, and lateral/vertical movement. It checks the surface normal, zero base height, centered footprint, and identical video/WebGL cover transforms after viewport rotation. Camera calibration is intercepted with a matching ideal camera for this controlled geometry test; it does not validate the Galaxy A55's lens calibration. Production still uses bundled generic calibration and needs the real-phone check.

Only subpixel pose changes are smoothed; larger movements use the latest pose immediately. Append `?debug=1` to expose `window.joyTracking` with detected/projected corners, surface normal, and base bounds for alignment diagnostics. The normal user flow does not display these internals. The model remains marker-relative while the marker is visible, hides after loss, and reacquires on return.
