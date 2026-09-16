import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function readText(relativePath) {
  return readFile(resolve(rootDir, relativePath), 'utf8');
}

describe('dev startup', () => {
  it('launches the watch build and Firefox with the built extension', async () => {
    const packageJson = JSON.parse(await readText('package.json'));
    expect(packageJson.scripts.dev).toContain('scripts/dev.mjs');

    const devScript = await readText('scripts/dev.mjs');
    expect(devScript).toContain('--watch');
    expect(devScript).toContain('web-ext');
    expect(devScript).toContain('dist');
    expect(devScript).toContain('dist/manifest.json');
  });

  it('does not reuse the everyday Firefox profile', async () => {
    const devScript = await readText('scripts/dev.mjs');
    expect(devScript).not.toContain('--firefox-profile');
    expect(devScript).not.toContain('--keep-profile-changes');
  });
});
