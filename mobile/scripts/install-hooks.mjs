// Устанавливает git-хуки из mobile/.githooks (M0.2).
// Копирует файлы в .git/hooks вместо core.hooksPath — иначе EAS Build не может
// сделать shallow clone репозитория (git clone protection).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(mobileRoot, '..');
const hooksSource = join(mobileRoot, '.githooks');
const hooksTarget = join(repoRoot, '.git', 'hooks');

if (!existsSync(join(repoRoot, '.git'))) {
  process.exit(0);
}

try {
  execFileSync('git', ['config', '--unset', 'core.hooksPath'], {
    cwd: repoRoot,
    stdio: 'ignore',
  });
} catch {
  // hooksPath мог не быть задан — это нормально
}

if (!existsSync(hooksSource)) {
  process.exit(0);
}

mkdirSync(hooksTarget, { recursive: true });

for (const hook of readdirSync(hooksSource)) {
  copyFileSync(join(hooksSource, hook), join(hooksTarget, hook));
}

console.log('[nurtaxi-mobile] git hooks -> .git/hooks');
