/**
 * Content Script - Handles text selection and translation popup
 */

import type { ExtensionMessage, ApplySingleNodeTranslationMessage } from '@/types/messages';
import {
  injectProgressBarStyles,
  showProgressBar,
  updateProgressBar,
  removeProgressBar,
} from '@/utils/progressBar';
import {
  injectToastStyles,
  showToast,
  updateToast,
} from '@/utils/toast';

// Constants for toast IDs
const TRANSLATION_TOAST_ID = 'lta-translation-progress';

// MDI icon paths (inlined to avoid bundling issues with content scripts)
const MDI_CONTENT_COPY = 'M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z';
const MDI_CHECK = 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z';
const MDI_CLOSE = 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z';
const MDI_TRANSLATE = 'M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12A6,6 0 0,0 12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18C12.33,18 12.65,17.97 12.97,17.93L14.12,19.08C13.41,19.56 12.53,20 11.5,20A7,7 0 0,1 4.5,13A7,7 0 0,1 11.5,6C12.53,6 13.41,6.44 14.12,6.92L12.97,8.05C12.65,8.03 12.33,8 12,8A5,5 0 0,0 7,13A5,5 0 0,0 12,18A5,5 0 0,0 17,13C17,12.67 16.97,12.35 16.95,12H17.97L19.43,12.97Z';
const MDI_DRAG = 'M7,19V17H9V19H7M11,19V17H13V19H11M15,19V17H17V19H15M7,15V13H9V15H7M11,15V13H13V15H11M15,15V13H17V15H15M7,11V9H9V11H7M11,11V9H13V11H11M15,11V9H17V11H15M7,7V5H9V7H7M11,7V5H13V7H11M15,7V5H17V7H15Z';

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

