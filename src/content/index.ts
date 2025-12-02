/**
 * Content Script - Handles text selection and translation popup
 */

import type { ExtensionMessage } from '@/types/messages';

// MDI icon paths (inlined to avoid bundling issues with content scripts)
const MDI_CONTENT_COPY = 'M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z';
const MDI_CHECK = 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z';
const MDI_CLOSE = 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z';
const MDI_TRANSLATE = 'M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12A6,6 0 0,0 12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18C12.33,18 12.65,17.97 12.97,17.93L14.12,19.08C13.41,19.56 12.53,20 11.5,20A7,7 0 0,1 4.5,13A7,7 0 0,1 11.5,6C12.53,6 13.41,6.44 14.12,6.92L12.97,8.05C12.65,8.03 12.33,8 12,8A5,5 0 0,0 7,13A5,5 0 0,0 12,18A5,5 0 0,0 17,13C17,12.67 16.97,12.35 16.95,12H17.97L19.43,12.97Z';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Create an SVG icon element from MDI path using DOM API (safe from XSS)
 */
function createSvgIcon(path: string, size = 16, color = 'currentColor'): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.style.verticalAlign = 'middle';
  svg.style.marginRight = '4px';

  const pathEl = document.createElementNS(SVG_NS, 'path');
  pathEl.setAttribute('fill', color);
  pathEl.setAttribute('d', path);

  svg.appendChild(pathEl);
  return svg;
}

/**
 * Create a styled button element
 */
function createButton(
  id: string,
  text: string,
  iconPath: string,
  styles: Partial<CSSStyleDeclaration>,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = id;
  Object.assign(btn.style, {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    ...styles,
  });
  btn.appendChild(createSvgIcon(iconPath, 14, 'currentColor'));
  btn.appendChild(document.createTextNode(text));
  return btn;
}

/**
 * Update button content with icon and text (safe from XSS)
 */
function updateButtonContent(btn: HTMLButtonElement, iconPath: string, text: string): void {
  btn.textContent = '';
  btn.appendChild(createSvgIcon(iconPath, 14, 'currentColor'));
  btn.appendChild(document.createTextNode(text));
}

// Translation popup element
let translationPopup: HTMLDivElement | null = null;
let translationButton: HTMLButtonElement | null = null;

// Page translation state
const translatedNodes = new Map<string, { node: Text; originalText: string }>();

// Initialize content script
function init(): void {
  // Listen for text selection
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('keyup', handleKeyUp);

  // Listen for messages from background script
  browser.runtime.onMessage.addListener(handleMessage);

  // Clean up popup on scroll/resize
  document.addEventListener('scroll', hideTranslationUI, { passive: true });
  window.addEventListener('resize', hideTranslationUI, { passive: true });

  // Inject styles for translated elements
  injectTranslationStyles();

  console.info('Local Translate AI content script loaded');
}

function injectTranslationStyles(): void {
  const style = document.createElement('style');
  style.id = 'lta-styles';
  style.textContent = `
    .lta-translated {
      position: relative;
      background-color: rgba(59, 130, 246, 0.05);
      border-bottom: 1px dotted rgba(59, 130, 246, 0.3);
    }
    .lta-translated:hover::after {
      content: attr(data-original);
      position: absolute;
      bottom: 100%;
      left: 0;
      background: #1f2937;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      line-height: 1.4;
      white-space: pre-wrap;
      max-width: 400px;
      z-index: 2147483646;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      pointer-events: none;
    }
    .lta-progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
      z-index: 2147483647;
      transition: width 0.3s ease;
    }
  `;
  document.head.appendChild(style);
}

