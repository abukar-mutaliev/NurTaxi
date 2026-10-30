/**
 * Метки карты в палитре «Слива и пудра» → base64 в `map-marker.assets.ts`.
 *
 *   node brand/build-map-markers.mjs
 *
 * Геометрия растра прежняя до пикселя (её читают якоря в `map-marker.constants.ts`):
 * пин 144×180 px — круг Ø132 с белой обводкой 9 px, центр (72, 66); под ним точка Ø36 с
 * обводкой 6 px, центр (72, 162) — она и ложится на координату. Машина — капсула 156×78.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'mobile/packages/shared-core/widgets/map/ui/map-marker.assets.ts');

const P = '#6B3A5B';
const S = '#D8A7B1';
const BG = '#FBF6F4';
const T = '#2A2127';
const WHITE = '#FFFFFF';
const SHADOW = 'rgba(42, 33, 39, 0.24)';

const chrome =
  process.env.CHROME_PATH ??
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ].find((path) => existsSync(path));
if (!chrome) throw new Error('Не найден Chrome/Edge: задайте CHROME_PATH');

const bold = pathToFileURL(
  join(root, 'mobile/node_modules/@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf'),
).href;
const work = mkdtempSync(join(tmpdir(), 'nur-markers-'));

function pin({ fill, content, dot }) {
  return `
    <div style="position:absolute;left:6px;top:0;width:132px;height:132px;box-sizing:border-box;border-radius:50%;
      background:${fill};border:9px solid ${WHITE};filter:drop-shadow(0 3px 3px ${SHADOW});
      display:flex;align-items:center;justify-content:center">${content}</div>
    <div style="position:absolute;left:54px;top:144px;width:36px;height:36px;box-sizing:border-box;border-radius:50%;
      background:${dot};border:6px solid ${WHITE}"></div>`;
}

const letter = (char, color) =>
  `<span style="font-family:ManropeBold;font-size:62px;line-height:1;color:${color};margin-top:-4px">${char}</span>`;

const markers = {
  PIN_PICKUP: {
    width: 144,
    height: 180,
    body: pin({ fill: P, content: letter('A', BG), dot: P }),
  },
  PIN_DROPOFF: {
    width: 144,
    height: 180,
    body: pin({ fill: T, content: letter('B', BG), dot: T }),
  },
  PIN_STOP: {
    width: 144,
    height: 180,
    body: pin({
      fill: S,
      content: `<div style="width:30px;height:30px;border-radius:50%;background:${T}"></div>`,
      dot: P,
    }),
  },
  PIN_DRIVER: {
    width: 156,
    height: 78,
    body: `<div style="position:absolute;inset:0;border-radius:39px;background:${WHITE}"></div>
      <div style="position:absolute;inset:9px;border-radius:30px;background:${T}"></div>
      <div style="position:absolute;left:54px;top:27px;width:48px;height:24px;border-radius:8px;background:${WHITE}"></div>`,
  },
};

function render(name, { width, height, body }) {
  const page = join(work, `${name}.html`);
  const png = join(work, `${name}.png`);
  writeFileSync(
    page,
    `<!doctype html><html><head><meta charset="utf-8"><style>
      @font-face { font-family: ManropeBold; src: url('${bold}'); }
      html, body { margin: 0; width: ${width}px; height: ${height}px; background: transparent; overflow: hidden; position: relative; }
    </style></head><body>${body}</body></html>`,
  );
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--default-background-color=00000000',
      `--window-size=${width},${height}`,
      `--screenshot=${png}`,
      pathToFileURL(page).href,
    ],
    { stdio: 'ignore' },
  );
  return readFileSync(png).toString('base64');
}

let source = readFileSync(target, 'utf8');
for (const [name, spec] of Object.entries(markers)) {
  const base64 = render(name, spec);
  const rows = base64
    .match(/.{1,96}/g)
    .map((row) => `  '${row}',`)
    .join('\n');
  const re = new RegExp(`const ${name}_PNG = \\[[\\s\\S]*?\\]\\.join\\(''\\);`);
  if (!re.test(source)) throw new Error(`Нет ${name}_PNG в ${target}`);
  source = source.replace(re, `const ${name}_PNG = [\n${rows}\n].join('');`);
  console.log(
    `  ${name}: ${spec.width}×${spec.height}, ${Math.round((base64.length * 3) / 4)} байт`,
  );
}
writeFileSync(target, source);
console.log(`Обновлён ${target}`);
