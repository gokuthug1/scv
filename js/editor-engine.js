/**

 * js/editor-engine.js

 * Integrated Editor Engine for Source Code Viewer.

 * Manages gutter line numbers, synchronized scrolling, cross-token Ctrl+F search,

 * accurate line jump scrolling, and bracket matching.

 */



const EditorEngine = {

    _globalKeyControllerInitialized: false,



    attach(containerEl, highlightedHtml, rawCode, lang = 'javascript', options = {}) {

        if (!containerEl) return;

        const showLineNumbers = options.showLineNumbers !== false;

        this.clearCssHighlights();

        containerEl.innerHTML = '';

        containerEl.classList.add('scv-editor-wrapper');



        const lines = (rawCode || '').split('\n');

        const lineCount = lines.length || 1;



        const editorLayout = document.createElement('div');

        editorLayout.className = 'scv-editor-layout';



        const gutter = document.createElement('div');

        gutter.className = 'scv-editor-gutter';

        if (!showLineNumbers) {

            gutter.style.display = 'none';

        }



        const gutterChunks = new Array(lineCount);

        for (let i = 1; i <= lineCount; i++) {

            gutterChunks[i - 1] = `<div class="scv-line-number" data-line="${i}">${i}</div>`;

        }

        gutter.innerHTML = gutterChunks.join('');



        const codeArea = document.createElement('div');

        codeArea.className = 'scv-editor-code-area';



        const pre = document.createElement('pre');

        const codeEl = document.createElement('code');

        codeEl.id = 'active-editor-code';

        codeEl.innerHTML = highlightedHtml || (typeof SyntaxHighlighter !== 'undefined'

            ? SyntaxHighlighter.escapeHtml(rawCode)

            : String(rawCode).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));

        pre.appendChild(codeEl);

        codeArea.appendChild(pre);



        editorLayout.appendChild(gutter);

        editorLayout.appendChild(codeArea);

        containerEl.appendChild(editorLayout);



        codeArea.addEventListener('scroll', () => {

            if (showLineNumbers) {

                gutter.scrollTop = codeArea.scrollTop;

            }

        });



        gutter.addEventListener('wheel', (e) => {

            if (e.deltaY !== 0) {

                e.preventDefault();

                codeArea.scrollTop += e.deltaY;

            }

        }, { passive: false });



        this.setupSearchBar(containerEl, codeArea, codeEl);

        this.setupBracketMatching(codeEl);



        return { gutter, codeArea, codeEl, lineCount };

    },



    scrollToLine(containerEl, targetLine) {

        if (!containerEl || !targetLine) return;

        const codeArea = containerEl.querySelector('.scv-editor-code-area');

        const gutter = containerEl.querySelector('.scv-editor-gutter');

        const codeEl = containerEl.querySelector('#active-editor-code');

        if (!codeArea) return;



        if (gutter) {

            gutter.querySelectorAll('.scv-line-number.active-line').forEach(el => el.classList.remove('active-line'));

            const lineEl = gutter.querySelector(`[data-line="${targetLine}"]`);

            if (lineEl) lineEl.classList.add('active-line');

        }



        const computedLineHeight = codeEl

            ? parseFloat(window.getComputedStyle(codeEl).lineHeight) || 21

            : 21;

        const topPadding = 16;

        const targetOffset = topPadding + Math.max(0, targetLine - 1) * computedLineHeight;

        const centeredTop = Math.max(0, targetOffset - (codeArea.clientHeight / 2) + (computedLineHeight / 2));



        codeArea.scrollTo({ top: centeredTop, behavior: 'smooth' });

    },



    openSearchBar(containerEl) {

        const searchBar = (containerEl || document).querySelector('.scv-search-bar');

        if (!searchBar) return;

        searchBar.style.display = 'flex';

        const input = searchBar.querySelector('.scv-search-input');

        if (input) {

            input.focus();

            input.select();

        }

    },



    clearCssHighlights() {

        if (globalThis.CSS?.highlights) {

            CSS.highlights.delete('scv-search-match');

            CSS.highlights.delete('scv-search-active');

        }

    },



    buildTextRanges(element, query) {

        if (!element || !query) return [];

        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

        const nodes = [];

        let fullText = '';

        let node;



        while ((node = walker.nextNode())) {

            const len = node.nodeValue.length;

            if (len > 0) {

                nodes.push({ node, start: fullText.length, end: fullText.length + len });

                fullText += node.nodeValue;

            }

        }



        if (!nodes.length) return [];



        const findNodeForOffset = (offset, isEnd = false) => {

            let low = 0;

            let high = nodes.length - 1;

            while (low <= high) {

                const mid = (low + high) >> 1;

                const entry = nodes[mid];

                const matches = isEnd

                    ? (offset > entry.start && offset <= entry.end)

                    : (offset >= entry.start && offset < entry.end);

                if (matches) return entry;

                if (offset <= entry.start && isEnd) high = mid - 1;

                else if (offset < entry.start) high = mid - 1;

                else low = mid + 1;

            }

            return null;

        };



        const normalizedQuery = query.toLocaleLowerCase();

        const normalizedText = fullText.toLocaleLowerCase();

        const ranges = [];

        let startIndex = 0;



        while (startIndex <= normalizedText.length - normalizedQuery.length) {

            const matchIndex = normalizedText.indexOf(normalizedQuery, startIndex);

            if (matchIndex === -1) break;

            const matchEnd = matchIndex + query.length;

            const startNode = findNodeForOffset(matchIndex, false);

            const endNode = findNodeForOffset(matchEnd, true);



            if (startNode && endNode) {

                const range = new Range();

                range.setStart(startNode.node, matchIndex - startNode.start);

                range.setEnd(endNode.node, matchEnd - endNode.start);

                ranges.push(range);

            }

            startIndex = matchIndex + Math.max(1, query.length);

        }

        return ranges;

    },



    setupSearchBar(containerEl, codeArea, codeEl) {

        let searchBar = containerEl.querySelector('.scv-search-bar');

        if (!searchBar) {

            searchBar = document.createElement('div');

            searchBar.className = 'scv-search-bar';

            searchBar.style.display = 'none';

            searchBar.innerHTML = `

                <div class="scv-search-input-group">

                    <svg class="scv-search-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">

                        <circle cx="11" cy="11" r="8"></circle>

                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>

                    </svg>

                    <input type="search" class="scv-search-input" placeholder="Find in file (Ctrl+F)..." aria-label="Find in file" />

                    <span class="scv-search-count" aria-live="polite">0 of 0</span>

                    <button type="button" class="scv-search-btn prev-btn" aria-label="Previous match" title="Previous match (Shift+Enter)">

                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>

                    </button>

                    <button type="button" class="scv-search-btn next-btn" aria-label="Next match" title="Next match (Enter)">

                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>

                    </button>

                    <button type="button" class="scv-search-btn close-btn" aria-label="Close search" title="Close (Esc)">

                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>

                    </button>

                </div>

            `;

            containerEl.insertBefore(searchBar, containerEl.firstChild);

        }



        const searchInput = searchBar.querySelector('.scv-search-input');

        const countSpan = searchBar.querySelector('.scv-search-count');

        const prevBtn = searchBar.querySelector('.prev-btn');

        const nextBtn = searchBar.querySelector('.next-btn');

        const closeBtn = searchBar.querySelector('.close-btn');



        let ranges = [];

        let currentMatchIdx = -1;



        const focusRange = (idx) => {

            if (!ranges.length || idx < 0) return;

            countSpan.textContent = `${idx + 1} of ${ranges.length}`;



            if (globalThis.CSS?.highlights && typeof Highlight === 'function') {

                CSS.highlights.set('scv-search-match', new Highlight(...ranges));

                CSS.highlights.set('scv-search-active', new Highlight(ranges[idx]));

            }



            const activeRange = ranges[idx];

            const rect = activeRange.getBoundingClientRect();

            const areaRect = codeArea.getBoundingClientRect();

            if (rect.width || rect.height) {

                const targetTop = codeArea.scrollTop + (rect.top - areaRect.top) - (codeArea.clientHeight / 2) + (rect.height / 2);

                const targetLeft = codeArea.scrollLeft + (rect.left - areaRect.left) - 60;

                codeArea.scrollTo({

                    top: Math.max(0, targetTop),

                    left: Math.max(0, targetLeft),

                    behavior: 'smooth'

                });

            }

        };



        const performSearch = () => {

            const query = searchInput.value;

            this.clearCssHighlights();

            ranges = [];



            if (!query) {

                countSpan.textContent = '0 of 0';

                currentMatchIdx = -1;

                return;

            }



            ranges = this.buildTextRanges(codeEl, query);

            if (ranges.length > 0) {

                currentMatchIdx = 0;

                focusRange(currentMatchIdx);

            } else {

                countSpan.textContent = '0 of 0';

                currentMatchIdx = -1;

            }

        };



        searchInput.oninput = performSearch;



        nextBtn.onclick = () => {

            if (ranges.length === 0) return;

            currentMatchIdx = (currentMatchIdx + 1) % ranges.length;

            focusRange(currentMatchIdx);

        };



        prevBtn.onclick = () => {

            if (ranges.length === 0) return;

            currentMatchIdx = (currentMatchIdx - 1 + ranges.length) % ranges.length;

            focusRange(currentMatchIdx);

        };



        closeBtn.onclick = () => {

            searchBar.style.display = 'none';

            this.clearCssHighlights();

        };



        searchInput.onkeydown = (e) => {

            if (e.key === 'Enter') {

                e.preventDefault();

                if (e.shiftKey) prevBtn.click();

                else nextBtn.click();

            } else if (e.key === 'Escape') {

                e.preventDefault();

                closeBtn.click();

            }

        };



        if (!this._globalKeyControllerInitialized) {

            this._globalKeyControllerInitialized = true;

            document.addEventListener('keydown', (e) => {

                const activeBar = document.querySelector('.scv-search-bar');

                if (!activeBar) return;



                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {

                    const activeEl = document.activeElement;

                    if (activeEl && ['INPUT', 'TEXTAREA'].includes(activeEl.tagName) && !activeEl.classList.contains('scv-search-input')) {

                        return;

                    }

                    e.preventDefault();

                    activeBar.style.display = 'flex';

                    const input = activeBar.querySelector('.scv-search-input');

                    if (input) {

                        input.focus();

                        input.select();

                    }

                } else if (e.key === 'Escape' && activeBar.style.display !== 'none') {

                    const close = activeBar.querySelector('.close-btn');

                    if (close) close.click();

                }

            });

        }

    },



    setupBracketMatching(codeEl) {

        if (!codeEl) return;

        codeEl.onclick = (e) => {

            const target = e.target;

            if (!target || !target.textContent) return;

            const char = target.textContent.trim();

            const brackets = ['{', '}', '(', ')', '[', ']', '<', '>'];

            if (brackets.includes(char)) {

                codeEl.querySelectorAll('.scv-bracket-match').forEach(b => b.classList.remove('scv-bracket-match'));

                target.classList.add('scv-bracket-match');

            }

        };

    }

};



if (typeof globalThis !== 'undefined') globalThis.EditorEngine = EditorEngine;

if (typeof window !== 'undefined') window.EditorEngine = EditorEngine;
