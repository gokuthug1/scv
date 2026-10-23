/**
 * js/snapshot-diff.js
 * Local Snapshot Caching and Code Diffing Engine for Source Code Viewer.
 * Compares current page extractions against stored snapshots.
 * Uses forward lookahead windowing to prevent repeated lines from desynchronizing diffs.
 */

const SnapshotDiff = {
    /**
     * Computes line-by-line diff between two strings using a bounded lookahead window.
     * Prevents repeated tokens (e.g. `}`, `{`, blank lines) from causing false-positive full-file diffs.
     */
    computeLineDiff(oldText = '', newText = '', lookaheadWindow = 100) {
        const oldLines = oldText.split('\n');
        const newLines = newText.split('\n');
        const diff = [];

        let i = 0;
        let j = 0;

        function findNextMatch(line, lines, startIndex, maxDistance) {
            const limit = Math.min(lines.length, startIndex + maxDistance);
            for (let k = startIndex; k < limit; k++) {
                if (lines[k] === line) return k;
            }
            return -1;
        }

        while (i < oldLines.length || j < newLines.length) {
            if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
                diff.push({ type: 'unchanged', oldLine: i + 1, newLine: j + 1, text: oldLines[i] });
                i++;
                j++;
            } else if (i < oldLines.length && j >= newLines.length) {
                diff.push({ type: 'removed', oldLine: i + 1, newLine: null, text: oldLines[i] });
                i++;
            } else if (i >= oldLines.length && j < newLines.length) {
                diff.push({ type: 'added', oldLine: null, newLine: j + 1, text: newLines[j] });
                j++;
            } else {
                // Both streams have lines that differ; look forward within window
                const oldMatch = findNextMatch(newLines[j], oldLines, i, lookaheadWindow);
                const newMatch = findNextMatch(oldLines[i], newLines, j, lookaheadWindow);

                const oldDistance = oldMatch !== -1 ? (oldMatch - i) : Infinity;
                const newDistance = newMatch !== -1 ? (newMatch - j) : Infinity;

                if (oldDistance < newDistance) {
                    diff.push({ type: 'removed', oldLine: i + 1, newLine: null, text: oldLines[i] });
                    i++;
                } else if (newDistance < oldDistance) {
                    diff.push({ type: 'added', oldLine: null, newLine: j + 1, text: newLines[j] });
                    j++;
                } else if (oldDistance !== Infinity) {
                    diff.push({ type: 'removed', oldLine: i + 1, newLine: null, text: oldLines[i] });
                    i++;
                } else {
                    // Neither found within window: consider old line modified/replaced
                    diff.push({ type: 'removed', oldLine: i + 1, newLine: null, text: oldLines[i] });
                    i++;
                }
            }
        }
        return diff;
    },

    compareData(oldData = [], newData = []) {
        const oldMap = new Map((oldData || []).map(item => [item.filePath || item.source, item]));
        const newMap = new Map((newData || []).map(item => [item.filePath || item.source, item]));
        const results = [];

        newMap.forEach((newItem, path) => {
            const oldItem = oldMap.get(path);
            if (!oldItem) {
                results.push({ path, status: 'added', newItem, oldItem: null });
            } else if ((newItem.content || '') !== (oldItem.content || '')) {
                const lineDiff = this.computeLineDiff(oldItem.content || '', newItem.content || '');
                results.push({ path, status: 'modified', newItem, oldItem, lineDiff });
            } else {
                results.push({ path, status: 'unchanged', newItem, oldItem });
            }
        });

        oldMap.forEach((oldItem, path) => {
            if (!newMap.has(path)) {
                results.push({ path, status: 'deleted', newItem: null, oldItem });
            }
        });

        return results;
    },

    renderDiffHtml(diffArray) {
        if (!Array.isArray(diffArray)) return '<p>No diff data.</p>';
        const escape = (str) => String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        let html = '<div class="scv-diff-view">';
        diffArray.forEach(item => {
            if (item.type === 'added') {
                html += `<div class="diff-line diff-add"><span class="line-num">+${item.newLine}</span><span class="line-text">${escape(item.text)}</span></div>`;
            } else if (item.type === 'removed') {
                html += `<div class="diff-line diff-remove"><span class="line-num">-${item.oldLine}</span><span class="line-text">${escape(item.text)}</span></div>`;
            } else {
                html += `<div class="diff-line diff-same"><span class="line-num">${item.newLine}</span><span class="line-text">${escape(item.text)}</span></div>`;
            }
        });
        html += '</div>';
        return html;
    }
};

if (typeof globalThis !== 'undefined') globalThis.SnapshotDiff = SnapshotDiff;
if (typeof window !== 'undefined') window.SnapshotDiff = SnapshotDiff;
