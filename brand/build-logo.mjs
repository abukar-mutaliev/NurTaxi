/**
 * Логотип «Нур» — исходники SVG и все растровые производные (иконки, splash, favicon,
 * логотип экранов входа) из одной геометрии.
 *
 *   node brand/build-logo.mjs
 *
 * PNG рендерит headless Chrome (путь — CHROME_PATH или стандартная установка Chrome/Edge),
 * подпись «женское такси» — шрифт Manrope из mobile/node_modules.
 *
 * Знак: свет («нур») — круг над дорогой, уходящей к нему между двумя крыльями. Только
 * простые фигуры и цвета палитры «Слива и пудра».
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const palette = {
  primary: '#6B3A5B',
  secondary: '#D8A7B1',
  background: '#FBF6F4',
  text: '#2A2127',
};

/** Знак в квадрате 120×120. */
function markShapes(wing, light) {
  return [
    `<circle cx="60" cy="24" r="11" fill="${light}"/>`,
    `<path fill="${wing}" d="M17 41.5C17 69 33 92 53 104L54.5 96C43 86 37 65 37 45C37 41 33 38 29 37.5L21 37.2C18.8 37.1 17 38.9 17 41.5Z"/>`,
    `<path fill="${wing}" d="M103 41.5C103 69 87 92 67 104L65.5 96C77 86 83 65 83 45C83 41 87 38 91 37.5L99 37.2C101.2 37.1 103 38.9 103 41.5Z"/>`,
    `<path fill="${wing}" d="M56 104L64 104L61.2 56C60.9 53.5 59.1 53.5 58.8 56Z"/>`,
  ].join('');
}

/**
 * Надпись «НУР» штрихами в рамке 86×32: геометрический гротеск в духе Manrope. Концы
 * диагоналей обрезаны горизонтально клипом, как у шрифта.
 */
function wordmark(color, id) {
  const stroke = `stroke="${color}" stroke-width="6" fill="none"`;
  return [
    `<clipPath id="${id}"><rect x="-2" y="0" width="92" height="32"/></clipPath>`,
    `<g clip-path="url(#${id})" ${stroke} stroke-linejoin="miter">`,
    // Н
    '<path d="M3 -4V36M19 -4V36M3 16H19"/>',
    // У: правая диагональ до низа, левая — до встречи с ней
    '<path d="M55.75 -4L38.25 36M28.4 -4L46.1 18"/>',
    // Р
    '<path d="M65 -4V36M65 3H75A8 8 0 0 1 75 19H65"/>',
    '</g>',
  ].join('');
}

