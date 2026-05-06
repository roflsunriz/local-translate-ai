/**
 * Content Script - Handles text selection and translation popup
 */

import type { ExtensionMessage, ApplySingleNodeTranslationMessage } from '@/types/messages';
import type { UILanguage } from '@/types/settings';
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
const MDI_STOP = 'M18,18H6V6H18V18Z';

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
let pageStopButton: HTMLButtonElement | null = null;
let activeSelectionRequestId: string | null = null;
let activePageRequestId: string | null = null;

// Drag state for popup
interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  initialLeft: number;
  initialTop: number;
}
let dragState: DragState | null = null;

interface ResizeState {
  isResizing: boolean;
  startX: number;
  startY: number;
  initialWidth: number;
  initialHeight: number;
}
let resizeState: ResizeState | null = null;

// Page translation state
const translatedNodes = new Map<string, { node: Text; originalText: string }>();

// Settings state
let popupCloseOnOutsideAction = false;
let uiLanguage: UILanguage = 'auto';

type ContentTranslationKey =
  | 'content.translate'
  | 'content.translating'
  | 'content.selectionStarted'
  | 'content.pageStarted'
  | 'content.processing'
  | 'content.paragraphProgress'
  | 'content.complete'
  | 'content.error'
  | 'content.pageError'
  | 'content.cancelled'
  | 'content.pageCancelled'
  | 'content.unknownError'
  | 'content.stop'
  | 'content.stopPage'
  | 'content.close'
  | 'content.copied'
  | 'content.copyFormatted'
  | 'content.copyPlain'
  | 'content.errorLabel'
  | 'content.popupTitle'
  | 'content.pageCompleteMessage';

type ContentLanguage = Exclude<UILanguage, 'auto'>;

