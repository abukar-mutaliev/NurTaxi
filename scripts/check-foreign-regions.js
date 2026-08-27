#!/usr/bin/env node
/**
 * CI-проверка: в конфигурации не должны появляться зарубежные регионы (FZ-01.5).
 */
const { execSync } = require('node:child_process');
const forbidden = [
  'us-east-1',
  'us-west-1',
  'us-west-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'ap-southeast-1',
  'ap-northeast-1',
  'eastus',
  'westeurope',
];

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter(
    (f) =>
      f &&
      /^(infra\/|server\/|web-admin\/|\.github\/|scripts\/|mobile\/)/.test(f) &&
      !f.includes('node_modules') &&
      !f.endsWith('.spec.ts') &&
      !f.endsWith('.md'),
  );

const hits = [];
for (const file of files) {
  let content = '';
  try {
    content = require('node:fs').readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const token of forbidden) {
    if (content.includes(token)) {
      hits.push(`${file}: ${token}`);
    }
  }
}

if (hits.length) {
  console.error('Запрещённые зарубежные регионы:\n' + hits.join('\n'));
  process.exit(1);
}

console.log('localization-guard: зарубежных регионов не найдено');