const svg = (viewBox, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${extra}>${body}</svg>\n`;

const variants = {
  main: {
    wing: palette.primary,
    light: palette.secondary,
    word: palette.primary,
  },
  dark: {
    wing: palette.background,
    light: palette.secondary,
    word: palette.background,
  },
  mono: { wing: 'currentColor', light: 'currentColor', word: 'currentColor' },
};

/** Вертикальная композиция: знак, под ним «НУР» (рамка 120×168). */
function lockup({ wing, light, word }, id) {
  return `${markShapes(wing, light)}<g transform="translate(17 132)">${wordmark(word, id)}</g>`;
}

/** Плитка иконки (1024): фон и знак по центру, `scale` — доля стороны под знак. */
function iconTile(bg, v, scale, radius = 0) {
  const size = 120 / scale;
  const offset = (size - 120) / 2;
  const rect = bg
    ? `<rect width="${size}" height="${size}" rx="${radius * size}" fill="${bg}"/>`
    : '';
  return svg(
    `0 0 ${size} ${size}`,
    `${rect}<g transform="translate(${offset} ${offset})">${markShapes(v.wing, v.light)}</g>`,
  );
}

// ── SVG-исходники ───────────────────────────────────────────────────────────────────────
const out = join(root, 'brand/logo');
mkdirSync(out, { recursive: true });
const files = {
  'nur-mark.svg': svg('0 0 120 120', markShapes(variants.main.wing, variants.main.light)),
  'nur-mark-dark.svg': svg('0 0 120 120', markShapes(variants.dark.wing, variants.dark.light)),
  'nur-mark-mono.svg': svg('0 0 120 120', markShapes('currentColor', 'currentColor')),
  'nur-logo.svg': svg('0 0 120 168', lockup(variants.main, 'nur-word')),
  'nur-logo-dark.svg': svg('0 0 120 168', lockup(variants.dark, 'nur-word')),
  'nur-logo-mono.svg': svg('0 0 120 168', lockup(variants.mono, 'nur-word')),
  'nur-icon-client.svg': iconTile(palette.background, variants.main, 0.62, 0.22),
  'nur-icon-driver.svg': iconTile(palette.primary, variants.dark, 0.62, 0.22),
};
for (const [name, content] of Object.entries(files)) writeFileSync(join(out, name), content);
writeFileSync(
  join(root, 'web-admin/public/favicon.svg'),
  iconTile(palette.primary, variants.dark, 0.7, 0.24),
);

// ── Растр ───────────────────────────────────────────────────────────────────────────────
const chrome =
  process.env.CHROME_PATH ??
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ].find((path) => existsSync(path));
if (!chrome) throw new Error('Не найден Chrome/Edge: задайте CHROME_PATH');

const font = pathToFileURL(
  join(root, 'mobile/node_modules/@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf'),
).href;
const work = mkdtempSync(join(tmpdir(), 'nur-logo-'));

function render(target, width, height, body, background = 'transparent') {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Manrope; src: url('${font}'); font-weight: 500; }
    html, body { margin: 0; width: ${width}px; height: ${height}px; background: ${background}; overflow: hidden; }
    body > svg, body > div { display: block; width: 100%; height: 100%; }
  </style></head><body>${body}</body></html>`;
  const page = join(work, `${target.replace(/[\\/:]/g, '_')}.html`);
  writeFileSync(page, html);
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--default-background-color=00000000',
      `--window-size=${width},${height}`,
      `--screenshot=${join(root, target)}`,
      pathToFileURL(page).href,
    ],
    { stdio: 'ignore' },
  );
  console.log(`  ${target} (${width}×${height})`);
}

/** Логотип экранов входа: знак, «НУР», подпись. Пропорция рамки — как у прежнего ассета. */
function welcomeLogo(width, height) {
  const tagline = Math.round(width * 0.058);
  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(height * 0.035)}px">
    <svg viewBox="0 0 120 168" style="width:${Math.round(width * 0.62)}px">${lockup(variants.main, 'w')}</svg>
    <div style="font-family:Manrope;font-weight:500;font-size:${tagline}px;letter-spacing:${(tagline * 0.32).toFixed(1)}px;color:${palette.primary};text-transform:uppercase">Женское такси</div>
  </div>`;
}

const mark = (v) => svg('0 0 120 120', markShapes(v.wing, v.light));
const apps = {
  client: { bg: palette.background, v: variants.main },
  driver: { bg: palette.primary, v: variants.dark },
};

for (const [app, { bg, v }] of Object.entries(apps)) {
  const dir = `mobile/apps/${app}/assets/images`;
  console.log(app);
  render(`${dir}/icon.png`, 1024, 1024, iconTile(bg, v, 0.62));
  render(`${dir}/android-icon-background.png`, 1024, 1024, '<div></div>', bg);
  // Безопасная зона адаптивной иконки — круг 66%: знак занимает 46% стороны.
  render(`${dir}/android-icon-foreground.png`, 1024, 1024, iconTile(null, v, 0.46));
  render(
    `${dir}/android-icon-monochrome.png`,
    1024,
    1024,
    iconTile(null, { wing: '#FFFFFF', light: '#FFFFFF' }, 0.46),
  );
  render(`${dir}/splash-icon.png`, 288, 288, mark(v));
  render(`${dir}/favicon.png`, 48, 48, iconTile(palette.primary, variants.dark, 0.7, 0.24));
}
render('mobile/apps/client/assets/images/welcome/logo.png', 656, 796, welcomeLogo(656, 796));
render('mobile/apps/driver/assets/images/welcome/logo.png', 664, 805, welcomeLogo(664, 805));
// Один знак — для мест, где полная надпись не помещается (шапки, заглушки).
for (const app of Object.keys(apps)) {
  render(
    `mobile/apps/${app}/assets/images/welcome/logo-mark.png`,
    447,
    475,
    `<div style="display:flex;align-items:center;justify-content:center">${mark(variants.main).replace('<svg ', '<svg style="width:447px;height:447px" ')}</div>`,
  );
}

console.log(`SVG: ${out}`);
