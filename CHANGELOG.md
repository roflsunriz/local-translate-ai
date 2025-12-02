# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/roflsunriz/local-translate-ai/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/roflsunriz/local-translate-ai/releases/tag/v0.1.0

