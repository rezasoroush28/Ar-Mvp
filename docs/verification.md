# Verification record

Date: November 15, 2026 (Asia/Tehran).

## Completed locally

- TypeScript strict check and Vite production build under `/Ar-Mvp/`.
- GLB v2 header and file length; 67-joint skin, joint/weight attributes, 201 animation channels, unchanged 8.0333338-second duration and 131,966 triangles; replaceable CRT screen retained.
- Chromium 145, Windows desktop, mobile viewport 412 × 915. Five browser scenarios pass: fallback controls and animation; denied camera/retry/fallback; failed GLB fetch/retry; actual barcode detection/pose movement/loss/reacquisition, paused animation on loss, rendered geometry, stopped media tracks on exit, AR restart and navigation cleanup; and leaving while camera permission is pending, with a late stream safely stopped.
- Real detector uses generated SVG frames through a canvas `captureStream` video. It is not a mocked marker-found callback. Tests validate a nonzero negative camera-space Z, moving X position, and more than 100,000 rendered triangles.
- Visual screenshots checked for Joy, seated typing pose, original dark-brown furniture, lamp, CRT, face/eyes, and preserved model geometry. Soft contact shadows replace the source's expensive dynamic shadow map.
- Default-muted audio can be enabled through a user gesture. Synthesized clicks reuse the 28 source timestamps and pause on loss/exit.
- `npm audit`: zero known vulnerabilities after pinned Axios and esbuild overrides and patched Vite.

## Deployment

Pages uses GitHub Actions, on `main`, with HTTPS enforced. The official workflow runs build and browser checks before deployment. [Successful deployment](https://github.com/rezasoroush28/Ar-Mvp/actions/runs/43709083728) published https://rezasoroush28.github.io/Ar-Mvp/. The homepage, printable marker page, SVG, calibration, runtime GLB, credits, and unmodified tracker download returned HTTP 200. The GLB response uses `model/gltf-binary`. The landing and viewer scripts, CSS, embedded WASM/decoder and calibration load from the same `/Ar-Mvp/` origin/path.

## Device limitations

No Samsung Galaxy A55 was attached. Actual rear-camera selection, optics/calibration accuracy, measured physical size/alignment, permission UI, audio perception, thermal behavior, and sustained 30 FPS need the physical checklist in README. Desktop software-renderer FPS is not an A55 measurement. Synthetic fixture testing verifies the implementation and integration, not real-world lighting, marker distance, occlusion, or lens performance.