function handleMessage(
  message: ExtensionMessage | { type: string; payload?: unknown },
): boolean | void | Promise<unknown> {
  switch (message.type) {
    case 'GET_SELECTION': {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      if (selectedText) {
        // Get selection position for popup placement
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        const popupX = rect ? rect.left : window.innerWidth / 2 - 100;
        const popupY = rect ? rect.bottom + 10 : window.innerHeight / 2;

        // Show popup before sending translation request
        showTranslationPopup(popupX, popupY);
        updateTranslationPopupContent('翻訳中...');

        void browser.runtime.sendMessage({
          type: 'TRANSLATE_TEXT',
          timestamp: Date.now(),
          payload: {
            requestId: crypto.randomUUID(),
            text: selectedText,
            sourceLanguage: 'auto',
            targetLanguage: 'Japanese',
            profileId: '',
            stream: true,
          },
        });
      }
      break;
    }

    case 'TRANSLATE_PAGE':
      void startPageTranslation();
      break;

    case 'GET_PAGE_TEXT_NODES':
      return Promise.resolve(getPageTextNodes());

    case 'APPLY_PAGE_TRANSLATION': {
      const applyPayload = (message as { payload: { nodeIds: string[]; translatedTexts: string[] } }).payload;
      applyPageTranslation(applyPayload.nodeIds, applyPayload.translatedTexts);
      break;
    }

    case 'TRANSLATE_PAGE_PROGRESS': {
      const progressPayload = (message as { payload: { translatedNodes: number; totalNodes: number } }).payload;
      updateProgressBar(progressPayload.translatedNodes, progressPayload.totalNodes);
      break;
    }

    case 'TRANSLATE_TEXT_RESULT': {
      const resultPayload = (message as ExtensionMessage & { type: 'TRANSLATE_TEXT_RESULT' }).payload;
      showTranslationResult(resultPayload.translatedText);
      break;
    }

    case 'TRANSLATE_TEXT_STREAM_CHUNK': {
      const chunkPayload = (message as ExtensionMessage & { type: 'TRANSLATE_TEXT_STREAM_CHUNK' }).payload;
      updateStreamingResult(chunkPayload.accumulated);
      break;
    }

    case 'TRANSLATE_TEXT_STREAM_END': {
      const endPayload = (message as ExtensionMessage & { type: 'TRANSLATE_TEXT_STREAM_END' }).payload;
      finalizeTranslationResult(endPayload.translatedText);
      break;
    }

    case 'TRANSLATE_TEXT_ERROR':
      showTranslationError((message as ExtensionMessage & { type: 'TRANSLATE_TEXT_ERROR' }).payload.message);
      break;

    default:
      // Unknown message type
      break;
  }
}

function handleMouseUp(event: MouseEvent): void {
  // Ignore if clicking on our own elements
  if (
    translationPopup?.contains(event.target as Node) ||
    translationButton?.contains(event.target as Node)
  ) {
    return;
  }

  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();

  if (selectedText && selectedText.length > 0) {
    showTranslationButton(event.clientX, event.clientY, selectedText);
  } else {
    hideTranslationUI();
  }
}

function handleKeyUp(event: KeyboardEvent): void {
  // Check for Escape key to hide popup
  if (event.key === 'Escape') {
    hideTranslationUI();
  }
}

function showTranslationButton(x: number, y: number, text: string): void {
  hideTranslationUI();

  translationButton = document.createElement('button');
  translationButton.id = 'lta-translate-button';
  translationButton.appendChild(createSvgIcon(MDI_TRANSLATE, 14, 'white'));
  translationButton.appendChild(document.createTextNode('翻訳'));
  translationButton.style.cssText = `
    position: fixed;
    left: ${x + 10}px;
    top: ${y + 10}px;
    z-index: 2147483647;
    padding: 8px 12px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: background 0.2s;
  `;

  translationButton.addEventListener('mouseenter', () => {
    if (translationButton) {
      translationButton.style.background = '#2563eb';
    }
  });

  translationButton.addEventListener('mouseleave', () => {
    if (translationButton) {
      translationButton.style.background = '#3b82f6';
    }
  });

  translationButton.addEventListener('click', () => {
    void translateSelectedText(text);
  });

  document.body.appendChild(translationButton);
}

