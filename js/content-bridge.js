/**

 * js/content-bridge.js

 * In-page extraction bridge and interactive element picker.

 * Idempotent guard prevents duplicate injection errors; URL-to-path deduplication

 * guarantees consistent local file references across HTML and ZIP exports.

 */



(function () {

    if (window.__SCV_CONTENT_BRIDGE_LOADED__) return;

    window.__SCV_CONTENT_BRIDGE_LOADED__ = true;



    function uint8ToBase64(u8) {

        if (!u8 || !(u8 instanceof Uint8Array)) return "";

        const chunks = [];

        const chunkSize = 0xffff;

        for (let i = 0; i < u8.length; i += chunkSize) {

            chunks.push(String.fromCharCode.apply(null, u8.subarray(i, i + chunkSize)));

        }

        return btoa(chunks.join(''));

    }



    async function extractAllSourceCode(isDeepCrawl) {

        if (!document || !document.documentElement) return [];



        const results = [];

        const baseDomain = window.location.hostname;

        const isHttpsPage = document.location.protocol === 'https:';



        function getFilePath(urlStr, defaultExt = "") {

            if (!urlStr) return "unknown" + defaultExt;

            if (urlStr.startsWith('data:')) return null;



            try {

                const u = new URL(urlStr, document.baseURI);

                let path = u.pathname;

                if (path.endsWith('/')) path += 'index.html';

                if (path.startsWith('/')) path = path.substring(1);

                if (!path) path = "index.html";



                if (!path.includes('.') && defaultExt) path += defaultExt;



                if (u.hostname !== baseDomain && u.hostname !== "") {

                    return u.hostname + '/' + path;

                }

                return path;

            } catch (e) {

                return "unknown" + defaultExt;

            }

        }



        const docStr = document.documentElement.outerHTML || "";

        if (!docStr) return [];



        const parsedDoc = new DOMParser().parseFromString(docStr, 'text/html');

        const docClone = parsedDoc.documentElement;



        let inlineCssCount = 0;

        let inlineJsCount = 0;

        const nameTracker = new Set();

        const urlToItemMap = new Map();



        function getUniquePath(path) {

            let finalPath = path;

            let counter = 1;

            let base = path;

            let ext = "";

            const lastDot = path.lastIndexOf('.');

            if (lastDot !== -1 && lastDot > path.lastIndexOf('/')) {

                base = path.substring(0, lastDot);

                ext = path.substring(lastDot);

            }

            while (nameTracker.has(finalPath)) {

                finalPath = `${base}-${counter}${ext}`;

                counter++;

            }

            nameTracker.add(finalPath);

            return finalPath;

        }



        function processNode(el, attr, type, defaultExt) {

            let source = "inline";

            let fullUrl = null;

            let content = null;

            let errorMsg = null;

            let filePath = null;

            const rawAttrVal = el.getAttribute(attr);

            const isInline = !el.hasAttribute(attr) || !rawAttrVal || rawAttrVal.trim() === "";



            try {

                if (isInline && (el.tagName === 'STYLE' || el.tagName === 'SCRIPT')) {

                    content = el.innerHTML;

                    if (!content.trim()) return null;

                    filePath = getUniquePath(el.tagName === 'STYLE' ? `css/inline-${++inlineCssCount}.css` : `js/inline-${++inlineJsCount}.js`);



                    if (el.tagName === 'STYLE') {

                        const link = el.ownerDocument.createElement("link");

                        link.rel = "stylesheet";

                        link.href = filePath;

                        el.parentNode.replaceChild(link, el);

                    } else {

                        el.innerHTML = "";

                        el.setAttribute("src", filePath);

                    }

                } else {

                    const val = rawAttrVal;

                    if (!val || val.trim() === "") return null;

                    const lowerVal = val.trim().toLowerCase();



                    if (

                        lowerVal.startsWith("data:") ||

                        lowerVal.startsWith("#") ||

                        lowerVal.startsWith("javascript:") ||

                        lowerVal.startsWith("chrome-extension://") ||

                        lowerVal.startsWith("moz-extension://") ||

                        lowerVal.startsWith("android-app://") ||

                        lowerVal.startsWith("ios-app://") ||

                        lowerVal.startsWith("intent:") ||

                        lowerVal.startsWith("mailto:") ||

                        lowerVal.startsWith("tel:") ||

                        lowerVal.startsWith("about:")

                    ) return null;



                    try {

                        fullUrl = new URL(val, document.baseURI).href;

                    } catch (e) {

                        return null;

                    }



                    if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {

                        return null;

                    }



                    if (isHttpsPage && fullUrl.startsWith("http://")) {

                        fullUrl = fullUrl.replace(/^http:\/\//i, "https://");

                    }



                    if (type === 'html' && new URL(fullUrl).hostname !== baseDomain) return null;



                    if (urlToItemMap.has(fullUrl)) {

                        const existingItem = urlToItemMap.get(fullUrl);

                        el.setAttribute(attr, existingItem.filePath);

                        if (el.hasAttribute("srcset")) el.removeAttribute("srcset");

                        return null;

                    }



                    filePath = getUniquePath(getFilePath(fullUrl, defaultExt));

                    const cleanName = fullUrl.split(/[?#]/)[0].split('/').pop();

                    source = cleanName || filePath.split('/').pop() || "file";

                    el.setAttribute(attr, filePath);



                    if (el.hasAttribute("srcset")) {

                        el.removeAttribute("srcset");

                    }

                }

            } catch (e) {

                errorMsg = `/* PARSE ERROR: ${e.message} */`;

                if (!isInline && !fullUrl) source = rawAttrVal || "unknown";

            }



            const item = { type, source, fullUrl, content, error: errorMsg, filePath, isBeautified: false };

            if (fullUrl) {

                urlToItemMap.set(fullUrl, item);

            }

            return item;

        }



        const mainHtmlPath = getUniquePath(getFilePath(document.location.href, ".html"));

        const htmlName = mainHtmlPath.split('/').pop() || "index.html";

        urlToItemMap.set(document.location.href, { filePath: mainHtmlPath });



        const cssElements = Array.from(docClone.querySelectorAll('link[rel~="stylesheet"][href], style'));

        const cssProcessed = cssElements.map(el => processNode(el, "href", "css", ".css"));



        const jsElements = Array.from(docClone.querySelectorAll("script"));

        const jsProcessed = jsElements.map(el => {

            const t = (el.type || "").toLowerCase();

            const valid = !t || t.includes("javascript") || t.includes("module") || t.includes("ecmascript");

            if (!valid) return null;

            return processNode(el, "src", "js", ".js");

        });



        const allProcessed = [...cssProcessed, ...jsProcessed];



        if (isDeepCrawl) {

            const imgElements = Array.from(docClone.querySelectorAll("img[src], source[src]"));

            imgElements.forEach(el => allProcessed.push(processNode(el, "src", "img", "")));



            const mediaElements = Array.from(docClone.querySelectorAll("audio[src], video[src]"));

            mediaElements.forEach(el => allProcessed.push(processNode(el, "src", "media", "")));



            const linkElements = Array.from(docClone.querySelectorAll('link[href]:not([rel~="stylesheet"])'));

            linkElements.forEach(el => {

                const rel = (el.getAttribute("rel") || "").toLowerCase();

                if (rel.includes("preload") || rel.includes("dns-prefetch") || rel.includes("preconnect")) return;

                allProcessed.push(processNode(el, "href", "asset", ""));

            });



            const aElements = Array.from(docClone.querySelectorAll("a[href]"));

            aElements.forEach(el => {

                const res = processNode(el, "href", "html", ".html");

                if (res) allProcessed.push(res);

            });

        }



        let doctypeString = "<!DOCTYPE html>\n";

        if (document.doctype) doctypeString = new XMLSerializer().serializeToString(document.doctype) + "\n";

        const fullHtmlContent = doctypeString + docClone.outerHTML;



        results.push({

            type: "html", source: htmlName, fullUrl: document.location.href,

            content: fullHtmlContent, error: null, filePath: mainHtmlPath, isBeautified: false

        });



        const filteredProcessed = allProcessed.filter(Boolean);



        async function fetchResourceInPageContext(url, type) {

            if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return null;



            if (isHttpsPage && url.startsWith('http://')) {

                url = url.replace(/^http:\/\//i, 'https://');

            }



            try {

                const controller = new AbortController();

                const timeoutId = setTimeout(() => controller.abort(), 6000);

                const res = await fetch(url, { signal: controller.signal, credentials: 'include' });

                clearTimeout(timeoutId);

                if (!res.ok) return null;



                const isBinary = ['img', 'media', 'asset'].includes(type);

                if (isBinary) {

                    const buffer = await res.arrayBuffer();

                    return new Uint8Array(buffer);

                } else {

                    return await res.text();

                }

            } catch (e) {

                return null;

            }

        }



        function traverseShadowRoots(rootEl) {

            if (!rootEl) return;

            const allNodes = rootEl.querySelectorAll('*');

            allNodes.forEach(node => {

                if (node.shadowRoot) {

                    const shadowStyles = node.shadowRoot.querySelectorAll('style, link[rel~="stylesheet"]');

                    shadowStyles.forEach(s => {

                        if (s.tagName === 'STYLE' && s.innerHTML.trim()) {

                            const path = getUniquePath(`css/shadow-${++inlineCssCount}.css`);

                            results.push({

                                type: 'css', source: 'shadow-dom', fullUrl: null,

                                content: `/* Encapsulated Shadow DOM Style */\n${s.innerHTML}`, error: null, filePath: path, isBeautified: false

                            });

                        }

                    });

                    traverseShadowRoots(node.shadowRoot);

                }

            });

        }



        try {

            traverseShadowRoots(document.documentElement);

        } catch (e) {}



        try {

            const stateObj = {

                url: document.location.href,

                timestamp: new Date().toISOString(),

                localStorage: {},

                sessionStorage: {},

                cookies: document.cookie || ""

            };

            for (let i = 0; i < localStorage.length; i++) {

                const k = localStorage.key(i);

                stateObj.localStorage[k] = localStorage.getItem(k);

            }

            for (let i = 0; i < sessionStorage.length; i++) {

                const k = sessionStorage.key(i);

                stateObj.sessionStorage[k] = sessionStorage.getItem(k);

            }

            results.push({

                type: 'json', source: 'state.json', fullUrl: null,

                content: JSON.stringify(stateObj, null, 2), error: null, filePath: 'storage/state.json', isBeautified: true

            });

        } catch (e) {}



        const fetchPromises = filteredProcessed.map(async (item) => {

            if (item.content !== null || item.error || !item.fullUrl) return item;

            const fetchedContent = await fetchResourceInPageContext(item.fullUrl, item.type);

            if (fetchedContent !== null) {

                item.content = fetchedContent;

            }

            return item;

        });



        const resolvedProcessed = await Promise.all(fetchPromises);

        results.push(...resolvedProcessed);



        // CSS Selector Coverage bounded to 800 rules to prevent tab freezing

        resolvedProcessed.forEach(item => {

            if (item.type === 'css' && typeof item.content === 'string') {

                try {

                    const selectorRegex = /([^{}]+)\s*\{/g;

                    let match;

                    let total = 0;

                    let used = 0;

                    let unused = 0;



                    while ((match = selectorRegex.exec(item.content)) !== null && total < 800) {

                        const rawSel = match[1].trim();

                        if (!rawSel || rawSel.startsWith('@') || rawSel.startsWith('/*')) continue;



                        const subSelectors = rawSel.split(',').map(s => s.trim());

                        for (const sel of subSelectors) {

                            if (total >= 800) break;

                            if (!sel || sel.startsWith(':') || sel.includes('::')) continue;

                            total++;

                            try {

                                if (document.querySelector(sel)) used++;

                                else unused++;

                            } catch (err) {}

                        }

                    }

                    if (total > 0) {

                        item.cssCoverage = { total, used, unused, usedPercentage: Math.round((used / total) * 100) };

                    }

                } catch (e) {}

            }

        });



        const seenUrls = new Set();

        const uniqueResults = [];

        for (const item of results) {

            if (item.fullUrl) {

                if (seenUrls.has(item.fullUrl)) continue;

                seenUrls.add(item.fullUrl);

            }

            if (item.content instanceof Uint8Array) {

                item.content = uint8ToBase64(item.content);

                item.isBinary = true;

                item.isBase64 = true;

            }

            uniqueResults.push(item);

        }



        return uniqueResults;

    }



    let activePickerOverlay = null;

    let activePickerBadge = null;



    function activateElementPicker(sendResponse) {

        if (activePickerOverlay) return;



        const overlay = document.createElement('div');

        overlay.id = 'scv-element-picker-overlay';

        Object.assign(overlay.style, {

            position: 'fixed', top: '0', left: '0', width: '0', height: '0',

            zIndex: '2147483646', pointerEvents: 'none',

            border: '2px solid #6366f1', backgroundColor: 'rgba(99, 102, 241, 0.12)',

            boxSizing: 'border-box', transition: 'all 0.06s ease'

        });



        const badge = document.createElement('div');

        badge.id = 'scv-picker-badge';

        Object.assign(badge.style, {

            position: 'fixed', zIndex: '2147483647', pointerEvents: 'none',

            padding: '3px 8px', borderRadius: '4px', backgroundColor: '#1e1e2e',

            color: '#f3f4f6', border: '1px solid #6366f1', fontFamily: 'monospace',

            fontSize: '11px', display: 'none'

        });



        document.documentElement.appendChild(overlay);

        document.documentElement.appendChild(badge);

        activePickerOverlay = overlay;

        activePickerBadge = badge;



        const cleanup = () => {

            document.removeEventListener('mousemove', handleMouseMove, true);

            document.removeEventListener('click', handleClick, true);

            document.removeEventListener('keydown', handleKeyDown, true);

            if (activePickerOverlay) {

                activePickerOverlay.remove();

                activePickerOverlay = null;

            }

            if (activePickerBadge) {

                activePickerBadge.remove();

                activePickerBadge = null;

            }

        };



        const handleMouseMove = (e) => {

            const el = document.elementFromPoint(e.clientX, e.clientY);

            if (!el || el === overlay || el === badge) return;

            const rect = el.getBoundingClientRect();

            Object.assign(overlay.style, {

                top: `${rect.top}px`, left: `${rect.left}px`,

                width: `${rect.width}px`, height: `${rect.height}px`

            });



            const tag = el.tagName.toLowerCase();

            const idStr = el.id ? `#${el.id}` : '';

            const classStr = el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';

            badge.textContent = `${tag}${idStr}${classStr} (Esc to cancel)`;

            badge.style.display = 'block';

            badge.style.top = `${Math.max(6, rect.top - 26)}px`;

            badge.style.left = `${Math.max(6, rect.left)}px`;

        };



        const handleClick = (e) => {

            e.preventDefault();

            e.stopPropagation();

            const el = document.elementFromPoint(e.clientX, e.clientY);



            if (el) {

                const inspectData = {

                    tagName: el.tagName.toLowerCase(),

                    id: el.id,

                    className: typeof el.className === 'string' ? el.className : '',

                    outerHTML: el.outerHTML,

                    innerText: el.innerText || '',

                    attributes: Array.from(el.attributes).map(a => ({ name: a.name, value: a.value }))

                };

                try {

                    chrome.storage.local.set({ last_inspected_element: { timestamp: Date.now(), data: inspectData } });

                } catch (err) {}

                try { sendResponse({ success: true, elementData: inspectData }); } catch (err) {}



                badge.textContent = `Inspected <${inspectData.tagName}>! Open viewer to inspect.`;

                badge.style.backgroundColor = '#10b981';

                badge.style.borderColor = '#059669';

                overlay.style.borderColor = '#10b981';

                overlay.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';

                setTimeout(cleanup, 650);

                return;

            }

            cleanup();

        };



        const handleKeyDown = (e) => {

            if (e.key === 'Escape') {

                e.preventDefault();

                cleanup();

                try { sendResponse({ success: false, canceled: true }); } catch (err) {}

            }

        };



        document.addEventListener('mousemove', handleMouseMove, true);

        document.addEventListener('click', handleClick, true);

        document.addEventListener('keydown', handleKeyDown, true);

    }



    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

        if (window.self !== window.top) return false;



        if (request.action === 'extract_source') {

            extractAllSourceCode(request.deepCrawl)

                .then(async (results) => {

                    const storageKey = `extracted_data_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

                    try {

                        await chrome.storage.local.set({ [storageKey]: results });

                        sendResponse({ success: true, storageKey });

                    } catch (e) {

                        sendResponse({ success: true, result: results });

                    }

                })

                .catch(err => {

                    sendResponse({ success: false, error: err.message });

                });

            return true;

        }



        if (request.action === 'pick_element') {

            activateElementPicker(sendResponse);

            return true;

        }

    });

})();