const CONTENT_TRANSLATIONS: Record<ContentLanguage, Record<ContentTranslationKey, string>> = {
  ja: {
    'content.translate': '翻訳',
    'content.translating': '翻訳中...',
    'content.selectionStarted': 'テキスト選択翻訳を開始しました…',
    'content.pageStarted': 'ページ全体翻訳を開始しました…',
    'content.processing': '翻訳処理中…',
    'content.paragraphProgress': '{{completed}} / {{total}} 段落',
    'content.complete': '翻訳が完了しました',
    'content.error': '翻訳エラー',
    'content.pageError': 'ページ翻訳エラー',
    'content.cancelled': '翻訳を停止しました',
    'content.pageCancelled': 'ページ翻訳を停止しました',
    'content.unknownError': '不明なエラー',
    'content.stop': '停止',
    'content.stopPage': 'ページ翻訳を停止',
    'content.close': '閉じる',
    'content.copied': 'コピー完了!',
    'content.copyFormatted': 'フォーマット済み',
    'content.copyPlain': '1行',
    'content.errorLabel': 'エラー:',
    'content.popupTitle': '翻訳結果（ドラッグで移動・右下でサイズ変更）',
    'content.pageCompleteMessage': '{{count}}個のテキストを翻訳しました',
  },
  en: {
    'content.translate': 'Translate',
    'content.translating': 'Translating...',
    'content.selectionStarted': 'Selection translation started...',
    'content.pageStarted': 'Page translation started...',
    'content.processing': 'Translating...',
    'content.paragraphProgress': '{{completed}} / {{total}} paragraphs',
    'content.complete': 'Translation complete',
    'content.error': 'Translation error',
    'content.pageError': 'Page translation error',
    'content.cancelled': 'Translation stopped',
    'content.pageCancelled': 'Page translation stopped',
    'content.unknownError': 'Unknown error',
    'content.stop': 'Stop',
    'content.stopPage': 'Stop page translation',
    'content.close': 'Close',
    'content.copied': 'Copied!',
    'content.copyFormatted': 'Formatted',
    'content.copyPlain': 'Plain',
    'content.errorLabel': 'Error:',
    'content.popupTitle': 'Translation result (drag to move, resize from bottom-right)',
    'content.pageCompleteMessage': 'Translated {{count}} texts',
  },
  zh: {
    'content.translate': '翻译',
    'content.translating': '正在翻译...',
    'content.selectionStarted': '已开始选中文本翻译...',
    'content.pageStarted': '已开始整页翻译...',
    'content.processing': '正在翻译...',
    'content.paragraphProgress': '{{completed}} / {{total}} 段落',
    'content.complete': '翻译完成',
    'content.error': '翻译错误',
    'content.pageError': '页面翻译错误',
    'content.cancelled': '翻译已停止',
    'content.pageCancelled': '页面翻译已停止',
    'content.unknownError': '未知错误',
    'content.stop': '停止',
    'content.stopPage': '停止页面翻译',
    'content.close': '关闭',
    'content.copied': '已复制!',
    'content.copyFormatted': '保留格式',
    'content.copyPlain': '单行',
    'content.errorLabel': '错误:',
    'content.popupTitle': '翻译结果（拖动移动，右下角调整大小）',
    'content.pageCompleteMessage': '已翻译 {{count}} 个文本',
  },
  ko: {
    'content.translate': '번역',
    'content.translating': '번역 중...',
    'content.selectionStarted': '선택 텍스트 번역을 시작했습니다...',
    'content.pageStarted': '전체 페이지 번역을 시작했습니다...',
    'content.processing': '번역 중...',
    'content.paragraphProgress': '{{completed}} / {{total}} 단락',
    'content.complete': '번역 완료',
    'content.error': '번역 오류',
    'content.pageError': '페이지 번역 오류',
    'content.cancelled': '번역이 중지되었습니다',
    'content.pageCancelled': '페이지 번역이 중지되었습니다',
    'content.unknownError': '알 수 없는 오류',
    'content.stop': '중지',
    'content.stopPage': '페이지 번역 중지',
    'content.close': '닫기',
    'content.copied': '복사 완료!',
    'content.copyFormatted': '서식 유지',
    'content.copyPlain': '한 줄',
    'content.errorLabel': '오류:',
    'content.popupTitle': '번역 결과 (드래그로 이동, 오른쪽 아래에서 크기 조정)',
    'content.pageCompleteMessage': '{{count}}개 텍스트를 번역했습니다',
  },
  es: {
    'content.translate': 'Traducir',
    'content.translating': 'Traduciendo...',
    'content.selectionStarted': 'Traducción de selección iniciada...',
    'content.pageStarted': 'Traducción de página iniciada...',
    'content.processing': 'Traduciendo...',
    'content.paragraphProgress': '{{completed}} / {{total}} párrafos',
    'content.complete': 'Traducción completada',
    'content.error': 'Error de traducción',
    'content.pageError': 'Error de traducción de página',
    'content.cancelled': 'Traducción detenida',
    'content.pageCancelled': 'Traducción de página detenida',
    'content.unknownError': 'Error desconocido',
    'content.stop': 'Detener',
    'content.stopPage': 'Detener traducción de página',
    'content.close': 'Cerrar',
    'content.copied': 'Copiado!',
    'content.copyFormatted': 'Con formato',
    'content.copyPlain': 'Una línea',
    'content.errorLabel': 'Error:',
    'content.popupTitle': 'Resultado de traducción (arrastra para mover, redimensiona desde abajo a la derecha)',
    'content.pageCompleteMessage': 'Se tradujeron {{count}} textos',
  },
  pt: {
    'content.translate': 'Traduzir',
    'content.translating': 'Traduzindo...',
    'content.selectionStarted': 'Tradução da seleção iniciada...',
    'content.pageStarted': 'Tradução da página iniciada...',
    'content.processing': 'Traduzindo...',
    'content.paragraphProgress': '{{completed}} / {{total}} parágrafos',
    'content.complete': 'Tradução concluída',
    'content.error': 'Erro de tradução',
    'content.pageError': 'Erro de tradução da página',
    'content.cancelled': 'Tradução parada',
    'content.pageCancelled': 'Tradução da página parada',
    'content.unknownError': 'Erro desconhecido',
    'content.stop': 'Parar',
    'content.stopPage': 'Parar tradução da página',
    'content.close': 'Fechar',
    'content.copied': 'Copiado!',
    'content.copyFormatted': 'Formatado',
    'content.copyPlain': 'Uma linha',
    'content.errorLabel': 'Erro:',
    'content.popupTitle': 'Resultado da tradução (arraste para mover, redimensione pelo canto inferior direito)',
    'content.pageCompleteMessage': '{{count}} textos traduzidos',
  },
  ru: {
    'content.translate': 'Перевести',
    'content.translating': 'Перевод...',
    'content.selectionStarted': 'Перевод выделенного текста запущен...',
    'content.pageStarted': 'Перевод всей страницы запущен...',
    'content.processing': 'Перевод...',
    'content.paragraphProgress': '{{completed}} / {{total}} абзацев',
    'content.complete': 'Перевод завершен',
    'content.error': 'Ошибка перевода',
    'content.pageError': 'Ошибка перевода страницы',
    'content.cancelled': 'Перевод остановлен',
    'content.pageCancelled': 'Перевод страницы остановлен',
    'content.unknownError': 'Неизвестная ошибка',
    'content.stop': 'Остановить',
    'content.stopPage': 'Остановить перевод страницы',
    'content.close': 'Закрыть',
    'content.copied': 'Скопировано!',
    'content.copyFormatted': 'С форматированием',
    'content.copyPlain': 'В одну строку',
    'content.errorLabel': 'Ошибка:',
    'content.popupTitle': 'Результат перевода (перетащите для перемещения, измените размер снизу справа)',
    'content.pageCompleteMessage': 'Переведено {{count}} текстов',
  },
  hi: {
    'content.translate': 'अनुवाद करें',
    'content.translating': 'अनुवाद हो रहा है...',
    'content.selectionStarted': 'चयनित टेक्स्ट का अनुवाद शुरू हुआ...',
    'content.pageStarted': 'पूरे पेज का अनुवाद शुरू हुआ...',
    'content.processing': 'अनुवाद हो रहा है...',
    'content.paragraphProgress': '{{completed}} / {{total}} अनुच्छेद',
    'content.complete': 'अनुवाद पूरा हुआ',
    'content.error': 'अनुवाद त्रुटि',
    'content.pageError': 'पेज अनुवाद त्रुटि',
    'content.cancelled': 'अनुवाद रोक दिया गया',
    'content.pageCancelled': 'पेज अनुवाद रोक दिया गया',
    'content.unknownError': 'अज्ञात त्रुटि',
    'content.stop': 'रोकें',
    'content.stopPage': 'पेज अनुवाद रोकें',
    'content.close': 'बंद करें',
    'content.copied': 'कॉपी हो गया!',
    'content.copyFormatted': 'फ़ॉर्मेट सहित',
    'content.copyPlain': 'एक पंक्ति',
    'content.errorLabel': 'त्रुटि:',
    'content.popupTitle': 'अनुवाद परिणाम (खींचकर ले जाएं, नीचे-दाएं से आकार बदलें)',
    'content.pageCompleteMessage': '{{count}} टेक्स्ट का अनुवाद किया गया',
  },
  ar: {
    'content.translate': 'ترجمة',
    'content.translating': 'جارٍ الترجمة...',
    'content.selectionStarted': 'بدأت ترجمة النص المحدد...',
    'content.pageStarted': 'بدأت ترجمة الصفحة بالكامل...',
    'content.processing': 'جارٍ الترجمة...',
    'content.paragraphProgress': '{{completed}} / {{total}} فقرة',
    'content.complete': 'اكتملت الترجمة',
    'content.error': 'خطأ في الترجمة',
    'content.pageError': 'خطأ في ترجمة الصفحة',
    'content.cancelled': 'تم إيقاف الترجمة',
    'content.pageCancelled': 'تم إيقاف ترجمة الصفحة',
    'content.unknownError': 'خطأ غير معروف',
    'content.stop': 'إيقاف',
    'content.stopPage': 'إيقاف ترجمة الصفحة',
    'content.close': 'إغلاق',
    'content.copied': 'تم النسخ!',
    'content.copyFormatted': 'مع التنسيق',
    'content.copyPlain': 'سطر واحد',
    'content.errorLabel': 'خطأ:',
    'content.popupTitle': 'نتيجة الترجمة (اسحب للتحريك، وغير الحجم من أسفل اليمين)',
    'content.pageCompleteMessage': 'تمت ترجمة {{count}} نص',
  },
  fr: {
    'content.translate': 'Traduire',
    'content.translating': 'Traduction...',
    'content.selectionStarted': 'Traduction de la sélection démarrée...',
    'content.pageStarted': 'Traduction de la page démarrée...',
    'content.processing': 'Traduction...',
    'content.paragraphProgress': '{{completed}} / {{total}} paragraphes',
    'content.complete': 'Traduction terminée',
    'content.error': 'Erreur de traduction',
    'content.pageError': 'Erreur de traduction de page',
    'content.cancelled': 'Traduction arrêtée',
    'content.pageCancelled': 'Traduction de page arrêtée',
    'content.unknownError': 'Erreur inconnue',
    'content.stop': 'Arrêter',
    'content.stopPage': 'Arrêter la traduction de page',
    'content.close': 'Fermer',
    'content.copied': 'Copié!',
    'content.copyFormatted': 'Formaté',
    'content.copyPlain': 'Une ligne',
    'content.errorLabel': 'Erreur:',
    'content.popupTitle': 'Résultat de traduction (faites glisser pour déplacer, redimensionnez en bas à droite)',
    'content.pageCompleteMessage': '{{count}} textes traduits',
  },
  bn: {
    'content.translate': 'অনুবাদ করুন',
    'content.translating': 'অনুবাদ হচ্ছে...',
    'content.selectionStarted': 'নির্বাচিত টেক্সট অনুবাদ শুরু হয়েছে...',
    'content.pageStarted': 'সম্পূর্ণ পেজ অনুবাদ শুরু হয়েছে...',
    'content.processing': 'অনুবাদ হচ্ছে...',
    'content.paragraphProgress': '{{completed}} / {{total}} অনুচ্ছেদ',
    'content.complete': 'অনুবাদ সম্পন্ন হয়েছে',
    'content.error': 'অনুবাদ ত্রুটি',
    'content.pageError': 'পেজ অনুবাদ ত্রুটি',
    'content.cancelled': 'অনুবাদ বন্ধ করা হয়েছে',
    'content.pageCancelled': 'পেজ অনুবাদ বন্ধ করা হয়েছে',
    'content.unknownError': 'অজানা ত্রুটি',
    'content.stop': 'বন্ধ করুন',
    'content.stopPage': 'পেজ অনুবাদ বন্ধ করুন',
    'content.close': 'বন্ধ করুন',
    'content.copied': 'কপি হয়েছে!',
    'content.copyFormatted': 'ফরম্যাটসহ',
    'content.copyPlain': 'এক লাইন',
    'content.errorLabel': 'ত্রুটি:',
    'content.popupTitle': 'অনুবাদ ফলাফল (সরাতে ড্র্যাগ করুন, নিচের ডান দিক থেকে আকার পরিবর্তন করুন)',
    'content.pageCompleteMessage': '{{count}}টি টেক্সট অনুবাদ হয়েছে',
  },
  id: {
    'content.translate': 'Terjemahkan',
    'content.translating': 'Menerjemahkan...',
    'content.selectionStarted': 'Terjemahan teks terpilih dimulai...',
    'content.pageStarted': 'Terjemahan halaman dimulai...',
    'content.processing': 'Menerjemahkan...',
    'content.paragraphProgress': '{{completed}} / {{total}} paragraf',
    'content.complete': 'Terjemahan selesai',
    'content.error': 'Kesalahan terjemahan',
    'content.pageError': 'Kesalahan terjemahan halaman',
    'content.cancelled': 'Terjemahan dihentikan',
    'content.pageCancelled': 'Terjemahan halaman dihentikan',
    'content.unknownError': 'Kesalahan tidak diketahui',
    'content.stop': 'Hentikan',
    'content.stopPage': 'Hentikan terjemahan halaman',
    'content.close': 'Tutup',
    'content.copied': 'Disalin!',
    'content.copyFormatted': 'Berformat',
    'content.copyPlain': 'Satu baris',
    'content.errorLabel': 'Kesalahan:',
    'content.popupTitle': 'Hasil terjemahan (seret untuk memindahkan, ubah ukuran dari kanan bawah)',
    'content.pageCompleteMessage': '{{count}} teks diterjemahkan',
  },
};

