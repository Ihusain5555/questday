// One-off: regenerate the QuestDay app icon at high resolution, CRISP, with zero
// new deps. It renders the exact brand mark — a #7C5CFF circle + a white Clash
// Display Bold "Q" — onto an HTML <canvas> inside a HEADLESS Electron window and
// exports a transparent PNG via canvas.toDataURL (so alpha is preserved cleanly).
//
// Why Electron and not a browser: Playwright here drives Electron and there is no
// standalone Chrome installed, but `electron` itself is a devDependency — so we
// reuse it as the renderer. The bundled Clash Display Bold woff2 is inlined as a
// base64 @font-face so the glyph matches the app exactly.
//
// Usage (CommonJS so require() works under "type":"module"):
//   node node_modules/electron/cli.js scripts/_gen-icon.cjs \
//     --out=resources/icon.png --size=1024 --font=660 --dy=28 --ratio=0.965
// Tunables let me match the original Q size/baseline by eye without editing code.
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const os = require('os')
const path = require('path')

const root = process.cwd()
const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`))
  return hit ? hit.slice(k.length + 3) : d
}

const OUT = path.resolve(root, arg('out', 'resources/icon-1024.png'))
const SIZE = Number(arg('size', '1024'))
const FONT = Number(arg('font', '660')) // Q font-size in px
const DY = Number(arg('dy', '28')) // vertical nudge so the glyph sits centered
const RATIO = Number(arg('ratio', '0.965')) // circle diameter as fraction of canvas
const COLOR = arg('color', '#7C5CFF')

const fontPath = path.join(root, 'src/renderer/assets/fonts/ClashDisplay-Bold.woff2')
const fontB64 = fs.readFileSync(fontPath).toString('base64')

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'Clash Display';src:url(data:font/woff2;base64,${fontB64}) format('woff2');font-weight:700;font-style:normal;}
html,body{margin:0;padding:0;background:transparent;}
canvas{display:block;}
</style></head><body>
<canvas id="c" width="${SIZE}" height="${SIZE}"></canvas>
<script>
window.__done=false; window.__png=null; window.__err=null;
(async()=>{
  try{
    await document.fonts.load("700 ${FONT}px 'Clash Display'");
    await document.fonts.ready;
    const c=document.getElementById('c'); const x=c.getContext('2d');
    x.clearRect(0,0,${SIZE},${SIZE});
    // brand circle
    x.fillStyle='${COLOR}';
    x.beginPath();
    x.arc(${SIZE / 2}, ${SIZE / 2}, ${(SIZE / 2) * RATIO}, 0, Math.PI*2);
    x.fill();
    // white Q in the real brand font
    x.fillStyle='#FFFFFF';
    x.font="700 ${FONT}px 'Clash Display'";
    x.textAlign='center'; x.textBaseline='middle';
    x.fillText('Q', ${SIZE / 2}, ${SIZE / 2 + DY});
    window.__png=c.toDataURL('image/png');
    window.__done=true;
  }catch(e){ window.__err=String(e); window.__done=true; }
})();
</script></body></html>`

const tmp = path.join(os.tmpdir(), 'qd-icon-gen.html')
fs.writeFileSync(tmp, html)

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    webPreferences: { offscreen: false }
  })
  await win.loadFile(tmp)
  let png = null
  let err = null
  for (let i = 0; i < 120; i++) {
    const done = await win.webContents.executeJavaScript('window.__done===true').catch(() => false)
    if (done) {
      png = await win.webContents.executeJavaScript('window.__png').catch(() => null)
      err = await win.webContents.executeJavaScript('window.__err').catch(() => null)
      break
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  if (err) console.log('RENDER ERROR:', err)
  if (png) {
    const buf = Buffer.from(png.split(',')[1], 'base64')
    fs.writeFileSync(OUT, buf)
    console.log(`wrote ${OUT} (${buf.length} bytes)  size=${SIZE} font=${FONT} dy=${DY} ratio=${RATIO}`)
  } else {
    console.log('FAILED: no PNG produced')
    process.exitCode = 1
  }
  app.quit()
})
