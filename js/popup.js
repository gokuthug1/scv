// --- Popup Logic ---

document.addEventListener('DOMContentLoaded', () => {

  const tabContainer = document.getElementById('tab-container');

  const contentContainer = document.getElementById('content-container');

  const loadingDiv = document.getElementById('loading');

  const errorDiv = document.getElementById('error');

  const globalActionsDiv = document.getElementById('global-actions');

  const downloadAllBtn = document.getElementById('download-all-btn');

  const openViewerBtn = document.getElementById('open-viewer-btn');

  const settingsBtn = document.getElementById('settings-btn');

  const donateBtn = document.getElementById('donate-btn');



  let allSourceData = [];

  let activeTabInfo = null;

  let globalCustomTooltips = true;

  let globalShowLineNumbers = true;

  let currentWindowId = null;

  const pageParams = new URLSearchParams(window.location.search);

  const isWindowModePage = pageParams.has('tabId') || pageParams.has('instance');

  const paneSearchStates = new Map();



  const createUniqueId = () => (

    typeof crypto?.randomUUID === 'function'

      ? crypto.randomUUID()

      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  );



  // Safely clear only .tab-content panes so #loading and #error remain attached to #content-container

  const clearTabPanes = () => {

    contentContainer.querySelectorAll('.tab-content').forEach(pane => pane.remove());

    if (!contentContainer.contains(loadingDiv)) contentContainer.appendChild(loadingDiv);

    if (!contentContainer.contains(errorDiv)) contentContainer.appendChild(errorDiv);

  };



  const syncWindowLayout = async (windowInfo = null) => {

    if (!isWindowModePage) return;

    try {

      const currentWindow = windowInfo || await chrome.windows.getCurrent();

      currentWindowId = currentWindow.id;

      const isFullscreen = currentWindow.state === 'fullscreen'

        || (window.innerWidth >= screen.availWidth && window.innerHeight >= screen.availHeight);

      document.documentElement.classList.add('window-mode');

      document.body.classList.add('window-mode');

      document.documentElement.classList.toggle('fullscreen-mode', isFullscreen);

      document.body.classList.toggle('fullscreen-mode', isFullscreen);

    } catch (error) {

      console.warn('Unable to read the floating window state:', error);

    }

  };



  const clearCodeSearchHighlights = () => {

    if (globalThis.CSS?.highlights) {

      CSS.highlights.delete('scv-search-match');

      CSS.highlights.delete('scv-search-active');

    }

  };



  const buildTextRanges = (element, query) => {

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

  };



  const renderPaneSearch = (pane, direction = 0) => {

    const input = pane?.querySelector('.code-search-input');

    const count = pane?.querySelector('.code-search-count');

    const codeEl = pane?.querySelector('code');

    if (!input || !count || !codeEl) return;



    const query = input.value;

    const state = paneSearchStates.get(pane.id) || { query: '', ranges: [], activeIndex: -1 };



    if (!query) {

      state.query = '';

      state.ranges = [];

      state.activeIndex = -1;

      paneSearchStates.set(pane.id, state);

      count.textContent = '0/0';

      clearCodeSearchHighlights();

      return;

    }



    if (state.query !== query) {

      state.query = query;

      state.ranges = buildTextRanges(codeEl, query);

      state.activeIndex = state.ranges.length ? 0 : -1;

    } else if (state.ranges.length && direction !== 0) {

      state.activeIndex = (state.activeIndex + direction + state.ranges.length) % state.ranges.length;

    }



    paneSearchStates.set(pane.id, state);

    count.textContent = state.ranges.length

      ? `${state.activeIndex + 1}/${state.ranges.length}`

      : '0/0';

    clearCodeSearchHighlights();



    if (globalThis.CSS?.highlights && typeof Highlight === 'function' && state.ranges.length) {

      CSS.highlights.set('scv-search-match', new Highlight(...state.ranges));

      CSS.highlights.set('scv-search-active', new Highlight(state.ranges[state.activeIndex]));

    }



    if (state.activeIndex >= 0) {

      const activeRange = state.ranges[state.activeIndex];

      const target = activeRange.startContainer.parentElement;

      target?.scrollIntoView({ block: 'center', inline: 'nearest' });

    }

  };



  const uint8ArrayToBase64 = (uint8) => {

      let chunks = [];

      const chunkSize = 0xffff;

      for (let i = 0; i < uint8.length; i += chunkSize) {

          chunks.push(String.fromCharCode.apply(null, uint8.subarray(i, i + chunkSize)));

      }

      return btoa(chunks.join(''));

  };



  const handleOpenViewer = async () => {

    if (!allSourceData.length || !activeTabInfo) return;

    const viewerId = createUniqueId();

    const storageKey = `source_data_${viewerId}`;



    const serializableData = allSourceData.map(item => {

        const isBinaryType = ['img', 'media', 'asset'].includes(item.type);

        if (item.content && isBinaryType) {

            const u8 = ensureUint8Array(item.content, item.isBase64);

            return {

                ...item,

                content: uint8ArrayToBase64(u8),

                isBinary: true,

                isBase64: true

            };

        }

        return { ...item, isBinary: isBinaryType };

    });



    const sessionObj = { 

        tabId: activeTabInfo.id,

        data: serializableData, 

        title: activeTabInfo.title, 

        url: activeTabInfo.url, 

        timestamp: Date.now() 

    };



    const originalText = openViewerBtn.innerHTML;

    openViewerBtn.textContent = "Opening...";

    openViewerBtn.disabled = true;



    try {

        if (typeof SCVDB !== 'undefined') {

            await SCVDB.saveSession(viewerId, sessionObj);

        }

        const dataToStore = {};

        dataToStore[storageKey] = sessionObj;

        dataToStore['latest_viewer_data'] = sessionObj;

        await chrome.storage.local.set(dataToStore);



        chrome.tabs.create({ url: `viewer.html?id=${encodeURIComponent(viewerId)}` });

    } catch (err) {

        console.error("Storage Error:", err);

        alert("Error: " + err.message);

    } finally {

        openViewerBtn.innerHTML = originalText;

        openViewerBtn.disabled = false;

    }

  };



  const escapeHTML = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');



  const isRestrictedUrl = (url) => {

    const restrictedPrefixes = [

        'chrome://', 'edge://', 'chrome-extension://',

        'https://chrome.google.com/webstore',

        'https://chromewebstore.google.com',

        'view-source:', 'chrome://extensions'

    ];

    return restrictedPrefixes.some(prefix => url.startsWith(prefix)) || 

           (url.startsWith('about:') && url !== 'about:blank');

  };



  function hexToRgba(hex, alpha = 0.5) {

    if (!hex || !hex.startsWith('#')) return '';

    let cleanHex = hex.slice(1);

    if (cleanHex.length === 3) cleanHex = cleanHex.split('').map(char => char + char).join('');

    if (cleanHex.length !== 6) return '';

    const r = parseInt(cleanHex.slice(0, 2), 16);

    const g = parseInt(cleanHex.slice(2, 4), 16);

    const b = parseInt(cleanHex.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;

  }



  const applyTheme = (themeConfig, themeName) => {

    const themeWithShadow = { ...themeConfig };

    if (themeWithShadow['--link-color']) {

      themeWithShadow['--link-shadow-color'] = hexToRgba(themeWithShadow['--link-color']);

    }

    const styleEl = document.getElementById('theme-styles');

    const css = `:root { ${Object.entries(themeWithShadow).map(([key, val]) => `${key}: ${val};`).join(' ')} }`;

    if (styleEl) styleEl.textContent = css;



    if (themeName === 'Light') document.body.classList.add('light-theme');

    else document.body.classList.remove('light-theme');

  };



  const initFloatingTooltips = (() => {

    let tooltipEl = null;

    let activeTarget = null;

    let isCustomEnabled = true;



    const getTooltipEl = () => {

      if (!tooltipEl) {

        tooltipEl = document.createElement('div');

        tooltipEl.className = 'scv-floating-tooltip';

        tooltipEl.id = 'scv-floating-tooltip';

        tooltipEl.setAttribute('aria-hidden', 'true');

        document.body.appendChild(tooltipEl);

      }

      return tooltipEl;

    };



    const positionTooltip = (target, text) => {

      const tip = getTooltipEl();

      tip.textContent = text;

      tip.style.left = '0px';

      tip.style.top = '0px';

      tip.style.display = 'block';



      const rect = target.getBoundingClientRect();

      const tipRect = tip.getBoundingClientRect();

      const padding = 8;



      let left = rect.left + (rect.width / 2) - (tipRect.width / 2);

      if (left < padding) {

        left = padding;

      } else if (left + tipRect.width > window.innerWidth - padding) {

        left = window.innerWidth - tipRect.width - padding;

      }



      const pos = target.getAttribute('data-tooltip-pos');

      let top = 0;

      if (pos === 'top') {

        top = rect.top - tipRect.height - 6;

        if (top < padding) top = rect.bottom + 6;

      } else {

        top = rect.bottom + 6;

        if (top + tipRect.height > window.innerHeight - padding) {

          top = rect.top - tipRect.height - 6;

        }

      }

      if (top < padding) top = padding;



      tip.style.left = `${Math.round(left)}px`;

      tip.style.top = `${Math.round(top)}px`;

      requestAnimationFrame(() => {

        tip.classList.add('visible');

      });

    };



    const hideTooltip = () => {

      if (tooltipEl) {

        tooltipEl.classList.remove('visible');

      }

      activeTarget = null;

    };



    document.addEventListener('mouseover', (e) => {

      if (!isCustomEnabled) return;

      const target = e.target.closest('[data-tooltip]');

      if (!target) return;

      const text = target.getAttribute('data-tooltip');

      if (!text) return;

      activeTarget = target;

      positionTooltip(target, text);

    }, true);



    document.addEventListener('mouseout', (e) => {

      if (!activeTarget) return;

      const target = e.target.closest('[data-tooltip]');

      if (target === activeTarget) {

        const related = e.relatedTarget;

        if (related && activeTarget.contains(related)) return;

        hideTooltip();

      }

    }, true);



    window.addEventListener('scroll', hideTooltip, { passive: true, capture: true });

    document.addEventListener('click', hideTooltip, true);



    return (enabled) => {

      isCustomEnabled = !!enabled;

      hideTooltip();

      if (isCustomEnabled) {

        document.querySelectorAll('[data-tooltip]').forEach(el => el.removeAttribute('title'));

      } else {

        document.querySelectorAll('[data-tooltip]').forEach(el => {

          const text = el.getAttribute('data-tooltip');

          if (text) el.setAttribute('title', text);

        });

      }

    };

  })();



  const setupTooltips = (enabled) => {

    initFloatingTooltips(enabled);

  };



  const showToast = (message, type = 'warning') => {

    document.querySelectorAll('.source-viewer-toast').forEach(t => t.remove());



    const toast = document.createElement('div');

    toast.className = 'source-viewer-toast';

    let iconSvg = type === 'info' 

        ? `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>`

        : `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`;



    toast.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg><span>${message}</span>`;

    

    Object.assign(toast.style, {

        position: 'fixed', bottom: '20px', right: '20px', backgroundColor: 'var(--secondary-bg)',

        color: 'var(--main-text-color)', border: '1px solid var(--border-color)', padding: '12px 18px',

        borderRadius: '8px', boxShadow: '0 8px 16px rgba(0,0,0,0.15)', zIndex: '9999',

        display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem',

        fontWeight: '500', opacity: '0', transform: 'translateY(15px)',

        transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'

    });

    

    document.body.appendChild(toast);

    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });

    setTimeout(() => {

        toast.style.opacity = '0'; toast.style.transform = 'translateY(15px)';

        setTimeout(() => toast.remove(), 300);

    }, 4000);

  };



  const formatBytes = (bytes, decimals = 1) => {

    if (!+bytes) return '0 B';

    const k = 1024;

    const dm = decimals < 0 ? 0 : decimals;

    const sizes = ['B', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;

  };



  const generateGutterHtml = (lineCount) => {

    const chunks = new Array(lineCount);

    for (let i = 1; i <= lineCount; i++) {

      chunks[i - 1] = `<div class="scv-line-number" data-line="${i}">${i}</div>`;

    }

    return chunks.join('');

  };



  const createContentPane = (id, item, globalIndex, hideActions) => {

    const pane = document.createElement('div');

    pane.id = id;

    pane.className = 'tab-content';



    const content = item.error || item.content || `[No ${item.type.toUpperCase()} content found]`;

    const titleText = item.source === 'inline' ? `Inline ${item.type.toUpperCase()}` : item.source;

    const sizeInBytes = typeof content === 'string' ? new Blob([content]).size : (content.byteLength || content.length || 0);

    const readableSize = formatBytes(sizeInBytes);

    const isBinaryType = ['img', 'media', 'asset'].includes(item.type) || item.isBinary;

    const isText = !isBinaryType && typeof content === 'string';

    const lineCount = isText ? (content.split('\n').length || 1) : 0;

    const lineCountBadge = (globalShowLineNumbers && lineCount > 0)

      ? `<span class="file-size-badge line-count-badge">${lineCount.toLocaleString()} ${lineCount === 1 ? 'line' : 'lines'}</span>`

      : '';



    const safeUrl = item.fullUrl ? escapeHTML(item.fullUrl) : '';

    const safeTitle = escapeHTML(item.fullUrl || item.source);

    const safeDisplayTitle = escapeHTML(titleText);



    let actionsHtml = '';

    if (!hideActions) {

        const openBtnHtml = item.fullUrl ?

          `<button class="action-btn-small open-tab-btn" data-url="${safeUrl}" data-tooltip="Open source in new tab">

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg> Open

          </button>` : '';



        actionsHtml = `

          <button class="action-btn-small inspect-btn" data-tooltip="Inspect Element">

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Inspect

          </button>

          <button class="action-btn-small beautify-btn" data-target="code-${id}" data-index="${globalIndex}" data-tooltip="Format Code">

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72z"></path><line x1="14" y1="7" x2="17" y2="10"></line></svg> Beautify

          </button>

          <button class="action-btn-small copy-btn" data-target="code-${id}" data-tooltip="Copy Code">

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy

          </button>

          <button class="action-btn-small download-file-btn" data-index="${globalIndex}" data-tooltip="Download this file">

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download

          </button>

          ${openBtnHtml}

        `;

    }



    const gutterDisplay = (globalShowLineNumbers && lineCount > 0) ? '' : 'display: none;';

    const gutterHtml = lineCount > 0 ? generateGutterHtml(lineCount) : '';

    const highlightedHtml = SyntaxHighlighter.highlight(typeof content === 'string' ? content : '[Binary Asset]', item.type);



    pane.innerHTML = `

      <div class="code-header">

        <div class="file-info-group">

            <span class="code-header-title" data-tooltip="${safeTitle}">${safeDisplayTitle}</span>

            <span class="file-size-badge">${readableSize}</span>

            ${lineCountBadge}

        </div>

        <div class="code-header-controls">

          <div class="code-header-search" role="search">

            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>

            <input class="code-search-input" type="search" placeholder="Find in file" aria-label="Find in this file">

            <span class="code-search-count" aria-live="polite">0/0</span>

            <button class="code-search-nav code-search-prev" type="button" data-tooltip="Previous match" aria-label="Previous match">&#8593;</button>

            <button class="code-search-nav code-search-next" type="button" data-tooltip="Next match" aria-label="Next match">&#8595;</button>

          </div>

          <div class="code-header-actions">${actionsHtml}</div>

        </div>

      </div>

      <div class="scv-popup-code-wrapper">

        <div class="scv-editor-gutter" id="gutter-${id}" style="${gutterDisplay}">${gutterHtml}</div>

        <pre class="scv-popup-code-area" id="pre-${id}"><code id="code-${id}">${highlightedHtml}</code></pre>

      </div>`;



    const preEl = pane.querySelector(`#pre-${id}`);

    const gutterEl = pane.querySelector(`#gutter-${id}`);

    if (preEl && gutterEl) {

      preEl.addEventListener('scroll', () => {

        if (globalShowLineNumbers) {

          gutterEl.scrollTop = preEl.scrollTop;

        }

      });

      gutterEl.addEventListener('wheel', (e) => {

        if (e.deltaY !== 0) {

          e.preventDefault();

          preEl.scrollTop += e.deltaY;

        }

      }, { passive: false });

    }



    return pane;

  };



  const renderTabs = (sourceData, hideActions) => {

    clearCodeSearchHighlights();

    paneSearchStates.clear();

    tabContainer.innerHTML = '';

    clearTabPanes();

    errorDiv.style.display = 'none';

    let isFirstTab = true;



    const createAndAppend = (items, type) => {

      items.forEach((item, index) => {

        const globalIndex = sourceData.indexOf(item);

        const tabId = `${type}-tab-${index + 1}`;

        const shortName = item.filePath ? item.filePath.split('/').pop() : item.source;

        const tabText = item.source === 'inline' ? `Inline ${type.toUpperCase()}` : `${type.toUpperCase()} (${shortName})`;

        

        const tabButton = document.createElement('button');

        tabButton.className = 'tab-button';

        tabButton.dataset.tab = tabId;

        tabButton.textContent = tabText;

        tabButton.setAttribute('data-tooltip', item.filePath || item.fullUrl || item.source);



        const contentPane = createContentPane(tabId, item, globalIndex, hideActions);



        if (isFirstTab) {

          tabButton.classList.add('active');

          contentPane.classList.add('active');

          isFirstTab = false;

        }

        tabContainer.appendChild(tabButton);

        contentContainer.appendChild(contentPane);

      });

    };



    createAndAppend(sourceData.filter(i => i.type === 'html'), 'html');

    createAndAppend(sourceData.filter(i => i.type === 'css'), 'css');

    createAndAppend(sourceData.filter(i => i.type === 'js'), 'js');



    setupTooltips(globalCustomTooltips);



    if (isFirstTab) {

      displayError("No HTML, CSS, or JavaScript content was found on this page.");

    } else {

      loadingDiv.style.display = 'none';

      globalActionsDiv.style.display = 'flex';

      globalActionsDiv.classList.add('fade-in-up');

      tabContainer.classList.add('fade-in-up');

      setTimeout(() => contentContainer.classList.add('fade-in-up'), 50);

    }

  };



  const displayError = (message, title = "Error") => {

    clearTabPanes();

    tabContainer.innerHTML = '';

    loadingDiv.style.display = 'none';

    globalActionsDiv.style.display = 'none';



    errorDiv.innerHTML = `

      <div class="error-wrapper">

        <div class="error-icon">

          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>

        </div>

        <h3>${escapeHTML(title)}</h3>

        <p>${escapeHTML(message)}</p>

      </div>`;

    errorDiv.style.display = 'flex';

  };



  const handleDownloadAll = async () => {

    if (!allSourceData.length || !activeTabInfo) return;

    const originalText = downloadAllBtn.innerHTML;

    downloadAllBtn.disabled = true;

    downloadAllBtn.innerHTML = `<svg class="spinner" viewBox="0 0 50 50" style="width:16px;height:16px;animation:rotate 2s linear infinite;"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4"></circle></svg> Zipping...`;



    try {

      const zip = new JSZip();

      let htmlContent = allSourceData.find(item => item.type === 'html')?.content || '';

      

      allSourceData.forEach(item => {

        if (item.filePath) {

          const content = item.type === 'html' ? htmlContent : (item.error || item.content || '');

          zip.file(item.filePath, content, { base64: Boolean(item.isBase64) });

        }

      });

      

      const zipBlob = await zip.generateAsync({ type: "blob" });

      let hostname = '';

      try { hostname = new URL(activeTabInfo.url).hostname.replace(/^www\./i, ''); } catch (err) {}

      if (!hostname) hostname = 'page';



      const blobUrl = URL.createObjectURL(zipBlob);

      chrome.downloads.download({ url: blobUrl, filename: `${hostname}.zip` }, () => {

          setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);

      });

      

      downloadAllBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Downloaded!`;

    } catch (err) {

      console.error("Failed to create zip file:", err);

      downloadAllBtn.innerHTML = 'Error!';

    } finally {

      setTimeout(() => { downloadAllBtn.innerHTML = originalText; downloadAllBtn.disabled = false; }, 2000);

    }

  };



  const populateTabSelector = async (currentTabId, settings) => {

    const tabSelect = document.getElementById('tab-select');

    const tabSelectorContainer = document.getElementById('tab-selector-container');

    if (!tabSelect) return;



    if (settings && settings.enableTabSwitching === false) {

      tabSelectorContainer.style.display = 'none';

      return;

    }



    try {

      const tabs = await chrome.tabs.query({});

      tabSelect.innerHTML = '';

      const inspectableTabs = tabs.filter(tab => tab.url && !isRestrictedUrl(tab.url));



      if (inspectableTabs.length === 0) {

        tabSelectorContainer.style.display = 'none';

        return;

      }



      inspectableTabs.forEach(tab => {

        const option = document.createElement('option');

        option.value = tab.id;

        let domain = '';

        try { domain = new URL(tab.url).hostname.replace(/^www\./i, ''); } catch (e) {}

        option.textContent = `${tab.title || 'Untitled Tab'} (${domain || 'Local'})`;

        if (tab.id === currentTabId) option.selected = true;

        tabSelect.appendChild(option);

      });



      tabSelectorContainer.style.display = 'flex';

      tabSelect.onchange = async (e) => {

        const selectedTabId = parseInt(e.target.value);

        if (selectedTabId) {

          const updatedParams = new URLSearchParams(window.location.search);

          updatedParams.set('tabId', String(selectedTabId));

          if (!updatedParams.has('instance')) updatedParams.set('instance', createUniqueId());

          history.replaceState(null, '', `${window.location.pathname}?${updatedParams.toString()}`);

          clearTabPanes();

          tabContainer.innerHTML = '';

          errorDiv.style.display = 'none';

          loadingDiv.style.display = 'flex';

          loadingDiv.querySelector('p').textContent = 'Analyzing page sources...';

          globalActionsDiv.style.display = 'none';

          await runExtractionForTab(selectedTabId, settings);

        }

      };

    } catch (err) {

      console.error("Failed to populate tab list:", err);

    }

  };



  const sendTabMessage = (tabId, message) => {

    return new Promise((resolve, reject) => {

      chrome.tabs.sendMessage(tabId, message, (response) => {

        const err = chrome.runtime.lastError;

        if (err) return reject(new Error(err.message));

        resolve(response);

      });

    });

  };



  const executeContentBridge = (tabId) => {

    return new Promise((resolve, reject) => {

      chrome.scripting.executeScript({ target: { tabId }, files: ["js/content-bridge.js"] }, () => {

        const err = chrome.runtime.lastError;

        if (err) return reject(new Error(err.message));

        resolve();

      });

    });

  };



  const getSourceCode = async (tabId, settings) => {

    const requestExtraction = async () => {

      const response = await sendTabMessage(tabId, { action: 'extract_source', deepCrawl: settings.deepCrawl });

      if (response && response.success) {

        if (response.storageKey) {

          const stored = await chrome.storage.local.get(response.storageKey);

          const data = stored[response.storageKey];

          chrome.storage.local.remove(response.storageKey);

          if (data) return data;

          throw new Error("Failed to retrieve stored extraction data.");

        }

        if (response.result) return response.result;

      }

      throw new Error(response ? response.error : "Unknown extraction error.");

    };



    try {

      return await requestExtraction();

    } catch (err) {

      if (err.message.includes("Could not establish connection") || err.message.includes("Receiving end does not exist")) {

        try {

          await executeContentBridge(tabId);

          return await requestExtraction();

        } catch (e) {

          throw err;

        }

      }

      throw err;

    }

  };



  const runExtractionForTab = async (tabId, settings) => {

    try {

      const currentTab = await chrome.tabs.get(tabId);

      if (!currentTab?.id) throw new Error('Selected tab is no longer available.');



      const tabUrl = currentTab.url || '';

      if (!tabUrl || isRestrictedUrl(tabUrl)) {

          displayError("Browser security policies prevent extensions from extracting source code on internal browser pages and the Chrome Web Store.", "Action Blocked by Browser");

          return; 

      }

      

      activeTabInfo = currentTab;

      let sourceData = await getSourceCode(currentTab.id, settings);

      if (!sourceData || sourceData.error) throw new Error(sourceData?.error || 'No readable sources were extracted from this page.');

      

      clearTabPanes();

      errorDiv.style.display = 'none';

      loadingDiv.style.display = 'flex';

      loadingDiv.querySelector('p').textContent = 'Analyzing page sources...';

      

      const fetchPromises = sourceData.map(async (item) => {

          if (item.content !== null || item.error || !item.fullUrl) return item;



          try {

              const controller = new AbortController();

              const timeoutId = setTimeout(() => controller.abort(), 8000);

              const res = await fetch(item.fullUrl, { cache: "reload", signal: controller.signal });

              clearTimeout(timeoutId);

              if (!res.ok) throw new Error(`HTTP ${res.status}`);

              

              const isBinary = ['img', 'media', 'asset'].includes(item.type);

              if (isBinary) {

                  const buffer = await res.arrayBuffer();

                  item.content = uint8ArrayToBase64(new Uint8Array(buffer));

                  item.isBinary = true;

                  item.isBase64 = true;

              } else {

                  item.content = await res.text();

              }

          } catch(e) {

              item.error = `/* ERROR FETCHING: ${e.message}\n   URL: ${item.fullUrl} */`;

          }

          return item;

      });



      allSourceData = await Promise.all(fetchPromises);



      if (settings.autoBeautify) {

         loadingDiv.querySelector('p').textContent = 'Formatting code...';

         await new Promise(resolve => setTimeout(resolve, 10)); 

         let skippedCount = 0;

         allSourceData.forEach(item => {

             if (item.content && typeof item.content === 'string' && ['html', 'css', 'js'].includes(item.type)) {

                 if (item.content.length > 1468006) skippedCount++;

                 else {

                     item.content = Beautifier.format(item.content, item.type);

                     item.isBeautified = true;

                 }

             }

         });

         if (skippedCount > 0) showToast(`${skippedCount} file(s) skipped formatting (too large).`, "warning");

      }



      try {

        const storedInspect = await chrome.storage.local.get('last_inspected_element');

        const inspectEntry = storedInspect?.last_inspected_element;

        if (inspectEntry && inspectEntry.data && (Date.now() - (inspectEntry.timestamp || 0) < 60000)) {

          const tagName = (inspectEntry.data.tagName || 'element').toLowerCase();

          const inspectedItem = {

            type: 'html',

            source: `<${tagName}>`,

            filePath: `inspected/${tagName}.html`,

            content: inspectEntry.data.outerHTML,

            fullUrl: null

          };

          allSourceData = [inspectedItem, ...allSourceData];

          await chrome.storage.local.remove('last_inspected_element');

        }

      } catch (e) {}



      renderTabs(allSourceData, settings.hideActions); 

    } catch (error) { 

        displayError(error.message); 

    }

  };



  downloadAllBtn.addEventListener('click', handleDownloadAll);

  openViewerBtn.addEventListener('click', handleOpenViewer);

  settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

  if (donateBtn) donateBtn.addEventListener('click', () => chrome.tabs.create({ url: 'https://cash.app/$gokuthug1' }));



  tabContainer.addEventListener('wheel', (event) => {

    if (event.deltaY !== 0) { event.preventDefault(); tabContainer.scrollLeft += event.deltaY; }

  }, { passive: false });



  tabContainer.addEventListener('click', (event) => {

    const button = event.target.closest('.tab-button');

    if (button) {

      tabContainer.querySelector('.active')?.classList.remove('active');

      contentContainer.querySelector('.tab-content.active')?.classList.remove('active');

      button.classList.add('active');

      const targetContent = document.getElementById(button.dataset.tab);

      if (targetContent) {

        targetContent.classList.add('active');

        renderPaneSearch(targetContent);

      }

    }

  });



  contentContainer.addEventListener('click', async (event) => {

    const searchNavBtn = event.target.closest('.code-search-nav');

    if (searchNavBtn) {

      const pane = searchNavBtn.closest('.tab-content');

      renderPaneSearch(pane, searchNavBtn.classList.contains('code-search-prev') ? -1 : 1);

      return;

    }



    const downloadFileBtn = event.target.closest('.download-file-btn');

    if (downloadFileBtn) {

      const item = allSourceData[Number(downloadFileBtn.dataset.index)];

      if (!item) return;

      const originalHTML = downloadFileBtn.innerHTML;

      downloadFileBtn.disabled = true;

      downloadFileBtn.textContent = 'Downloading...';

      try {

        const result = await SCVFileUtils.downloadItem(item);

        downloadFileBtn.textContent = 'Downloaded!';

        showToast(`Downloaded ${result.filename}.`, 'info');

      } catch (error) {

        console.error('Individual file download failed:', error);

        downloadFileBtn.textContent = 'Error';

        showToast(error.message || 'Unable to download this file.', 'warning');

      } finally {

        setTimeout(() => {

          downloadFileBtn.innerHTML = originalHTML;

          downloadFileBtn.disabled = false;

        }, 1600);

      }

      return;

    }



    const beautifyBtn = event.target.closest('.beautify-btn');

    if (beautifyBtn) {

      const codeEl = document.getElementById(beautifyBtn.dataset.target);

      const item = allSourceData[beautifyBtn.dataset.index];

      

      if (codeEl && item) {

          if (item.isBeautified) { showToast("Code is already formatted.", "info"); return; }

          if (item.content && typeof item.content === 'string' && item.content.length > 1468006) {

              showToast("File too large to safely format.", "warning"); return;

          }



          const originalHTML = beautifyBtn.innerHTML;

          beautifyBtn.disabled = true;

          beautifyBtn.innerHTML = `<svg class="spinner" viewBox="0 0 50 50" style="width:14px;height:14px;animation:rotate 2s linear infinite;"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4"></circle></svg> Formatting...`;

          

          setTimeout(() => {

              const formatted = Beautifier.format(item.content, item.type);

              item.content = formatted;

              item.isBeautified = true; 

              codeEl.innerHTML = SyntaxHighlighter.highlight(formatted, item.type);

              paneSearchStates.delete(beautifyBtn.closest('.tab-content')?.id);



              const targetId = beautifyBtn.dataset.target.replace(/^code-/, '');

              const gutterEl = document.getElementById(`gutter-${targetId}`);

              const newLines = (formatted || '').split('\n').length || 1;

              if (gutterEl) {

                gutterEl.innerHTML = generateGutterHtml(newLines);

              }

              const pane = document.getElementById(targetId);

              if (pane) {

                const lineBadge = pane.querySelector('.line-count-badge');

                if (lineBadge) {

                  lineBadge.textContent = `${newLines.toLocaleString()} ${newLines === 1 ? 'line' : 'lines'}`;

                }

              }



              beautifyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Done!`;

              renderPaneSearch(beautifyBtn.closest('.tab-content'));

              setTimeout(() => { beautifyBtn.innerHTML = originalHTML; beautifyBtn.disabled = false; }, 2000);

          }, 10);

      }

      return;

    }



    const copyBtn = event.target.closest('.copy-btn');

    if (copyBtn) {

      const codeEl = document.getElementById(copyBtn.dataset.target);

      if (codeEl) {

        try {

          await navigator.clipboard.writeText(codeEl.textContent);

          const originalHTML = copyBtn.innerHTML;

          copyBtn.disabled = true;

          copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;

          setTimeout(() => { copyBtn.innerHTML = originalHTML; copyBtn.disabled = false; }, 2000);

        } catch (err) { console.error('Failed to copy: ', err); }

      }

      return;

    }

    

    const openBtn = event.target.closest('.open-tab-btn');

    if (openBtn?.dataset.url) chrome.tabs.create({ url: openBtn.dataset.url });



    const inspectBtn = event.target.closest('.inspect-btn');

    if (inspectBtn) {

      handleInspectElement();

      return;

    }

  });



  const applyInspectedElement = (elementData) => {

    if (!elementData || !elementData.outerHTML) return;

    const tagName = (elementData.tagName || 'element').toLowerCase();

    const inspectedItem = {

      type: 'html',

      source: `<${tagName}>`,

      filePath: `inspected/${tagName}.html`,

      content: elementData.outerHTML,

      fullUrl: null

    };



    allSourceData = [inspectedItem, ...allSourceData.filter(i => !i.filePath?.startsWith('inspected/'))];

    chrome.storage.sync.get({ hideActions: false }, (items) => {

      renderTabs(allSourceData, items.hideActions);

      const firstTab = tabContainer.querySelector('.tab-button');

      if (firstTab) firstTab.click();

      showToast(`Inspected <${tagName}> source loaded!`, 'info');

    });

  };



  const handleInspectElement = () => {

    const tabSelect = document.getElementById('tab-select');

    const targetTabId = activeTabInfo?.id || (tabSelect?.value ? parseInt(tabSelect.value) : null);

    if (!targetTabId) {

      showToast("No inspectable tab available.", "warning");

      return;

    }



    showToast("Click any element on the page (Esc to cancel)...", "info");



    chrome.tabs.sendMessage(targetTabId, { action: 'pick_element' }, (res) => {

      const err = chrome.runtime.lastError;

      if (err) {

        chrome.scripting.executeScript({ target: { tabId: targetTabId }, files: ["js/content-bridge.js"] }, () => {

          const err2 = chrome.runtime.lastError;

          if (err2) {

            showToast("Cannot inspect this page (restricted or protected).", "warning");

            return;

          }

          chrome.tabs.sendMessage(targetTabId, { action: 'pick_element' }, (res2) => {

            const err3 = chrome.runtime.lastError;

            if (err3) return;

            if (res2?.success && res2.elementData) {

              applyInspectedElement(res2.elementData);

            }

          });

        });

        return;

      }

      if (res?.success && res.elementData) {

        applyInspectedElement(res.elementData);

      }

    });

  };



  contentContainer.addEventListener('input', (event) => {

    const searchInput = event.target.closest('.code-search-input');

    if (searchInput) renderPaneSearch(searchInput.closest('.tab-content'));

  });



  contentContainer.addEventListener('keydown', (event) => {

    const searchInput = event.target.closest('.code-search-input');

    if (searchInput && event.key === 'Enter') {

      event.preventDefault();

      renderPaneSearch(searchInput.closest('.tab-content'), event.shiftKey ? -1 : 1);

    }

  });



  document.addEventListener('keydown', (event) => {

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {

      const activePane = contentContainer.querySelector('.tab-content.active');

      const searchInput = activePane?.querySelector('.code-search-input');

      if (searchInput) {

        event.preventDefault();

        searchInput.focus();

        searchInput.select();

      }

    }

  });



  const applyCustomCSS = (css) => {

    const styleEl = document.getElementById('custom-user-css');

    if (styleEl) styleEl.textContent = css || '';

  };



  const loadAndApplyPopupTheme = async () => {

    const s = await chrome.storage.sync.get({ theme: 'Dark', customTheme: {}, linkColor: '', customCSS: '' });

    const baseTheme = s.theme === 'Custom'

      ? { ...s.customTheme }

      : { ...(THEMES[s.theme] || THEMES['Dark']) };

    if (s.linkColor) {

      baseTheme['--link-color'] = s.linkColor;

    }

    applyTheme(baseTheme, s.theme);

    applyCustomCSS(s.customCSS);

  };



  // Real-time sync when settings change

  chrome.storage.onChanged.addListener((changes, area) => {

    if (area !== 'sync') return;

    if (changes.showLineNumbers) {

      globalShowLineNumbers = changes.showLineNumbers.newValue !== false;

      if (allSourceData && allSourceData.length > 0) {

        chrome.storage.sync.get({ hideActions: false }, (s) => {

          renderTabs(allSourceData, s.hideActions);

        });

      }

    }

    if (changes.hideActions) {

      if (allSourceData && allSourceData.length > 0) {

        renderTabs(allSourceData, changes.hideActions.newValue === true);

      }

    }

    if (changes.enableTabSwitching) {

      const tabSelectorContainer = document.getElementById('tab-selector-container');

      if (changes.enableTabSwitching.newValue === false) {

        if (tabSelectorContainer) tabSelectorContainer.style.display = 'none';

      } else if (activeTabInfo?.id) {

        chrome.storage.sync.get({ enableTabSwitching: true }, (s) => {

          populateTabSelector(activeTabInfo.id, s);

        });

      }

    }

    if (changes.theme || changes.customTheme || changes.linkColor || changes.customCSS) {

      loadAndApplyPopupTheme();

    }

  });



  const main = async () => {

    try {

      await syncWindowLayout();

      const settings = await chrome.storage.sync.get({ 

          theme: 'Dark', customTheme: {}, linkColor: '', customCSS: '', autoBeautify: false, hideActions: false, 

          hideDonation: false, deepCrawl: false, customTooltips: true, showLineNumbers: true, enableTabSwitching: true

      });

      globalCustomTooltips = settings.customTooltips;

      globalShowLineNumbers = settings.showLineNumbers !== false;

      const themeConfig = settings.theme === 'Custom'

        ? { ...settings.customTheme }

        : { ...(THEMES[settings.theme] || THEMES['Dark']) };

      if (settings.linkColor) {

        themeConfig['--link-color'] = settings.linkColor;

      }

      applyTheme(themeConfig, settings.theme);

      applyCustomCSS(settings.customCSS);

      setupTooltips(globalCustomTooltips);

      

      if (settings.hideDonation && donateBtn) donateBtn.style.display = 'none';



      const urlParams = new URLSearchParams(window.location.search);

      const targetTabId = urlParams.get('tabId');

      let currentTab;



      if (targetTabId) currentTab = await chrome.tabs.get(parseInt(targetTabId));

      else {

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        currentTab = tab;

      }

      

      if (!currentTab?.id) throw new Error('No active tab.');

      await populateTabSelector(currentTab.id, settings);

      await runExtractionForTab(currentTab.id, settings);

    } catch (error) { 

        displayError(error.message); 

    }

  };



  if (chrome.windows?.onBoundsChanged) {

    chrome.windows.onBoundsChanged.addListener((windowInfo) => {

      if (windowInfo.id === currentWindowId) syncWindowLayout(windowInfo);

    });

  }

  window.addEventListener('resize', () => syncWindowLayout());

  

  main();

});
