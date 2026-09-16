// scripts/dev.mjs
//
// `bun run dev`: dist/ をウォッチビルドし、Firefox で拡張機能を起動する。
// web-ext run は dist/ の再ビルドを検知して拡張機能を自動リロードする。
// Firefox は一時プロファイルで起動するため、普段使いのプロファイルには影響しない。

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distManifest = resolve(rootDir, 'dist', 'manifest.json');

const children = new Set();

function run(command) {
  // Single command string with shell:true (constants only, no user input).
  const child = spawn(command, { cwd: rootDir, stdio: 'inherit', shell: true });
  children.add(child);
  child.on('error', (error) => {
    console.error(`[dev] failed to start "${command}": ${error.message}`);
    process.exitCode = 1;
  });
  child.on('exit', () => {
    children.delete(child);
  });
  return child;
}

function stopAll() {
  for (const child of children) {
    if (child.exitCode !== null || child.signalCode !== null) {
      continue;
    }
    if (process.platform === 'win32' && child.pid !== undefined) {
      spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  }
}

process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);
process.on('exit', stopAll);

run('vite build --watch --mode development --configLoader runner');

// 初回ビルドで dist/manifest.json が生成されてから Firefox を起動する。
const startedAt = Date.now();
await new Promise((done) => {
  const timer = setInterval(() => {
    if (existsSync(distManifest) || Date.now() - startedAt > 120_000) {
      clearInterval(timer);
      done();
    }
  }, 500);
});

if (!existsSync(distManifest)) {
  console.error('[dev] dist/manifest.json was not generated; leaving the watcher running.');
  process.exitCode = 1;
} else {
  run('web-ext run -s dist --firefox=firefox');
}

await new Promise(() => {});
