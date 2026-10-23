/**
 * js/worker.js
 * Web Worker for offloading CPU-intensive code beautification and syntax lexing.
 * Includes defensive fallback handling if importScripts encounters environment restrictions.
 */

try {
    importScripts('beautifier.js', 'highlighter.js');
} catch (e) {
    console.warn("Worker importScripts fallback:", e);
}

self.onmessage = function (e) {
    const { action, code, type, lang, id } = e.data || {};

    try {
        if (action === 'beautify') {
            const result = typeof Beautifier !== 'undefined' ? Beautifier.format(code, type) : code;
            self.postMessage({ id, action, success: true, result });
        } else if (action === 'highlight') {
            const result = typeof SyntaxHighlighter !== 'undefined' ? SyntaxHighlighter.highlight(code, lang || type) : code;
            self.postMessage({ id, action, success: true, result });
        } else if (action === 'beautify_and_highlight') {
            const formatted = typeof Beautifier !== 'undefined' ? Beautifier.format(code, type) : code;
            const highlighted = typeof SyntaxHighlighter !== 'undefined' ? SyntaxHighlighter.highlight(formatted, lang || type) : formatted;
            self.postMessage({ id, action, success: true, formatted, highlighted });
        } else {
            self.postMessage({ id, action, success: false, error: 'Unknown worker action' });
        }
    } catch (err) {
        self.postMessage({ id, action, success: false, error: err.message, formatted: code });
    }
};