# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2025-12-04

### Added

- Text selection translation pop up window is now draggable

## [1.1.0] - 2025-12-04

### Added

- USD to JPY currency conversion feature in translation results
- AI model parameter conversion (B/M to Japanese units: 億/万)
- Conversion options toggle in settings
- Progress bar display for sidebar, page-wide, and text selection translation
- Toast notifications for translation status across all translation modes

### Changed

- Enhanced currency formatting for Japanese locale
- Improved translation process with conversion options and sanitization
- Page-wide translation now processes paragraphs sequentially for better UX

## [1.0.0] - 2025-12-04

### Added

- Multi-language support (13 languages: Japanese, English, Chinese, Korean, Spanish, French, Portuguese, Russian, Arabic, Hindi, Bengali, Indonesian)
- Material Design Icons throughout the UI
- Two copy buttons in text selection translation popup (original/translated)
- New 96x96 icon for better visual representation
- AMO submission documentation

### Changed

- Replaced emojis with MDI icons in translation popup
- Updated keyboard shortcuts in manifest and settings
- Enhanced translation popup with improved DOM manipulation
- Updated data collection permissions in manifest.json
- Updated package dependencies and added pnpm lockfile

### Fixed

- Settings not syncing between frontend and background
- Sidebar message handling for translation responses
- Broadcast translation results to content scripts
- CORS, Promise handling, and i18n issues
- Inline MDI icon paths in content script

## [0.1.0] - 2024-12-02

### Added

- Initial release of Local Translate AI
- Text selection translation with popup display
- Sidebar translation panel with streaming support
- Page-wide translation with progress display
- Translation history (up to 100 items)
- Multiple translation profiles
- Keyboard shortcuts (Ctrl+Shift+T for translation, Ctrl+Shift+S for sidebar)
- Dark mode support (system preference + manual toggle)
- Settings page with 5 tabs:
  - General: UI language, theme, currency conversion
  - API: Profile management, endpoint configuration
  - Prompt: System prompt and user prompt template customization
  - Advanced: Streaming, history, retry settings, exclusion patterns
  - Shortcuts: Keyboard shortcut configuration
- Export/Import settings functionality
- Context menu integration
- API retry with configurable attempts and intervals
- API key encryption using Web Crypto API
- HTTPS validation for non-localhost endpoints
- USD to JPY conversion for translation results
- AI model parameter count conversion (B/M to Japanese units)
- Translation exclusion patterns (code blocks, URLs, math formulas, emails)
- Original text hover display for page translation
- Toast notifications for translation status

### Security

- API keys encrypted with AES-GCM
- Content Security Policy configured
- DOM sanitization for translated content
- HTTPS enforcement for external endpoints

[Unreleased]: https://github.com/roflsunriz/local-translate-ai/compare/v1.1.0...HEAD
[1.2.0]: https://github.com/roflsunriz/local-translate-ai/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/roflsunriz/local-translate-ai/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/roflsunriz/local-translate-ai/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/roflsunriz/local-translate-ai/releases/tag/v0.1.0