async function translateSelectedText(text: string): Promise<void> {
  if (!translationButton) {
    return;
  }

  const buttonRect = translationButton.getBoundingClientRect();
  showTranslationPopup(buttonRect.left, buttonRect.bottom + 10);
  updateTranslationPopupContent('翻訳中...');

  const requestId = crypto.randomUUID();

  try {
    // Send to background script for translation and sidebar sync
    await browser.runtime.sendMessage({
      type: 'TRANSLATE_TEXT',
      timestamp: Date.now(),
      payload: {
        requestId,
        text,
        sourceLanguage: 'auto',
        targetLanguage: 'Japanese',
        profileId: '',
        stream: true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '不明なエラー';
    showTranslationError(message);
  }

  // Hide the button after clicking
  if (translationButton) {
    translationButton.remove();
    translationButton = null;
  }
}

function showTranslationPopup(x: number, y: number): void {
  if (translationPopup) {
    translationPopup.remove();
  }

  translationPopup = document.createElement('div');
  translationPopup.id = 'lta-translation-popup';
  translationPopup.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    z-index: 2147483647;
    min-width: 200px;
    max-width: 400px;
    max-height: 300px;
    padding: 16px;
    background: white;
    color: #1f2937;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    font-size: 14px;
    line-height: 1.5;
    overflow: auto;
  `;

  // Check if popup would go off screen
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (x + 400 > viewportWidth) {
    translationPopup.style.left = `${viewportWidth - 420}px`;
  }
  if (y + 300 > viewportHeight) {
    translationPopup.style.top = `${viewportHeight - 320}px`;
  }

  document.body.appendChild(translationPopup);
}

function updateTranslationPopupContent(content: string): void {
  if (!translationPopup) {
    return;
  }

  // Clear existing content safely
  translationPopup.textContent = '';

  const contentDiv = document.createElement('div');
  contentDiv.style.whiteSpace = 'pre-wrap';
  contentDiv.style.wordBreak = 'break-word';
  contentDiv.textContent = content;

  translationPopup.appendChild(contentDiv);
}

function showTranslationResult(text: string): void {
  if (!translationPopup) {
    return;
  }

  // Plain text: remove multiple newlines and trim
  const plainText = text.replace(/\n+/g, ' ').trim();

  // Clear existing content safely
  translationPopup.textContent = '';

  // Create content div
  const contentDiv = document.createElement('div');
  contentDiv.style.whiteSpace = 'pre-wrap';
  contentDiv.style.wordBreak = 'break-word';
  contentDiv.style.marginBottom = '12px';
  contentDiv.textContent = text;
  translationPopup.appendChild(contentDiv);

  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '8px';
  buttonContainer.style.justifyContent = 'flex-end';
  buttonContainer.style.flexWrap = 'wrap';

  // Create buttons using DOM API
  const copyFormattedBtn = createButton(
    'lta-copy-formatted-btn',
    'フォーマット済み',
    MDI_CONTENT_COPY,
    { background: '#3b82f6', color: 'white' },
  );

  const copyPlainBtn = createButton(
    'lta-copy-plain-btn',
    '1行',
    MDI_CONTENT_COPY,
    { background: '#e5e7eb', color: '#374151' },
  );

  const closeBtn = createButton(
    'lta-close-btn',
    '閉じる',
    MDI_CLOSE,
    { background: '#ef4444', color: 'white' },
  );

  // Add event listeners
  copyFormattedBtn.addEventListener('click', () => {
    void navigator.clipboard.writeText(text);
    updateButtonContent(copyFormattedBtn, MDI_CHECK, 'コピー完了!');
    setTimeout(() => {
      updateButtonContent(copyFormattedBtn, MDI_CONTENT_COPY, 'フォーマット済み');
    }, 2000);
  });

  copyPlainBtn.addEventListener('click', () => {
    void navigator.clipboard.writeText(plainText);
    updateButtonContent(copyPlainBtn, MDI_CHECK, 'コピー完了!');
    setTimeout(() => {
      updateButtonContent(copyPlainBtn, MDI_CONTENT_COPY, '1行');
    }, 2000);
  });

  closeBtn.addEventListener('click', hideTranslationUI);

  // Append buttons to container
  buttonContainer.appendChild(copyFormattedBtn);
  buttonContainer.appendChild(copyPlainBtn);
  buttonContainer.appendChild(closeBtn);
  translationPopup.appendChild(buttonContainer);
}

function updateStreamingResult(text: string): void {
  updateTranslationPopupContent(text);
}

function finalizeTranslationResult(text: string): void {
  showTranslationResult(text);
}

function showTranslationError(message: string): void {
  if (!translationPopup) {
    return;
  }

  // Clear existing content safely
  translationPopup.textContent = '';

  // Create error message div
  const errorDiv = document.createElement('div');
  errorDiv.style.color = '#dc2626';
  errorDiv.style.marginBottom = '12px';

  const strongEl = document.createElement('strong');
  strongEl.textContent = 'エラー:';
  errorDiv.appendChild(strongEl);
  errorDiv.appendChild(document.createTextNode(' ' + message));
  translationPopup.appendChild(errorDiv);

  // Create close button using DOM API
  const closeBtn = createButton(
    'lta-close-btn',
    '閉じる',
    MDI_CLOSE,
    { background: '#ef4444', color: 'white' },
  );
  closeBtn.addEventListener('click', hideTranslationUI);
  translationPopup.appendChild(closeBtn);
}

function hideTranslationUI(): void {
  if (translationButton) {
    translationButton.remove();
    translationButton = null;
  }
  if (translationPopup) {
    translationPopup.remove();
    translationPopup = null;
  }
}

// Page translation functions
function getPageTextNodes(): { texts: string[]; nodeIds: string[] } {
  const texts: string[] = [];
  const nodeIds: string[] = [];

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) {
          return NodeFilter.FILTER_REJECT;
        }
        const tagName = parent.tagName.toLowerCase();
        // Skip non-translatable elements
        if (['script', 'style', 'noscript', 'code', 'pre', 'textarea', 'input'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        // Skip empty or whitespace-only nodes
        const text = node.textContent?.trim();
        if (!text || text.length === 0) {
          return NodeFilter.FILTER_REJECT;
        }
        // Skip very short text (likely punctuation or numbers only)
        if (text.length < 2) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let nodeIndex = 0;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node instanceof Text && node.textContent) {
      const nodeId = `lta-node-${nodeIndex++}`;
      texts.push(node.textContent.trim());
      nodeIds.push(nodeId);
      translatedNodes.set(nodeId, { node, originalText: node.textContent });
    }
  }

  return { texts, nodeIds };
}

function applyPageTranslation(nodeIds: string[], translatedTexts: string[]): void {
  for (let i = 0; i < nodeIds.length; i++) {
    const nodeId = nodeIds[i];
    const translatedText = translatedTexts[i];
    const nodeData = translatedNodes.get(nodeId ?? '');

    if (nodeData && translatedText && nodeId) {
      const { node, originalText } = nodeData;

      // Replace text content
      node.textContent = translatedText;

      // Add wrapper span with original text for hover display
      const parent = node.parentElement;
      if (parent && !parent.classList.contains('lta-translated')) {
        parent.classList.add('lta-translated');
        parent.setAttribute('data-original', originalText);
      }
    }
  }

  removeProgressBar();

  // Show completion notification
  void browser.runtime.sendMessage({
    type: 'NOTIFICATION',
    timestamp: Date.now(),
    payload: {
      id: crypto.randomUUID(),
      notificationType: 'success',
      title: 'ページ翻訳完了',
      message: `${nodeIds.length}個のテキストを翻訳しました`,
    },
  });
}

async function startPageTranslation(): Promise<void> {
  // Show progress bar
  showProgressBar();

  // Request translation from background
  await browser.runtime.sendMessage({
    type: 'TRANSLATE_PAGE',
    timestamp: Date.now(),
    payload: {
      requestId: crypto.randomUUID(),
      targetLanguage: 'Japanese',
      profileId: '',
    },
  });
}

function showProgressBar(): void {
  let progressBar = document.getElementById('lta-progress-bar');
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.id = 'lta-progress-bar';
    progressBar.className = 'lta-progress-bar';
    progressBar.style.width = '0%';
    document.body.appendChild(progressBar);
  }
}

function updateProgressBar(completed: number, total: number): void {
  const progressBar = document.getElementById('lta-progress-bar');
  if (progressBar) {
    const percent = Math.round((completed / total) * 100);
    progressBar.style.width = `${percent}%`;
  }
}

function removeProgressBar(): void {
  const progressBar = document.getElementById('lta-progress-bar');
  if (progressBar) {
    progressBar.style.width = '100%';
    setTimeout(() => {
      progressBar.remove();
    }, 500);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
