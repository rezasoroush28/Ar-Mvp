import './style.css';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let mode: 'ar' | '3d' = '3d';
let generation = 0;
let session: import('./viewer').Viewer | undefined;
let viewerPromise: Promise<import('./viewer').Viewer> | undefined;
const status = (message: string) => { $('notice').textContent = message; };
function viewer() {
  return viewerPromise ??= import('./viewer').then(({ Viewer }) => session = new Viewer($('stage'), status)).catch(e => { viewerPromise = undefined; throw e; });
}
async function open(next: typeof mode) {
  const startedAt = performance.now();
  const request = ++generation;
  mode = next;
  $('landing').hidden = true; $('viewer').hidden = false; $('error').hidden = true;
  $('mode-label').textContent = next === 'ar' ? 'JOY IN YOUR WORLD' : 'JOY AT WORK · 3D';
  $('hint').textContent = next === 'ar' ? 'Keep the entire printed marker in view' : 'Drag to orbit · Pinch or scroll to zoom';
  $('reset').hidden = next === 'ar';
  status(next === 'ar' ? 'Opening camera & loading Joy…' : 'Loading Joy’s little world…');
  try {
    const v = await viewer();
    if (request !== generation) return;
    await v.start(next, startedAt);
    if (request !== generation) return;
    $('pause').textContent = 'Pause'; $('pause').setAttribute('aria-pressed','false');
    $('sound').textContent = 'Sound off'; $('sound').setAttribute('aria-pressed','false');
    document.documentElement.dataset.ready = 'true';
  } catch (error) {
    if (request !== generation) return;
    session?.stop();
    const name = error instanceof Error ? error.name : '';
    $('error-title').textContent = name === 'NotAllowedError' ? 'Your camera is taking a break.' : name === 'NotFoundError' ? 'No camera found.' : 'The scene couldn’t open.';
    $('error-message').textContent = name === 'NotAllowedError'
      ? 'In Chrome, tap the site controls beside the address, allow Camera, then try again. You can also explore in 3D without a camera.'
      : name === 'NotFoundError' ? 'Connect a camera, or explore the same scene in 3D.'
      : `Check your connection and try again. ${error instanceof Error ? error.message : 'A browser with WebGL is required.'}`;
    $('fallback').hidden = next === '3d'; $('error').hidden = false; status('');
    $('retry').focus();
  }
}
function exit() {
  ++generation; session?.stop();
  $('viewer').hidden = true; $('landing').hidden = false; $('error').hidden = true;
  delete document.documentElement.dataset.ready;
  $('start').focus();
}
$('start').onclick = () => void open('ar');
$('view').onclick = $('fallback').onclick = () => void open('3d');
$('retry').onclick = () => void open(mode);
$('exit').onclick = $('error-exit').onclick = exit;
$('sound').onclick = async () => {
  try { const enabled = await session?.toggleSound(); $('sound').textContent = enabled ? 'Sound on' : 'Sound off'; $('sound').setAttribute('aria-pressed', String(!!enabled)); }
  catch { status('Audio is unavailable in this browser. The animation still plays.'); }
};
$('pause').onclick = () => {
  const paused = session?.togglePause(); $('pause').textContent = paused ? 'Play' : 'Pause'; $('pause').setAttribute('aria-pressed',String(!!paused));
};
$('reset').onclick = () => session?.resetView();
if(new URLSearchParams(location.search).get('ar')==='1'){
  $('landing').classList.add('scan-entry');
  document.querySelector('h1')!.textContent='Your little world is ready.';
  document.querySelector('.lede')!.textContent='Tap Start AR, allow your camera, then point at the large black square on your printed card. Joy will appear on that square.';
  document.querySelector('.privacy')!.textContent='100% in your browser. Nothing to install. Camera stays on your device.';
}
addEventListener('pagehide', exit);
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('viewer').hidden) exit(); });
document.addEventListener('visibilitychange', () => {
  // Stop capture when switching apps. Returning offers a deliberate restart.
  if (document.hidden && mode === 'ar' && !$('viewer').hidden) exit();
});
