import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const amoMetadataPath = resolve(root, 'amo-metadata.json');
const manifestPath = resolve(root, 'public', 'manifest.json');
const localesRoot = resolve(root, 'public', '_locales');

const supportedAmoLocales = new Set([
  'cs', 'de', 'dsb', 'el', 'en-CA', 'en-GB', 'en-US', 'es-AR', 'es-CL', 'es-ES',
  'es-MX', 'fi', 'fr', 'fur', 'fy-NL', 'he', 'hr', 'hsb', 'hu', 'ia', 'it', 'ja',
  'ka', 'kab', 'ko', 'nb-NO', 'nl', 'nn-NO', 'pl', 'pt-BR', 'pt-PT', 'ro', 'ru',
  'sk', 'sl', 'sq', 'sr', 'sv-SE', 'tr', 'uk', 'vi', 'zh-CN', 'zh-TW',
]);

const expectedExtensionLocales = ['ar', 'bn', 'en', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'ru', 'zh'];
const translatedAddonFields = ['name', 'summary', 'description', 'developer_comments', 'homepage', 'support_url'];
const requiredManifestMessages = [
  'extensionName',
  'extensionDescription',
  'browserActionTitle',
  'translateSelectionCommand',
  'toggleSidebarCommand',
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

const metadata = await readJson(amoMetadataPath);
const manifest = await readJson(manifestPath);

assert(typeof metadata.default_locale === 'string', 'AMO default_locale is required.');
assert(supportedAmoLocales.has(metadata.default_locale), `Unsupported AMO default_locale: ${metadata.default_locale}`);
assert(metadata.summary && typeof metadata.summary === 'object', 'AMO summary translations are required.');

const listingLocales = Object.keys(metadata.summary).sort();
assert(listingLocales.length > 0, 'At least one AMO listing locale is required.');
assert(listingLocales.includes(metadata.default_locale), 'AMO default_locale must have a summary translation.');

for (const locale of listingLocales) {
  assert(supportedAmoLocales.has(locale), `AMO listing locale is not in the production locale list: ${locale}`);
}

for (const field of translatedAddonFields) {
  const translations = metadata[field];
  assert(translations && typeof translations === 'object', `AMO ${field} translations are required.`);
  const fieldLocales = Object.keys(translations).sort();
  assert(JSON.stringify(fieldLocales) === JSON.stringify(listingLocales), `AMO ${field} locales do not match summary locales.`);
  for (const locale of listingLocales) {
    assert(typeof translations[locale] === 'string' && translations[locale].trim().length > 0, `AMO ${field}.${locale} must be a non-empty string.`);
    if (field === 'summary') {
      assert(translations[locale].length <= 250, `AMO summary.${locale} exceeds 250 characters.`);
    }
    if (field === 'homepage' || field === 'support_url') {
      assert(URL.canParse(translations[locale]), `AMO ${field}.${locale} must be a valid URL.`);
    }
  }
}

assert(metadata.version?.license === 'MIT', 'AMO version license must remain MIT.');
const releaseNotes = metadata.version?.release_notes;
assert(releaseNotes && typeof releaseNotes === 'object', 'AMO release notes translations are required.');
assert(JSON.stringify(Object.keys(releaseNotes).sort()) === JSON.stringify(listingLocales), 'AMO release note locales do not match listing locales.');

assert(manifest.default_locale === 'en', 'The extension manifest default_locale must be en.');
for (const manifestField of ['name', 'description', 'browser_action.default_title', 'commands.translate-selection.description', 'commands.toggle-sidebar.description']) {
  const value = manifestField.split('.').reduce((current, key) => current?.[key], manifest);
  assert(typeof value === 'string' && value.startsWith('__MSG_') && value.endsWith('__'), `Manifest field is not localized: ${manifestField}`);
}

const defaultLocaleMessages = await readJson(resolve(localesRoot, `${manifest.default_locale}`, 'messages.json'));
for (const messageName of requiredManifestMessages) {
  assert(defaultLocaleMessages[messageName]?.message, `Missing default manifest message: ${messageName}`);
}

for (const locale of expectedExtensionLocales) {
  const messages = await readJson(resolve(localesRoot, locale, 'messages.json'));
  for (const messageName of requiredManifestMessages) {
    assert(messages[messageName]?.message, `Missing ${locale} manifest message: ${messageName}`);
  }
}

console.log(`AMO metadata valid: ${listingLocales.length} AMO listing locales, ${expectedExtensionLocales.length} manifest locales.`);