function tr(key: string, params?: Record<string, string | number>): string {
  const browserLanguage = navigator.language.split('-')[0];
  const resolvedLanguage = uiLanguage === 'auto' ? browserLanguage : uiLanguage;
  const language = resolvedLanguage in CONTENT_TRANSLATIONS
    ? resolvedLanguage as ContentLanguage
    : 'en';
  let value = CONTENT_TRANSLATIONS[language][key as ContentTranslationKey] ?? key;

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(paramValue));
    }
  }

  return value;
}

// Load settings from storage
async function loadSettings(): Promise<void> {
  try {
    const result = await browser.storage.local.get('settings');
    if (result['settings'] && typeof result['settings'] === 'object') {
      const settings = result['settings'] as {
        popupCloseOnOutsideAction?: boolean;
        uiLanguage?: UILanguage;
      };
      popupCloseOnOutsideAction = settings.popupCloseOnOutsideAction ?? false;
      uiLanguage = settings.uiLanguage ?? 'auto';
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Handle settings changes
function handleStorageChange(
  changes: Record<string, browser.storage.StorageChange>,
  _areaName: string
): void {
  if (changes['settings']?.newValue) {
    const newSettings = changes['settings'].newValue as {
      popupCloseOnOutsideAction?: boolean;
      uiLanguage?: UILanguage;
    };
    popupCloseOnOutsideAction = newSettings.popupCloseOnOutsideAction ?? false;
    uiLanguage = newSettings.uiLanguage ?? 'auto';
  }
}

// Conditional popup hide for scroll/resize
function handleScrollResize(): void {
  if (popupCloseOnOutsideAction) {
    hideTranslationUI();
  }
}

// Initialize content script
function init(): void {
  // Load settings first
  void loadSettings();

  // Listen for settings changes
  browser.storage.onChanged.addListener(handleStorageChange);

  // Listen for text selection
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('keyup', handleKeyUp);

  // Listen for messages from background script
  browser.runtime.onMessage.addListener(handleMessage);

  // Clean up popup on scroll/resize (conditional based on settings)
  document.addEventListener('scroll', handleScrollResize, { passive: true });
  window.addEventListener('resize', handleScrollResize, { passive: true });

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
        const requestId = crypto.randomUUID();
        activeSelectionRequestId = requestId;
        updateTranslationPopupContent(tr('content.translating'), true);

        // Show indeterminate progress bar during translation
        showProgressBar(true);

        // Show toast notification for selection translation
        showToast({
          id: TRANSLATION_TOAST_ID,
          title: tr('content.selectionStarted'),
          type: 'info',
          duration: 0, // Persistent until translation completes
        });

        void browser.runtime.sendMessage({
          type: 'TRANSLATE_TEXT',
          timestamp: Date.now(),
          payload: {
            requestId,
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
        title: tr('content.pageStarted'),
        type: 'info',
        duration: 0, // Persistent until translation completes
      });
      void startPageTranslation();
      break;

    case 'GET_PAGE_TEXT_NODES':
      return Promise.resolve(getPageTextNodes());

    case 'APPLY_PAGE_TRANSLATION': {
      const applyPayload = (message as { payload: { nodeIds: string[]; translatedTexts: string[] } }).payload;
      activePageRequestId = null;
      removePageStopButton();
      applyPageTranslation(applyPayload.nodeIds, applyPayload.translatedTexts);
      break;
    }

    case 'TRANSLATE_PAGE_ERROR': {
      const errorPayload = (message as ExtensionMessage & { type: 'TRANSLATE_PAGE_ERROR' }).payload;
      if (activePageRequestId !== errorPayload.requestId) {
        break;
      }
      activePageRequestId = null;
      removeProgressBar();
      removePageStopButton();
      updateToast(TRANSLATION_TOAST_ID, {
        title: errorPayload.code === 'CANCELLED' ? tr('content.cancelled') : tr('content.pageError'),
        message: errorPayload.message,
        type: errorPayload.code === 'CANCELLED' ? 'warning' : 'error',
        duration: 5000,
      });
      break;
    }

    case 'TRANSLATE_PAGE_PROGRESS': {
      const progressPayload = (message as { payload: { translatedNodes: number; totalNodes: number } }).payload;
      if (!activePageRequestId) {
        break;
      }
      updateProgressBar(progressPayload.translatedNodes, progressPayload.totalNodes);
      // Update toast with progress
      updateToast(TRANSLATION_TOAST_ID, {
        title: tr('content.processing'),
        message: tr('content.paragraphProgress', {
          completed: progressPayload.translatedNodes,
          total: progressPayload.totalNodes,
        }),
      });
      break;
    }

    case 'APPLY_SINGLE_NODE_TRANSLATION': {
      const singlePayload = (message as ApplySingleNodeTranslationMessage).payload;
      applySingleNodeTranslation(singlePayload.nodeId, singlePayload.translatedText);
      updateProgressBar(singlePayload.translatedNodes, singlePayload.totalNodes);
      // Update toast with progress
      updateToast(TRANSLATION_TOAST_ID, {
        title: tr('content.processing'),
        message: tr('content.paragraphProgress', {
          completed: singlePayload.translatedNodes,
          total: singlePayload.totalNodes,
        }),
      });
      break;
    }

    case 'TRANSLATE_TEXT_RESULT': {
      const resultPayload = (message as ExtensionMessage & { type: 'TRANSLATE_TEXT_RESULT' }).payload;
      if (activeSelectionRequestId && resultPayload.requestId !== activeSelectionRequestId) {
        break;
      }
      activeSelectionRequestId = null;
      showTranslationResult(resultPayload.translatedText);
      break;
    }

    case 'TRANSLATE_TEXT_STREAM_CHUNK': {
      const chunkPayload = (message as ExtensionMessage & { type: 'TRANSLATE_TEXT_STREAM_CHUNK' }).payload;
      if (activeSelectionRequestId && chunkPayload.requestId !== activeSelectionRequestId) {
        break;
      }
      updateStreamingResult(chunkPayload.accumulated);
      break;
    }

    case 'TRANSLATE_TEXT_STREAM_END': {
      const endPayload = (message as ExtensionMessage & { type: 'TRANSLATE_TEXT_STREAM_END' }).payload;
      if (activeSelectionRequestId && endPayload.requestId !== activeSelectionRequestId) {
        break;
      }
      activeSelectionRequestId = null;
      finalizeTranslationResult(endPayload.translatedText);
      // Show completion toast
      updateToast(TRANSLATION_TOAST_ID, {
        title: tr('content.complete'),
        type: 'success',
        duration: 3000, // Auto-dismiss after 3 seconds
      });
      break;
    }

    case 'TRANSLATE_TEXT_ERROR': {
      const errorPayload = (message as ExtensionMessage & { type: 'TRANSLATE_TEXT_ERROR' }).payload;
      if (activeSelectionRequestId !== errorPayload.requestId) {
        break;
      }
      removeProgressBar();
      activeSelectionRequestId = null;
      showTranslationError(errorPayload.message);
      // Show error toast
      updateToast(TRANSLATION_TOAST_ID, {
        title: errorPayload.code === 'CANCELLED' ? tr('content.cancelled') : tr('content.error'),
        message: errorPayload.message,
        type: errorPayload.code === 'CANCELLED' ? 'warning' : 'error',
        duration: 5000,
      });
      break;
    }

    case 'SHOW_PROGRESS_BAR': {
      const showPayload = (message as { payload: { indeterminate: boolean; requestId?: string; translationKind?: 'page' | 'selection' } }).payload;
      showProgressBar(showPayload.indeterminate);

      // Show toast notification based on translation kind
      if (showPayload.translationKind === 'selection') {
        activeSelectionRequestId = showPayload.requestId ?? activeSelectionRequestId;
        showToast({
          id: TRANSLATION_TOAST_ID,
          title: tr('content.selectionStarted'),
          type: 'info',
          duration: 0, // Persistent until translation completes
        });
      } else if (showPayload.translationKind === 'page') {
        activePageRequestId = showPayload.requestId ?? activePageRequestId;
        showPageStopButton();
        showToast({
          id: TRANSLATION_TOAST_ID,
          title: tr('content.pageStarted'),
          type: 'info',
          duration: 0, // Persistent until translation completes
        });
      }
      break;
    }

    case 'HIDE_PROGRESS_BAR':
      removeProgressBar();
      removePageStopButton();
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
    // テキストが選択されていない場合
    // 翻訳ボタンは常に非表示にする
    if (translationButton) {
      translationButton.remove();
      translationButton = null;
    }
    // ポップアップは設定に従って閉じる（popupCloseOnOutsideAction が true の場合のみ）
    if (popupCloseOnOutsideAction && translationPopup) {
      translationPopup.remove();
      translationPopup = null;
      dragState = null;
    }
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
  translationButton.appendChild(document.createTextNode(tr('content.translate')));
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
  const requestId = crypto.randomUUID();

  showTranslationPopup(buttonRect.left, buttonRect.bottom + 10);
  activeSelectionRequestId = requestId;
  updateTranslationPopupContent(tr('content.translating'), true);

  // Show indeterminate progress bar during translation
  showProgressBar(true);

  // Show toast notification for selection translation
  showToast({
    id: TRANSLATION_TOAST_ID,
    title: tr('content.selectionStarted'),
    type: 'info',
    duration: 0, // Persistent until translation completes
  });

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
    const message = error instanceof Error ? error.message : tr('content.unknownError');
    activeSelectionRequestId = null;
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
  resizeState = null;

  translationPopup = document.createElement('div');
  translationPopup.id = 'lta-translation-popup';
  translationPopup.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    z-index: 2147483647;
    width: 320px;
    height: 240px;
    min-width: 200px;
    min-height: 160px;
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
    box-sizing: border-box;
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
  initializeResizeHandlers(translationPopup);

  // Add header (for title display)
  const header = createPopupHeader();
  translationPopup.appendChild(header);

  // Create content container
  const contentContainer = document.createElement('div');
  contentContainer.id = 'lta-popup-content';
  contentContainer.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
    cursor: default;
  `;
  translationPopup.appendChild(contentContainer);

  const resizeHandle = createResizeHandle();
  translationPopup.appendChild(resizeHandle);

  document.body.appendChild(translationPopup);
}

function updateTranslationPopupContent(content: string, showStopButton = false): void {
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
  contentDiv.style.flex = '1';
  contentDiv.style.minHeight = '0';
  contentDiv.style.overflow = 'auto';
  contentDiv.style.cursor = 'text';
  contentDiv.style.userSelect = 'text';
  contentDiv.textContent = content;

  contentContainer.appendChild(contentDiv);

  if (showStopButton && activeSelectionRequestId) {
    contentContainer.appendChild(createSelectionStopButton());
  }
}

function createSelectionStopButton(): HTMLButtonElement {
  const stopBtn = createButton(
    'lta-stop-selection-btn',
    tr('content.stop'),
    MDI_STOP,
    { background: '#ef4444', color: 'white', marginTop: '12px' },
  );
  stopBtn.style.flexShrink = '0';
  stopBtn.addEventListener('click', () => {
    void cancelSelectionTranslation();
  });
  return stopBtn;
}

async function cancelSelectionTranslation(): Promise<void> {
  if (!activeSelectionRequestId) {
    return;
  }

  const requestId = activeSelectionRequestId;
  activeSelectionRequestId = null;

  await browser.runtime.sendMessage({
    type: 'CANCEL_TRANSLATION',
    timestamp: Date.now(),
    payload: { requestId },
  }).catch(console.error);

  removeProgressBar();
  showTranslationError(tr('content.cancelled'));
  updateToast(TRANSLATION_TOAST_ID, {
    title: tr('content.cancelled'),
    type: 'warning',
    duration: 3000,
  });
}

function showPageStopButton(): void {
  if (pageStopButton || !activePageRequestId) {
    return;
  }

  pageStopButton = createButton(
    'lta-stop-page-btn',
    tr('content.stopPage'),
    MDI_STOP,
    { background: '#ef4444', color: 'white' },
  );
  pageStopButton.style.position = 'fixed';
  pageStopButton.style.top = '12px';
  pageStopButton.style.right = '12px';
  pageStopButton.style.zIndex = '2147483647';
  pageStopButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
  pageStopButton.addEventListener('click', () => {
    void cancelPageTranslation();
  });
  document.body.appendChild(pageStopButton);
}

function removePageStopButton(): void {
  if (pageStopButton) {
    pageStopButton.remove();
    pageStopButton = null;
  }
}

async function cancelPageTranslation(): Promise<void> {
  if (!activePageRequestId) {
    return;
  }

  const requestId = activePageRequestId;
  activePageRequestId = null;

  await browser.runtime.sendMessage({
    type: 'CANCEL_TRANSLATION',
    timestamp: Date.now(),
    payload: { requestId },
  }).catch(console.error);

  removeProgressBar();
  removePageStopButton();
  updateToast(TRANSLATION_TOAST_ID, {
    title: tr('content.pageCancelled'),
    type: 'warning',
    duration: 3000,
  });
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
  contentDiv.style.flex = '1';
  contentDiv.style.minHeight = '0';
  contentDiv.style.overflow = 'auto';
  contentDiv.style.cursor = 'text';
  contentDiv.style.userSelect = 'text';
  contentDiv.textContent = text;
  contentContainer.appendChild(contentDiv);

  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '8px';
  buttonContainer.style.justifyContent = 'flex-end';
  buttonContainer.style.flexWrap = 'nowrap';
  buttonContainer.style.flexShrink = '0';
  buttonContainer.style.overflowX = 'auto';
  buttonContainer.style.paddingTop = '8px';
  buttonContainer.style.borderTop = '1px solid #e5e7eb';

  // Create buttons using DOM API
  const copyFormattedBtn = createButton(
    'lta-copy-formatted-btn',
    tr('content.copyFormatted'),
    MDI_CONTENT_COPY,
    { background: '#3b82f6', color: 'white' },
  );

  const copyPlainBtn = createButton(
    'lta-copy-plain-btn',
    tr('content.copyPlain'),
    MDI_CONTENT_COPY,
    { background: '#e5e7eb', color: '#374151' },
  );

  const closeBtn = createButton(
    'lta-close-btn',
    tr('content.close'),
    MDI_CLOSE,
    { background: '#ef4444', color: 'white' },
  );

  // Add event listeners
  copyFormattedBtn.addEventListener('click', () => {
    void navigator.clipboard.writeText(text);
    updateButtonContent(copyFormattedBtn, MDI_CHECK, tr('content.copied'));
    setTimeout(() => {
      updateButtonContent(copyFormattedBtn, MDI_CONTENT_COPY, tr('content.copyFormatted'));
    }, 2000);
  });

  copyPlainBtn.addEventListener('click', () => {
    void navigator.clipboard.writeText(plainText);
    updateButtonContent(copyPlainBtn, MDI_CHECK, tr('content.copied'));
    setTimeout(() => {
      updateButtonContent(copyPlainBtn, MDI_CONTENT_COPY, tr('content.copyPlain'));
    }, 2000);
  });

  closeBtn.addEventListener('click', hideTranslationUI);

  copyFormattedBtn.style.flexShrink = '0';
  copyPlainBtn.style.flexShrink = '0';
  closeBtn.style.flexShrink = '0';

  // Append buttons to container
  buttonContainer.appendChild(copyFormattedBtn);
  buttonContainer.appendChild(copyPlainBtn);
  buttonContainer.appendChild(closeBtn);
  contentContainer.appendChild(buttonContainer);
}

function updateStreamingResult(text: string): void {
  updateTranslationPopupContent(text, activeSelectionRequestId !== null);
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
  errorDiv.style.flex = '1';
  errorDiv.style.minHeight = '0';
  errorDiv.style.overflow = 'auto';

  const strongEl = document.createElement('strong');
  strongEl.textContent = tr('content.errorLabel');
  errorDiv.appendChild(strongEl);
  errorDiv.appendChild(document.createTextNode(' ' + message));
  contentContainer.appendChild(errorDiv);

  // Create close button using DOM API
  const closeBtn = createButton(
    'lta-close-btn',
    tr('content.close'),
    MDI_CLOSE,
    { background: '#ef4444', color: 'white' },
  );
  closeBtn.style.flexShrink = '0';
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
  resizeState = null;
}

/**
 * Initialize drag functionality for the entire popup
 */
function initializeDragHandlers(popup: HTMLDivElement): void {
  popup.addEventListener('mousedown', handleDragStart);
  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('mouseup', handleDragEnd);
}

function initializeResizeHandlers(popup: HTMLDivElement): void {
  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', handleResizeEnd);
  popup.addEventListener('dblclick', handleResizeReset);
}

function createResizeHandle(): HTMLDivElement {
  const handle = document.createElement('div');
  handle.id = 'lta-popup-resize-handle';
  handle.title = 'ドラッグしてサイズ変更';
  handle.style.cssText = `
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    opacity: 0.65;
    background:
      linear-gradient(135deg, transparent 0 50%, #6b7280 50% 60%, transparent 60% 100%),
      linear-gradient(135deg, transparent 0 65%, #6b7280 65% 75%, transparent 75% 100%),
      linear-gradient(135deg, transparent 0 80%, #6b7280 80% 90%, transparent 90% 100%);
  `;
  handle.addEventListener('mousedown', handleResizeStart);
  return handle;
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
    target.closest('#lta-popup-resize-handle') ||
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
  if (!dragState?.isDragging || resizeState?.isResizing || !translationPopup) {
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

function handleResizeStart(e: MouseEvent): void {
  if (!translationPopup) {
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  const rect = translationPopup.getBoundingClientRect();
  resizeState = {
    isResizing: true,
    startX: e.clientX,
    startY: e.clientY,
    initialWidth: rect.width,
    initialHeight: rect.height,
  };
  dragState = null;
  translationPopup.classList.add('lta-resizing');
  translationPopup.style.cursor = 'nwse-resize';
}

function handleResizeMove(e: MouseEvent): void {
  if (!resizeState?.isResizing || !translationPopup) {
    return;
  }

  e.preventDefault();

  const rect = translationPopup.getBoundingClientRect();
  const minWidth = 200;
  const minHeight = 160;
  const maxWidth = Math.max(minWidth, window.innerWidth - rect.left - 10);
  const maxHeight = Math.max(minHeight, window.innerHeight - rect.top - 10);
  const nextWidth = resizeState.initialWidth + e.clientX - resizeState.startX;
  const nextHeight = resizeState.initialHeight + e.clientY - resizeState.startY;

  translationPopup.style.width = `${Math.max(minWidth, Math.min(maxWidth, nextWidth))}px`;
  translationPopup.style.height = `${Math.max(minHeight, Math.min(maxHeight, nextHeight))}px`;
}

function handleResizeEnd(): void {
  if (resizeState?.isResizing && translationPopup) {
    translationPopup.classList.remove('lta-resizing');
    translationPopup.style.cursor = 'grab';
  }
  resizeState = null;
}

function handleResizeReset(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  if (!translationPopup || !target.closest('#lta-popup-resize-handle')) {
    return;
  }

  e.preventDefault();
  e.stopPropagation();
  translationPopup.style.width = '320px';
  translationPopup.style.height = '240px';
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
  leftSection.appendChild(document.createTextNode(tr('content.popupTitle')));

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
  removePageStopButton();
  activePageRequestId = null;

  // Show completion toast notification
  updateToast(TRANSLATION_TOAST_ID, {
    title: tr('content.complete'),
    message: tr('content.pageCompleteMessage', { count: nodeIds.length }),
    type: 'success',
    duration: 4000, // Auto-dismiss after 4 seconds
  });
}

async function startPageTranslation(): Promise<void> {
  const requestId = crypto.randomUUID();
  activePageRequestId = requestId;

  // Show progress bar (determinate mode for page translation)
  showProgressBar(false);
  showPageStopButton();

  // Request translation from background
  await browser.runtime.sendMessage({
    type: 'TRANSLATE_PAGE',
    timestamp: Date.now(),
    payload: {
      requestId,
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
