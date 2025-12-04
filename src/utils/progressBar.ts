/**
 * Progress Bar Utility
 * Provides a thin full-width progress bar at the top of the page
 * Used for translation progress indication
 */

const PROGRESS_BAR_ID = 'lta-progress-bar';
const STYLES_ID = 'lta-progress-bar-styles';

/**
 * Inject progress bar styles into the document
 * Safe to call multiple times - will not duplicate styles
 */
export function injectProgressBarStyles(doc: Document = document): void {
  if (doc.getElementById(STYLES_ID)) {
    return;
  }

  const style = doc.createElement('style');
  style.id = STYLES_ID;
  style.textContent = `
    .lta-progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
      z-index: 2147483647;
      transition: width 0.3s ease;
    }
    .lta-progress-bar.lta-indeterminate {
      width: 100% !important;
      background: linear-gradient(
        90deg,
        transparent 0%,
        #3b82f6 20%,
        #60a5fa 50%,
        #3b82f6 80%,
        transparent 100%
      );
      background-size: 200% 100%;
      animation: lta-progress-indeterminate 1.5s linear infinite;
    }
    @keyframes lta-progress-indeterminate {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }
  `;
  doc.head.appendChild(style);
}

/**
 * Show the progress bar
 * @param indeterminate - If true, shows animated indeterminate progress (no known completion %)
 * @param doc - Document to inject into (defaults to current document)
 */
export function showProgressBar(indeterminate = false, doc: Document = document): void {
  // Ensure styles are injected
  injectProgressBarStyles(doc);

  let progressBar = doc.getElementById(PROGRESS_BAR_ID);
  if (!progressBar) {
    progressBar = doc.createElement('div');
    progressBar.id = PROGRESS_BAR_ID;
    progressBar.className = 'lta-progress-bar';
    doc.body.appendChild(progressBar);
  }

  if (indeterminate) {
    progressBar.classList.add('lta-indeterminate');
    progressBar.style.width = '100%';
  } else {
    progressBar.classList.remove('lta-indeterminate');
    progressBar.style.width = '0%';
  }
}

/**
 * Update the progress bar percentage
 * @param completed - Number of completed items
 * @param total - Total number of items
 * @param doc - Document containing the progress bar
 */
export function updateProgressBar(completed: number, total: number, doc: Document = document): void {
  const progressBar = doc.getElementById(PROGRESS_BAR_ID);
  if (progressBar) {
    progressBar.classList.remove('lta-indeterminate');
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    progressBar.style.width = `${percent}%`;
  }
}

/**
 * Remove the progress bar with a smooth completion animation
 * @param doc - Document containing the progress bar
 */
export function removeProgressBar(doc: Document = document): void {
  const progressBar = doc.getElementById(PROGRESS_BAR_ID);
  if (progressBar) {
    progressBar.classList.remove('lta-indeterminate');
    progressBar.style.width = '100%';
    setTimeout(() => {
      progressBar.remove();
    }, 500);
  }
}

/**
 * Immediately remove the progress bar without animation
 * @param doc - Document containing the progress bar
 */
export function hideProgressBar(doc: Document = document): void {
  const progressBar = doc.getElementById(PROGRESS_BAR_ID);
  if (progressBar) {
    progressBar.remove();
  }
}

/**
 * Check if the progress bar is currently visible
 * @param doc - Document to check
 */
export function isProgressBarVisible(doc: Document = document): boolean {
  return doc.getElementById(PROGRESS_BAR_ID) !== null;
}