// Drag state for popup
interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  initialLeft: number;
  initialTop: number;
}
let dragState: DragState | null = null;

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
  // Inject progress bar styles (from utility)
  injectProgressBarStyles();

  // Inject toast styles (from utility)
  injectToastStyles();

  // Inject translation-specific styles
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

        // Show indeterminate progress bar during translation
        showProgressBar(true);

        // Show toast notification for selection translation
        showToast({
          id: TRANSLATION_TOAST_ID,
          title: 'テキスト選択翻訳を開始しました…',
          type: 'info',
          duration: 0, // Persistent until translation completes
        });

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
      // Show toast notification for page translation start
      showToast({
        id: TRANSLATION_TOAST_ID,
        title: 'ページ全体翻訳を開始しました…',
        type: 'info',
        duration: 0, // Persistent until translation completes
      });
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
      // Update toast with progress
      updateToast(TRANSLATION_TOAST_ID, {
        title: '翻訳処理中…',
        message: `${progressPayload.translatedNodes} / ${progressPayload.totalNodes} 段落`,
      });
      break;
    }

    case 'APPLY_SINGLE_NODE_TRANSLATION': {
      const singlePayload = (message as ApplySingleNodeTranslationMessage).payload;
      applySingleNodeTranslation(singlePayload.nodeId, singlePayload.translatedText);
      updateProgressBar(singlePayload.translatedNodes, singlePayload.totalNodes);
      // Update toast with progress
      updateToast(TRANSLATION_TOAST_ID, {
        title: '翻訳処理中…',
        message: `${singlePayload.translatedNodes} / ${singlePayload.totalNodes} 段落`,
      });
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
      // Show completion toast
      updateToast(TRANSLATION_TOAST_ID, {
        title: '翻訳が完了しました',
        type: 'success',
        duration: 3000, // Auto-dismiss after 3 seconds
      });
      break;
    }

    case 'TRANSLATE_TEXT_ERROR':
      removeProgressBar();
      showTranslationError((message as ExtensionMessage & { type: 'TRANSLATE_TEXT_ERROR' }).payload.message);
      // Show error toast
      updateToast(TRANSLATION_TOAST_ID, {
        title: '翻訳エラー',
        message: (message as ExtensionMessage & { type: 'TRANSLATE_TEXT_ERROR' }).payload.message,
        type: 'error',
        duration: 5000,
      });
      break;

    case 'SHOW_PROGRESS_BAR': {
      const showPayload = (message as { payload: { indeterminate: boolean; translationKind?: 'page' | 'selection' } }).payload;
      showProgressBar(showPayload.indeterminate);

      // Show toast notification based on translation kind
      if (showPayload.translationKind === 'selection') {
        showToast({
          id: TRANSLATION_TOAST_ID,
          title: 'テキスト選択翻訳を開始しました…',
          type: 'info',
          duration: 0, // Persistent until translation completes
        });
      } else if (showPayload.translationKind === 'page') {
        showToast({
          id: TRANSLATION_TOAST_ID,
          title: 'ページ全体翻訳を開始しました…',
          type: 'info',
          duration: 0, // Persistent until translation completes
        });
      }
      break;
    }

    case 'HIDE_PROGRESS_BAR':
      removeProgressBar();
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

  // Show indeterminate progress bar during translation
  showProgressBar(true);

  // Show toast notification for selection translation
  showToast({
    id: TRANSLATION_TOAST_ID,
    title: 'テキスト選択翻訳を開始しました…',
    type: 'info',
    duration: 0, // Persistent until translation completes
  });

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
    removeProgressBar();
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

  // Reset drag state
  dragState = null;

  translationPopup = document.createElement('div');
  translationPopup.id = 'lta-translation-popup';
  translationPopup.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    z-index: 2147483647;
    min-width: 200px;
    max-width: 400px;
    max-height: 350px;
    padding: 12px;
    background: white;
    color: #1f2937;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    font-size: 14px;
    line-height: 1.5;
    display: flex;
    flex-direction: column;
    cursor: grab;
    border: 3px solid #3b82f6;
  `;

  // Check if popup would go off screen and adjust initial position
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let adjustedX = x;
  let adjustedY = y;

  if (x + 400 > viewportWidth) {
    adjustedX = Math.max(10, viewportWidth - 420);
  }
  if (y + 350 > viewportHeight) {
    adjustedY = Math.max(10, viewportHeight - 370);
  }

  translationPopup.style.left = `${adjustedX}px`;
  translationPopup.style.top = `${adjustedY}px`;

  // Initialize drag handlers on the popup itself
  initializeDragHandlers(translationPopup);

  // Add header (for title display)
  const header = createPopupHeader();
  translationPopup.appendChild(header);

  // Create content container
  const contentContainer = document.createElement('div');
  contentContainer.id = 'lta-popup-content';
  contentContainer.style.cssText = `
    flex: 1;
    overflow: auto;
    min-height: 0;
    cursor: default;
  `;
  translationPopup.appendChild(contentContainer);

  document.body.appendChild(translationPopup);
}

function updateTranslationPopupContent(content: string): void {
  if (!translationPopup) {
    return;
  }

  // Find the content container
  const contentContainer = translationPopup.querySelector('#lta-popup-content');
  if (!contentContainer) {
    return;
  }

  // Clear existing content safely
  contentContainer.textContent = '';

  const contentDiv = document.createElement('div');
  contentDiv.id = 'lta-popup-text-content';
  contentDiv.style.whiteSpace = 'pre-wrap';
  contentDiv.style.wordBreak = 'break-word';
  contentDiv.style.cursor = 'text';
  contentDiv.style.userSelect = 'text';
  contentDiv.textContent = content;

  contentContainer.appendChild(contentDiv);
}

function showTranslationResult(text: string): void {
  if (!translationPopup) {
    return;
  }

  // Find the content container
  const contentContainer = translationPopup.querySelector('#lta-popup-content');
  if (!contentContainer) {
    return;
  }

  // Plain text: remove multiple newlines and trim
  const plainText = text.replace(/\n+/g, ' ').trim();

  // Clear existing content safely
  contentContainer.textContent = '';

  // Create content div
  const contentDiv = document.createElement('div');
  contentDiv.id = 'lta-popup-text-content';
  contentDiv.style.whiteSpace = 'pre-wrap';
  contentDiv.style.wordBreak = 'break-word';
  contentDiv.style.marginBottom = '12px';
  contentDiv.style.cursor = 'text';
  contentDiv.style.userSelect = 'text';
  contentDiv.textContent = text;
  contentContainer.appendChild(contentDiv);

  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '8px';
  buttonContainer.style.justifyContent = 'flex-end';
  buttonContainer.style.flexWrap = 'wrap';
  buttonContainer.style.paddingTop = '8px';
  buttonContainer.style.borderTop = '1px solid #e5e7eb';
  buttonContainer.style.marginTop = 'auto';

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
  contentContainer.appendChild(buttonContainer);
}

function updateStreamingResult(text: string): void {
  updateTranslationPopupContent(text);
}

function finalizeTranslationResult(text: string): void {
  removeProgressBar();
  showTranslationResult(text);
}

function showTranslationError(message: string): void {
  if (!translationPopup) {
    return;
  }

  // Find the content container
  const contentContainer = translationPopup.querySelector('#lta-popup-content');
  if (!contentContainer) {
    return;
  }

  // Clear existing content safely
  contentContainer.textContent = '';

  // Create error message div
  const errorDiv = document.createElement('div');
  errorDiv.style.color = '#dc2626';
  errorDiv.style.marginBottom = '12px';

  const strongEl = document.createElement('strong');
  strongEl.textContent = 'エラー:';
  errorDiv.appendChild(strongEl);
  errorDiv.appendChild(document.createTextNode(' ' + message));
  contentContainer.appendChild(errorDiv);

  // Create close button using DOM API
  const closeBtn = createButton(
    'lta-close-btn',
    '閉じる',
    MDI_CLOSE,
    { background: '#ef4444', color: 'white' },
  );
  closeBtn.addEventListener('click', hideTranslationUI);
  contentContainer.appendChild(closeBtn);
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
  // Clean up drag state
  dragState = null;
}

/**
 * Initialize drag functionality for the entire popup
 */
function initializeDragHandlers(popup: HTMLDivElement): void {
  popup.addEventListener('mousedown', handleDragStart);
  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('mouseup', handleDragEnd);
}

function handleDragStart(e: MouseEvent): void {
  if (!translationPopup) {
    return;
  }

  const target = e.target as HTMLElement;

  // Don't start drag from interactive elements (buttons, text content)
  if (
    target.closest('button') ||
    target.closest('#lta-popup-text-content') ||
    target.tagName === 'BUTTON'
  ) {
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  const rect = translationPopup.getBoundingClientRect();
  dragState = {
    isDragging: true,
    startX: e.clientX,
    startY: e.clientY,
    initialLeft: rect.left,
    initialTop: rect.top,
  };

  // Add dragging class for visual feedback
  translationPopup.classList.add('lta-dragging');
}

function handleDragMove(e: MouseEvent): void {
  if (!dragState?.isDragging || !translationPopup) {
    return;
  }

  e.preventDefault();

  const deltaX = e.clientX - dragState.startX;
  const deltaY = e.clientY - dragState.startY;

  let newLeft = dragState.initialLeft + deltaX;
  let newTop = dragState.initialTop + deltaY;

  // Constrain to viewport bounds
  const popupRect = translationPopup.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Ensure at least 50px of popup is visible on each edge
  const minVisible = 50;
  newLeft = Math.max(-popupRect.width + minVisible, Math.min(viewportWidth - minVisible, newLeft));
  newTop = Math.max(0, Math.min(viewportHeight - minVisible, newTop));

  translationPopup.style.left = `${newLeft}px`;
  translationPopup.style.top = `${newTop}px`;
}

function handleDragEnd(): void {
  if (dragState?.isDragging && translationPopup) {
    translationPopup.classList.remove('lta-dragging');
  }
  dragState = null;
}

/**
 * Create a compact header for the popup (non-draggable, just title)
 */
function createPopupHeader(): HTMLDivElement {
  const header = document.createElement('div');
  header.id = 'lta-popup-header';
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    margin: -12px -12px 10px -12px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    border-radius: 4px 4px 0 0;
    user-select: none;
  `;

  // Left side: drag icon + title
  const leftSection = document.createElement('div');
  leftSection.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    color: white;
    font-size: 11px;
    font-weight: 500;
  `;
  leftSection.appendChild(createSvgIcon(MDI_DRAG, 14, 'rgba(255,255,255,0.8)'));
  leftSection.appendChild(document.createTextNode('翻訳結果（枠をドラッグで移動）'));

  header.appendChild(leftSection);

  return header;
}

/**
 * Apply translation to a single node (for progressive rendering)
 */
function applySingleNodeTranslation(nodeId: string, translatedText: string): void {
  const nodeData = translatedNodes.get(nodeId);
  if (!nodeData || !translatedText) {
    return;
  }

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

  // Show completion toast notification
  updateToast(TRANSLATION_TOAST_ID, {
    title: '翻訳が完了しました',
    message: `${nodeIds.length}個のテキストを翻訳しました`,
    type: 'success',
    duration: 4000, // Auto-dismiss after 4 seconds
  });
}

async function startPageTranslation(): Promise<void> {
  // Show progress bar (determinate mode for page translation)
  showProgressBar(false);

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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
