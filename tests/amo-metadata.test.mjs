import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestLocales = ['ar', 'bn', 'en', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'ru', 'zh'];
const requiredManifestMessageKeys = [
  'extensionName',
  'extensionDescription',
  'browserActionTitle',
  'translateSelectionCommand',
  'toggleSidebarCommand',
];
const expectedAmoLocales = [
  'en-CA',
  'en-GB',
  'en-US',
  'es-AR',
  'es-CL',
  'es-ES',
  'es-MX',
  'fr',
  'ja',
  'ko',
  'pt-BR',
  'pt-PT',
  'ru',
  'zh-CN',
];

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(rootDir, relativePath), 'utf8'));
}

describe('AMO metadata', () => {
  it('contains a consistent set of supported listing locales', async () => {
    const metadata = await readJson('amo-metadata.json');
    const translatedFields = ['name', 'summary', 'description', 'developer_comments', 'homepage', 'support_url', 'support_email'];
    const localeSets = translatedFields.map((field) => Object.keys(metadata[field]).sort());

    expect(localeSets[0]).toEqual(expectedAmoLocales.sort());
    for (const locales of localeSets.slice(1)) {
      expect(locales).toEqual(localeSets[0]);
    }
    expect(localeSets[0]).toContain(metadata.default_locale);

    for (const summary of Object.values(metadata.summary)) {
      expect(summary.length).toBeLessThanOrEqual(250);
    }
    for (const url of [...Object.values(metadata.homepage), ...Object.values(metadata.support_url)]) {
      expect(() => new URL(url)).not.toThrow();
    }
  });

  it('contains release notes for every listing locale', async () => {
    const metadata = await readJson('amo-metadata.json');

    expect(Object.keys(metadata.version.release_notes).sort()).toEqual(expectedAmoLocales.sort());
    expect(metadata.version.license).toBe('MIT');
  });
});

describe('manifest localization', () => {
  it('provides every manifest message in every bundled locale', async () => {
    const manifest = await readJson('public/manifest.json');

    expect(manifest.default_locale).toBe('en');
    for (const field of ['name', 'description', 'browser_action.default_title', 'sidebar_action.default_title']) {
      const value = field.split('.').reduce((current, key) => current[key], manifest);
      expect(value).toMatch(/^__MSG_[A-Za-z0-9_]+__$/);
    }

    for (const locale of manifestLocales) {
      const messages = await readJson(`public/_locales/${locale}/messages.json`);
      for (const key of requiredManifestMessageKeys) {
        expect(messages[key]?.message).toBeTruthy();
      }
    }
  });
});
