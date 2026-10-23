/**
 * js/viewer.js
 * Source Code Viewer UI Orchestrator.
 * Handles side-panel live loading, tab switching, secret audits, and directory rendering.
 * Fully hardened for Chrome Web Store v10.5.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const fileListEl = document.getElementById('file-list');
    const codeContainer = document.getElementById('code-container');
    const welcomeMessage = document.getElementById('welcome-message');
    const pageTitle = document.getElementById('page-title');
    const pageUrl = document.getElementById('page-url');
    const currentFilePath = document.getElementById('current-file-path');
    const currentFileSize = document.getElementById('current-file-size');
    const currentFileLines = document.getElementById('current-file-lines');
    const cssCoverageBadge = document.getElementById('css-coverage-badge');
    const copyBtn = document.getElementById('copy-code-btn');
    const openTabBtn = document.getElementById('open-new-tab-btn');
    const beautifyBtn = document.getElementById('beautify-code-btn');
    const findInFileBtn = document.getElementById('find-in-file-btn');
    const downloadBtn = document.getElementById('download-btn');
    const singleDownloadBtn = document.getElementById('single-download-btn');
    const livePreviewBtn = document.getElementById('live-preview-btn');
    const diffSnapshotBtn = document.getElementById('diff-snapshot-btn');
    const updateSnapshotBtn = document.getElementById('update-snapshot-btn');
    const exportDropdownBtn = document.getElementById('export-dropdown-btn');
    const exportMenu = document.getElementById('export-menu');
    const frameworkBadgesEl = document.getElementById('framework-badges');
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    const assetPreviewContainer = document.getElementById('asset-preview-container');
    const codeScrollContainer = document.getElementById('code-scroll-container');
    const headerAssetActions = document.getElementById('header-asset-actions');

    const livePreviewModal = document.getElementById('live-preview-modal');
    const closeLivePreviewBtn = document.getElementById('close-live-preview-btn');

    const diffModal = document.getElementById('diff-modal');
    const closeDiffModalBtn = document.getElementById('close-diff-modal-btn');
    const diffModalBody = document.getElementById('diff-modal-body');

    const tabFilesBtn = document.getElementById('tab-files-btn');
    const tabSecretsBtn = document.getElementById('tab-secrets-btn');
    const tabGrepBtn = document.getElementById('tab-grep-btn');
    const secretsBadge = document.getElementById('secrets-badge');
    const secretsListEl = document.getElementById('secrets-list');
    const grepInput = document.getElementById('grep-input');
    const grepResultsEl = document.getElementById('grep-results');

    const tabSelect = document.getElementById('tab-select');
    const tabSelectorContainer = document.getElementById('tab-selector-container');
    const refreshTabBtn = document.getElementById('refresh-tab-btn');

    let allData = [];
    let currentActiveItem = null;
    let viewMode = 'tree';
    let showLineNumbers = true;
    let worker = null;
    let sourceTabId = null;

    let viewerSettings = {
        theme: 'Dark',
        customTheme: {},
        linkColor: '',
        customCSS: '',
        showLineNumbers: true,
        customTooltips: true,
        autoBeautify: false,
        hideActions: false,
        enableTabSwitching: true,
        github_pat: ''
    };

    try {
        worker = new Worker('js/worker.js');
    } catch (e) {}

    const showToast = (message, type = 'warning') => {
        document.querySelectorAll('.source-viewer-toast').forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = 'source-viewer-toast';
        const iconSvg = type === 'info'
            ? `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
            : `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

        toast.innerHTML = `${iconSvg}<span>${message}</span>`;
        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.classList.add('visible'); });
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    };

    const escapeHTML = (str) => String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const formatBytes = (bytes, decimals = 1) => {
        if (!+bytes) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const uint8ArrayToBase64 = (uint8) => {
        if (!uint8 || !(uint8 instanceof Uint8Array)) return "";
        let chunks = [];
        const chunkSize = 0xffff;
        for (let i = 0; i < uint8.length; i += chunkSize) {
            chunks.push(String.fromCharCode.apply(null, uint8.subarray(i, i + chunkSize)));
        }
        return btoa(chunks.join(''));
    };

    const isRestrictedUrl = (url) => {
        const restricted = ['chrome://', 'edge://', 'chrome-extension://', 'view-source:', 'https://chrome.google.com/webstore', 'https://chromewebstore.google.com'];
        return restricted.some(p => url.startsWith(p)) || (url.startsWith('about:') && url !== 'about:blank');
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

    const requestLiveExtraction = async (tabId) => {
        const settings = await chrome.storage.sync.get({ deepCrawl: false });
        const request = async () => {
            const res = await sendTabMessage(tabId, { action: 'extract_source', deepCrawl: settings.deepCrawl });
            if (res && res.success) {
                if (res.storageKey) {
                    const stored = await chrome.storage.local.get(res.storageKey);
                    const data = stored[res.storageKey];
                    chrome.storage.local.remove(res.storageKey);
                    if (data) return data;
                }
                if (res.result) return res.result;
            }
            throw new Error(res?.error || "Unable to extract page sources.");
        };

        try {
            return await request();
        } catch (err) {
            try {
                await executeContentBridge(tabId);
                return await request();
            } catch (e) {
                throw err;
            }
        }
    };

    const initTabSelector = async () => {
        if (!tabSelect || !tabSelectorContainer) return;
        try {
            const settings = await chrome.storage.sync.get({ enableTabSwitching: true });
            if (settings.enableTabSwitching === false) {
                tabSelectorContainer.style.display = 'none';
                return;
            }

            const tabs = await chrome.tabs.query({});
            tabSelect.innerHTML = '';
            const inspectable = tabs.filter(t => t.url && !isRestrictedUrl(t.url));

            if (inspectable.length === 0) {
                tabSelectorContainer.style.display = 'none';
                return;
            }

            inspectable.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                let domain = '';
                try { domain = new URL(t.url).hostname.replace(/^www\./i, ''); } catch (e) {}
                opt.textContent = `${t.title || 'Untitled'} (${domain || 'Page'})`;
                if (t.id === sourceTabId) opt.selected = true;
                tabSelect.appendChild(opt);
            });

            tabSelectorContainer.style.display = 'flex';
            tabSelect.onchange = async () => {
                const newTabId = parseInt(tabSelect.value);
                if (newTabId) {
                    await extractAndRenderTab(newTabId);
                }
            };
        } catch (e) {}
    };

    const extractAndRenderTab = async (tabId) => {
        try {
            welcomeMessage.style.display = 'flex';
            codeContainer.style.display = 'none';
            welcomeMessage.innerHTML = `<h2>Extracting page sources...</h2><p>Collecting scripts, styles, and DOM tree.</p>`;

            let tab = null;
            try {
                tab = await chrome.tabs.get(tabId);
            } catch (e) {
                welcomeMessage.innerHTML = `<h2>Tab Unavailable</h2><p>The selected browser tab could not be reached.</p>`;
                allData = [];
                renderSidebar();
                return;
            }

            if (!tab?.url || isRestrictedUrl(tab.url)) {
                allData = [];
                sourceTabId = tab?.id || null;
                pageTitle.textContent = tab?.title || 'Restricted Page';
                pageUrl.textContent = tab?.url || '';
                welcomeMessage.innerHTML = `<h2>Restricted Page</h2><p>Browser security prevents inspecting internal or Web Store tabs.</p>`;
                welcomeMessage.style.display = 'flex';
                codeContainer.style.display = 'none';
                renderSidebar();
                renderFrameworkBadges();
                runSecretScan();
                return;
            }

            sourceTabId = tab.id;
            pageTitle.textContent = tab.title || 'Source Code';
            pageUrl.textContent = tab.url || '';

            const extracted = await requestLiveExtraction(tab.id);
            allData = extracted;

            // Fallback extension-context fetch for scripts/styles blocked by page CSP
            const fetchPromises = allData.map(async (item) => {
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
                } catch (e) {
                    item.error = `/* ERROR FETCHING: ${e.message}\n   URL: ${item.fullUrl} */`;
                }
                return item;
            });
            allData = await Promise.all(fetchPromises);

            for (const item of [...allData]) {
                if (item.type === 'js' || item.type === 'css') {
                    const reconstructed = await SourceMapResolver.resolve(item);
                    if (reconstructed.length > 0) allData.push(...reconstructed);
                }
            }

            renderFrameworkBadges();
            runSecretScan();
            renderSidebar();

            welcomeMessage.innerHTML = `
                <div class="welcome-icon-wrapper">
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="welcome-icon">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                    </svg>
                </div>
                <h2>${allData.length} files extracted</h2>
                <p>Select a file from the sidebar to inspect its source code.</p>
            `;
        } catch (err) {
            welcomeMessage.innerHTML = `<h2>Extraction Error</h2><p>${escapeHTML(err.message)}</p>`;
        }
    };

    if (refreshTabBtn) {
        refreshTabBtn.onclick = () => {
            if (sourceTabId) extractAndRenderTab(sourceTabId);
        };
    }

    const setupSidePanelSync = () => {
        chrome.tabs.onActivated.addListener(async (activeInfo) => {
            try {
                const win = await chrome.windows.getCurrent();
                if (activeInfo.windowId !== win.id) return;
                const tab = await chrome.tabs.get(activeInfo.tabId);
                if (!tab) return;
                await initTabSelector();
                await extractAndRenderTab(tab.id);
            } catch (e) {}
        });

        let updateTimer = null;
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (tabId === sourceTabId && (changeInfo.status === 'complete' || changeInfo.url)) {
                clearTimeout(updateTimer);
                updateTimer = setTimeout(async () => {
                    try {
                        await initTabSelector();
                        await extractAndRenderTab(tabId);
                    } catch (e) {}
                }, 250);
            }
        });
    };

    const loadSessionData = async () => {
        const params = new URLSearchParams(window.location.search);
        const viewerId = params.get('id');

        let isSidePanel = false;
        try {
            const currentTab = await chrome.tabs.getCurrent();
            isSidePanel = !currentTab && !viewerId;
        } catch (e) {
            isSidePanel = !viewerId;
        }

        if (isSidePanel) {
            await initTabSelector();
            const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            if (activeTab?.id) {
                await extractAndRenderTab(activeTab.id);
            } else {
                welcomeMessage.innerHTML = `<h2>No Active Tab</h2><p>Navigate to any webpage to inspect its files.</p>`;
            }
            setupSidePanelSync();
            return;
        }

        let sessionData = null;
        if (viewerId) {
            try {
                sessionData = await SCVDB.getSession(viewerId);
            } catch (error) {}
            if (!sessionData) {
                const fallback = await chrome.storage.local.get(`source_data_${viewerId}`);
                sessionData = fallback[`source_data_${viewerId}`] || null;
            }
        }

        if (!sessionData || !sessionData.data || sessionData.data.length === 0) {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (activeTab?.id && !isRestrictedUrl(activeTab.url || '')) {
                await initTabSelector();
                await extractAndRenderTab(activeTab.id);
                return;
            }
            welcomeMessage.innerHTML = `<h2>No Source Data Found</h2><p>Navigate to any webpage and open Source Code Viewer to inspect its files.</p>`;
            await initTabSelector();
            return;
        }

        allData = sessionData.data;
        sourceTabId = Number.isInteger(sessionData.tabId) ? sessionData.tabId : Number(sessionData.tabId) || null;
        pageTitle.textContent = sessionData.title || 'Source Code';
        pageUrl.textContent = sessionData.url || '';

        for (const item of [...allData]) {
            if (item.type === 'js' || item.type === 'css') {
                const reconstructed = await SourceMapResolver.resolve(item);
                if (reconstructed.length > 0) {
                    allData.push(...reconstructed);
                }
            }
        }

        await initTabSelector();
        renderFrameworkBadges();
        runSecretScan();
        renderSidebar();

        try { SCVDB.pruneOldSessions(); } catch (e) {}
    };

    const renderFrameworkBadges = () => {
        const detected = FrameworkDetector.detectPage(allData);
        frameworkBadgesEl.innerHTML = '';
        detected.forEach(fw => {
            const badge = document.createElement('span');
            badge.className = 'framework-badge';
            badge.style.borderColor = fw.color;
            badge.innerHTML = `<span class="badge-icon">${fw.iconSvg}</span> <span>${escapeHTML(fw.name)}</span>`;
            frameworkBadgesEl.appendChild(badge);
        });
    };

    const runSecretScan = () => {
        const findings = SecretScanner.scan(allData);
        secretsBadge.textContent = String(findings.length);
        secretsListEl.innerHTML = '';

        if (findings.length === 0) {
            secretsListEl.innerHTML = '<p class="empty-msg">No credentials or secrets detected.</p>';
            return;
        }

        findings.forEach(f => {
            const card = document.createElement('div');
            card.className = `secret-card severity-${f.severity.toLowerCase()}`;
            card.innerHTML = `
                <div class="secret-card-header">
                    <span class="severity-tag">${f.severity}</span>
                    <span class="rule-name">${escapeHTML(f.ruleName)}</span>
                </div>
                <div class="secret-location">Line ${f.line} in <code>${escapeHTML(f.filePath)}</code></div>
                <div class="secret-snippet"><code>${escapeHTML(f.snippet)}</code></div>
            `;
            card.addEventListener('click', () => {
                if (f.item) {
                    loadCode(f.item, formatBytes(new Blob([f.item.content || '']).size), f.line);
                }
            });
            secretsListEl.appendChild(card);
        });
    };

    const renderSidebar = () => {
        fileListEl.innerHTML = '';
        if (viewMode === 'tree') renderTreeView(allData);
        else renderFlatView(allData);
    };

    const renderFlatView = (data) => {
        ['html', 'css', 'js', 'json', 'img', 'media', 'asset'].forEach(type => {
            const items = data.filter(item => item.type === type);
            if (items.length === 0) return;
            items.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'file-item';
                if (currentActiveItem === item) div.classList.add('active');

                const displayName = item.source === 'inline'
                    ? `Inline ${type.toUpperCase()} ${index + 1}`
                    : (item.filePath ? item.filePath.split('/').pop() : item.source);
                const safeDisplayName = escapeHTML(displayName);
                const sizeVal = typeof item.content === 'string'
                    ? new Blob([item.content]).size
                    : (item.content?.byteLength || item.content?.length || 0);
                const size = formatBytes(sizeVal);

                div.innerHTML = `<div class="file-item-left"><span class="file-tag ${type}">${type.toUpperCase()}</span><span class="file-name" title="${safeDisplayName}">${safeDisplayName}</span></div><span class="file-size-sidebar">${size}</span>`;
                div.addEventListener('click', () => {
                    document.querySelectorAll('.file-item, .tree-file-item').forEach(el => el.classList.remove('active'));
                    div.classList.add('active');
                    currentActiveItem = item;
                    loadCode(item, size);
                });
                fileListEl.appendChild(div);
            });
        });
    };

    const renderTreeView = (data) => {
        const root = {};
        data.forEach(item => {
            const pathParts = (item.filePath || item.source || 'inline').split('/');
            let current = root;
            pathParts.forEach((part, i) => {
                if (i === pathParts.length - 1) {
                    current[part] = item;
                } else {
                    if (!current[part]) current[part] = {};
                    current = current[part];
                }
            });
        });

        const folderIconSvg = `<svg class="folder-svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
        const chevronSvg = `<svg class="chevron-svg" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

        const buildTreeHtml = (node, containerEl) => {
            const ul = document.createElement('ul');
            ul.className = 'tree-group';

            Object.keys(node).sort().forEach(key => {
                const val = node[key];
                const li = document.createElement('li');

                if (val && typeof val === 'object' && !val.type) {
                    li.className = 'tree-folder';
                    li.innerHTML = `
                        <div class="folder-header" tabindex="0" role="button">
                            <span class="tree-chevron">${chevronSvg}</span>
                            <span class="folder-icon">${folderIconSvg}</span>
                            <span class="folder-name">${escapeHTML(key)}</span>
                        </div>
                    `;
                    const subContainer = document.createElement('div');
                    subContainer.className = 'folder-content collapsed';
                    buildTreeHtml(val, subContainer);
                    li.appendChild(subContainer);

                    const toggleFolder = (e) => {
                        e.stopPropagation();
                        const chevron = li.querySelector('.tree-chevron');
                        const content = li.querySelector('.folder-content');
                        content.classList.toggle('collapsed');
                        chevron.classList.toggle('open', !content.classList.contains('collapsed'));
                    };

                    li.querySelector('.folder-header').onclick = toggleFolder;
                    li.querySelector('.folder-header').onkeydown = (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleFolder(e);
                        }
                    };
                } else {
                    const item = val;
                    li.className = 'tree-file-item';
                    if (currentActiveItem === item) li.classList.add('active');
                    const type = item.type || 'js';
                    const size = formatBytes(typeof item.content === 'string' ? new Blob([item.content]).size : (item.content?.byteLength || 0));

                    li.innerHTML = `
                        <span class="file-tag ${type}">${type.toUpperCase()}</span>
                        <span class="file-name">${escapeHTML(key)}</span>
                        <span class="file-size-sidebar">${size}</span>
                    `;

                    li.addEventListener('click', (e) => {
                        e.stopPropagation();
                        document.querySelectorAll('.tree-file-item, .file-item').forEach(el => el.classList.remove('active'));
                        li.classList.add('active');
                        currentActiveItem = item;
                        loadCode(item, size);
                    });
                }
                ul.appendChild(li);
            });
            containerEl.appendChild(ul);
        };

        buildTreeHtml(root, fileListEl);
    };

    const applyCodeActionsVisibility = (hide) => {
        if (copyBtn) copyBtn.style.display = hide ? 'none' : 'flex';
        if (beautifyBtn) beautifyBtn.style.display = hide ? 'none' : 'flex';
        if (openTabBtn) {
            if (hide) openTabBtn.style.display = 'none';
            else if (currentActiveItem?.fullUrl) openTabBtn.style.display = 'flex';
        }
    };

    const loadCode = (item, readableSize, targetLine = null, preHighlighted = null) => {
        welcomeMessage.style.display = 'none';
        codeContainer.style.display = 'flex';
        if (headerAssetActions) headerAssetActions.innerHTML = '';

        currentFilePath.textContent = item.fullUrl || item.filePath || 'Inline Content';
        currentFileSize.textContent = readableSize;

        if (item.cssCoverage) {
            cssCoverageBadge.style.display = 'inline-block';
            cssCoverageBadge.textContent = `Coverage: ${item.cssCoverage.usedPercentage}% used (${item.cssCoverage.unused} unused)`;
        } else {
            cssCoverageBadge.style.display = 'none';
        }

        if (item.fullUrl && !viewerSettings.hideActions) {
            openTabBtn.style.display = 'flex';
            openTabBtn.dataset.url = item.fullUrl;
        } else {
            openTabBtn.style.display = 'none';
        }

        // Apply settings.autoBeautify if enabled and not already beautified
        if (viewerSettings.autoBeautify && !item.isBeautified && ['html', 'css', 'js'].includes(item.type) && typeof item.content === 'string' && !item.error) {
            try {
                item.content = Beautifier.format(item.content, item.type);
                item.isBeautified = true;
            } catch (_) {}
        }

        const isBinaryType = ['img', 'media', 'asset'].includes(item.type) || item.isBinary;
        const ext = (item.filePath || item.source || '').split('.').pop().toLowerCase();
        const isFont = ['woff2', 'ttf', 'woff', 'otf'].includes(ext);
        const isAudioMedia = ['mp3', 'mp4', 'wav', 'ogg', 'webm'].includes(ext);
        const isSvg = ext === 'svg' || item.type === 'svg';

        if (isBinaryType || isFont || isAudioMedia || isSvg) {
            renderBinaryAssetPreview(item, ext, isSvg, isFont, isAudioMedia, preHighlighted, targetLine);
        } else {
            assetPreviewContainer.style.display = 'none';
            codeScrollContainer.style.display = 'flex';

            const rawContent = item.error || (typeof item.content === 'string' ? item.content : '// [Binary Content]');
            const lineCount = (rawContent || '').split('\n').length || 1;
            if (showLineNumbers && currentFileLines) {
                currentFileLines.style.display = 'inline-block';
                currentFileLines.textContent = `${lineCount.toLocaleString()} ${lineCount === 1 ? 'line' : 'lines'}`;
            } else if (currentFileLines) {
                currentFileLines.style.display = 'none';
            }

            // Reuse pre-highlighted tokens from worker or cache when available
            const highlighted = preHighlighted || item.highlighted || SyntaxHighlighter.highlight(rawContent, item.type);
            item.highlighted = highlighted;
            EditorEngine.attach(codeScrollContainer, highlighted, rawContent, item.type, { showLineNumbers });

            if (targetLine) {
                setTimeout(() => {
                    EditorEngine.scrollToLine(codeScrollContainer, targetLine);
                }, 100);
            }
        }
    };

    const renderBinaryAssetPreview = async (item, ext, isSvg, isFont, isAudioMedia, preHighlighted = null, targetLine = null) => {
        codeScrollContainer.style.display = 'none';
        assetPreviewContainer.style.display = 'flex';
        assetPreviewContainer.innerHTML = '';

        let contentSrc = '';
        if (item.isBase64 && item.content) {
            let mime = 'image/png';
            if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
            else if (ext === 'svg') mime = 'image/svg+xml';
            else if (ext === 'woff2') mime = 'font/woff2';
            else if (ext === 'woff') mime = 'font/woff';
            else if (ext === 'ttf') mime = 'font/ttf';
            else if (ext === 'otf') mime = 'font/otf';
            else if (ext === 'mp3') mime = 'audio/mpeg';
            else if (ext === 'mp4') mime = 'video/mp4';
            contentSrc = `data:${mime};base64,${item.content}`;
        } else if (item.fullUrl) {
            contentSrc = item.fullUrl;
        }

        if (isSvg) {
            // SVG Base64 decoding & preview / source code toggle
            let rawSvg = '';
            if (item.isBase64 && item.content) {
                try {
                    rawSvg = atob(item.content);
                } catch (_) {
                    rawSvg = item.content || '';
                }
            } else {
                rawSvg = item.content || '';
            }

            let svgViewMode = 'preview'; // 'preview' | 'code'

            const renderSvgView = () => {
                if (svgViewMode === 'code') {
                    assetPreviewContainer.style.display = 'none';
                    codeScrollContainer.style.display = 'flex';
                    const lineCount = (rawSvg || '').split('\n').length || 1;
                    if (showLineNumbers && currentFileLines) {
                        currentFileLines.style.display = 'inline-block';
                        currentFileLines.textContent = `${lineCount.toLocaleString()} ${lineCount === 1 ? 'line' : 'lines'}`;
                    } else if (currentFileLines) {
                        currentFileLines.style.display = 'none';
                    }

                    const highlighted = preHighlighted || item.highlighted || SyntaxHighlighter.highlight(rawSvg, 'html');
                    item.highlighted = highlighted;
                    EditorEngine.attach(codeScrollContainer, highlighted, rawSvg, 'html', { showLineNumbers });

                    if (targetLine) {
                        setTimeout(() => {
                            EditorEngine.scrollToLine(codeScrollContainer, targetLine);
                        }, 100);
                    }
                } else {
                    codeScrollContainer.style.display = 'none';
                    assetPreviewContainer.style.display = 'flex';
                    if (currentFileLines) currentFileLines.style.display = 'none';

                    assetPreviewContainer.innerHTML = `
                        <div id="image-preview-wrapper" class="image-preview-box checkerboard">
                            ${rawSvg.includes('<svg') ? rawSvg : `<img src="${contentSrc}" alt="SVG Preview" style="max-width: 100%; max-height: 480px; object-fit: contain;" />`}
                        </div>
                    `;
                }

                if (headerAssetActions) {
                    headerAssetActions.innerHTML = `
                        <button id="toggle-svg-mode-btn" class="action-btn secondary-btn" data-tooltip="Toggle SVG visual preview vs XML source">
                            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                            <span>${svgViewMode === 'code' ? 'View Preview' : 'View Source'}</span>
                        </button>
                        ${svgViewMode === 'preview' ? `
                        <button id="toggle-checkerboard-btn" class="action-btn secondary-btn" data-tooltip="Toggle transparency grid">
                            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                            <span>Toggle Grid</span>
                        </button>` : ''}
                    `;

                    headerAssetActions.querySelector('#toggle-svg-mode-btn').onclick = () => {
                        svgViewMode = svgViewMode === 'preview' ? 'code' : 'preview';
                        renderSvgView();
                    };

                    const gridBtn = headerAssetActions.querySelector('#toggle-checkerboard-btn');
                    if (gridBtn) {
                        gridBtn.onclick = () => {
                            const wrapper = assetPreviewContainer.querySelector('#image-preview-wrapper');
                            if (wrapper) wrapper.classList.toggle('checkerboard');
                        };
                    }
                }
            };

            renderSvgView();
        } else if (isFont) {
            if (currentFileLines) currentFileLines.style.display = 'none';

            const fontSafeName = 'SCVFont_' + (item.filePath || item.source || 'font').replace(/[^a-zA-Z0-9]/g, '_');

            // Register font buffer via browser FontFace API
            try {
                let fontFace = null;
                if (item.isBase64 && item.content) {
                    const binary = atob(item.content);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    fontFace = new FontFace(fontSafeName, bytes.buffer);
                } else if (contentSrc) {
                    fontFace = new FontFace(fontSafeName, `url(${contentSrc})`);
                }

                if (fontFace) {
                    const loaded = await fontFace.load();
                    document.fonts.add(loaded);
                }
            } catch (fontErr) {
                console.warn("Could not register custom font face:", fontErr);
            }

            assetPreviewContainer.innerHTML = `
                <div class="font-specimen-card" style="font-family: '${fontSafeName}', monospace, sans-serif; padding: 24px; max-width: 800px; width: 100%;">
                    <div class="font-specimen-header" style="margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
                        <h3 style="margin: 0 0 6px 0; color: var(--accent-color);">Font Specimen: <code>${escapeHTML(item.filePath || item.source)}</code></h3>
                        <span style="font-size: 12px; opacity: 0.7;">Format: ${ext.toUpperCase()} | Registered as: <code>${fontSafeName}</code></span>
                    </div>
                    <p style="font-family: '${fontSafeName}', sans-serif; font-size: 14px; margin: 12px 0;">The quick brown fox jumps over the lazy dog. 0123456789</p>
                    <p style="font-family: '${fontSafeName}', sans-serif; font-size: 22px; margin: 16px 0;">Sphinx of black quartz, judge my vow.</p>
                    <p style="font-family: '${fontSafeName}', sans-serif; font-size: 34px; font-weight: bold; margin: 16px 0;">Pack my box with five dozen liquor jugs.</p>
                    <div style="font-family: '${fontSafeName}', sans-serif; font-size: 15px; margin-top: 20px; opacity: 0.85; line-height: 1.6; word-break: break-all; background: var(--secondary-bg); padding: 14px; border-radius: 6px;">
                        abcdefghijklmnopqrstuvwxyz<br>
                        ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>
                        0123456789 !@#$%^&amp;*()_+-=[]{}|;:&quot;',./&lt;&gt;?
                    </div>
                </div>
            `;
        } else if (isAudioMedia) {
            if (ext === 'mp4' || ext === 'webm') {
                assetPreviewContainer.innerHTML = `<video controls src="${contentSrc}" style="max-width: 100%; border-radius: 8px;"></video>`;
            } else {
                assetPreviewContainer.innerHTML = `<audio controls src="${contentSrc}"></audio>`;
            }
        } else {
            if (currentFileLines) currentFileLines.style.display = 'none';
            if (headerAssetActions) {
                headerAssetActions.innerHTML = `
                    <button id="toggle-checkerboard-btn" class="action-btn secondary-btn" data-tooltip="Toggle transparency grid">
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                        <span>Toggle Grid</span>
                    </button>
                `;

                headerAssetActions.querySelector('#toggle-checkerboard-btn').onclick = () => {
                    const wrapper = assetPreviewContainer.querySelector('#image-preview-wrapper');
                    if (wrapper) wrapper.classList.toggle('checkerboard');
                };
            }

            assetPreviewContainer.innerHTML = `
                <div id="image-preview-wrapper" class="image-preview-box checkerboard">
                    <img src="${contentSrc}" alt="Asset Preview" style="max-width: 100%; max-height: 480px; object-fit: contain;" />
                </div>
            `;
        }
    };

    tabFilesBtn.onclick = () => {
        tabFilesBtn.classList.add('active'); tabSecretsBtn.classList.remove('active'); tabGrepBtn.classList.remove('active');
        fileListEl.classList.add('active'); document.getElementById('secrets-panel').classList.remove('active'); document.getElementById('grep-panel').classList.remove('active');
    };

    tabSecretsBtn.onclick = () => {
        tabSecretsBtn.classList.add('active'); tabFilesBtn.classList.remove('active'); tabGrepBtn.classList.remove('active');
        document.getElementById('secrets-panel').classList.add('active'); fileListEl.classList.remove('active'); document.getElementById('grep-panel').classList.remove('active');
    };

    tabGrepBtn.onclick = () => {
        tabGrepBtn.classList.add('active'); tabFilesBtn.classList.remove('active'); tabSecretsBtn.classList.remove('active');
        document.getElementById('grep-panel').classList.add('active'); fileListEl.classList.remove('active'); document.getElementById('secrets-panel').classList.remove('active');
    };

    grepInput.oninput = (e) => {
        const query = e.target.value.trim();
        grepResultsEl.innerHTML = '';
        if (!query) {
            grepResultsEl.innerHTML = '<p class="empty-msg">Type search query above.</p>';
            return;
        }

        let regex;
        try {
            regex = new RegExp(query, 'gi');
        } catch (err) {
            regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        }

        let totalMatches = 0;
        allData.forEach(item => {
            if (!item.content || typeof item.content !== 'string') return;
            const lines = item.content.split('\n');
            const fileMatches = [];

            lines.forEach((line, idx) => {
                if (regex.test(line)) {
                    fileMatches.push({ lineNum: idx + 1, text: line.trim() });
                    totalMatches++;
                }
            });

            if (fileMatches.length > 0) {
                const group = document.createElement('div');
                group.className = 'grep-file-group';
                group.innerHTML = `<div class="grep-file-header">${escapeHTML(item.filePath || item.source)} (${fileMatches.length})</div>`;

                fileMatches.forEach(m => {
                    const lineRow = document.createElement('div');
                    lineRow.className = 'grep-line-row';
                    lineRow.innerHTML = `<span class="grep-line-num">L${m.lineNum}:</span> <span class="grep-snippet">${escapeHTML(m.text)}</span>`;
                    lineRow.onclick = () => loadCode(item, formatBytes(new Blob([item.content]).size), m.lineNum);
                    group.appendChild(lineRow);
                });
                grepResultsEl.appendChild(group);
            }
        });

        if (totalMatches === 0) {
            grepResultsEl.innerHTML = '<p class="empty-msg">No matching results found.</p>';
        }
    };

    toggleViewBtn.onclick = () => {
        viewMode = viewMode === 'tree' ? 'flat' : 'tree';
        renderSidebar();
    };

    if (findInFileBtn) {
        findInFileBtn.onclick = () => {
            if (codeScrollContainer.style.display !== 'none') {
                EditorEngine.openSearchBar(codeScrollContainer);
            }
        };
    }

    beautifyBtn.onclick = () => {
        if (!currentActiveItem) return;
        if (currentActiveItem.isBeautified) { showToast("Code is already formatted.", "info"); return; }

        const originalHTML = beautifyBtn.innerHTML;
        beautifyBtn.disabled = true;
        beautifyBtn.innerHTML = `<span>Formatting...</span>`;

        const applyResult = (formatted, preHighlighted = null) => {
            currentActiveItem.content = formatted;
            currentActiveItem.isBeautified = true;
            if (preHighlighted) currentActiveItem.highlighted = preHighlighted;
            loadCode(currentActiveItem, currentFileSize.textContent, null, preHighlighted);
            beautifyBtn.innerHTML = `<span>Done!</span>`;
            setTimeout(() => { beautifyBtn.innerHTML = originalHTML; beautifyBtn.disabled = false; }, 1500);
        };

        if (worker) {
            const reqId = Date.now();
            const timer = setTimeout(() => {
                const formatted = Beautifier.format(currentActiveItem.content, currentActiveItem.type);
                applyResult(formatted);
            }, 3000);

            worker.onmessage = (e) => {
                if (e.data.id === reqId) {
                    clearTimeout(timer);
                    if (e.data.success) {
                        applyResult(e.data.formatted, e.data.highlighted);
                    } else {
                        applyResult(Beautifier.format(currentActiveItem.content, currentActiveItem.type));
                    }
                }
            };
            worker.postMessage({ action: 'beautify_and_highlight', code: currentActiveItem.content, type: currentActiveItem.type, id: reqId });
        } else {
            const formatted = Beautifier.format(currentActiveItem.content, currentActiveItem.type);
            applyResult(formatted);
        }
    };

    openTabBtn.onclick = () => {
        const url = openTabBtn.dataset.url || currentActiveItem?.fullUrl;
        if (url) chrome.tabs.create({ url });
    };

    copyBtn.onclick = async () => {
        try {
            const activeCodeEl = document.getElementById('active-editor-code');
            await navigator.clipboard.writeText(currentActiveItem?.content || activeCodeEl?.textContent || '');
            showToast("Copied to clipboard!", "info");
        } catch (err) {
            showToast("Failed to copy code.", "warning");
        }
    };

    singleDownloadBtn.onclick = async () => {
        if (!currentActiveItem) return;
        singleDownloadBtn.disabled = true;
        try {
            const result = await SCVFileUtils.downloadItem(currentActiveItem);
            showToast(`Downloaded ${result.filename}.`, 'info');
        } catch (error) {
            showToast(error.message || 'Unable to download file.', 'warning');
        } finally {
            singleDownloadBtn.disabled = false;
        }
    };

    const closeLivePreview = () => {
        livePreviewModal.style.display = 'none';
        const modalBody = livePreviewModal.querySelector('.modal-body');
        if (modalBody) modalBody.innerHTML = '';
    };

    livePreviewBtn.onclick = () => {
        const htmlItem = allData.find(i => i.type === 'html' && i.content);
        const rawHtml = htmlItem ? htmlItem.content : '<h1>Live Preview</h1>';
        const css = allData.filter(i => i.type === 'css').map(i => i.content).join('\n');
        const js = allData.filter(i => i.type === 'js').map(i => i.content).join('\n');

        let combinedDoc = '';
        const currentUrl = pageUrl.textContent || '';
        const baseTag = currentUrl && currentUrl.startsWith('http') ? `<base href="${escapeHTML(currentUrl)}">` : '';

        if (rawHtml.toLowerCase().includes('<html') || rawHtml.toLowerCase().includes('<!doctype')) {
            combinedDoc = rawHtml;
            if (baseTag && !combinedDoc.toLowerCase().includes('<base ')) {
                if (combinedDoc.includes('<head>')) {
                    combinedDoc = combinedDoc.replace('<head>', `<head>${baseTag}`);
                } else if (combinedDoc.includes('</head>')) {
                    combinedDoc = combinedDoc.replace('</head>', `${baseTag}</head>`);
                }
            }
            if (css) {
                if (combinedDoc.includes('</head>')) {
                    combinedDoc = combinedDoc.replace('</head>', `<style>${css}</style></head>`);
                } else {
                    combinedDoc = `<style>${css}</style>` + combinedDoc;
                }
            }
            if (js) {
                if (combinedDoc.includes('</body>')) {
                    combinedDoc = combinedDoc.replace('</body>', `<script>${js}<\/script></body>`);
                } else {
                    combinedDoc += `<script>${js}<\/script>`;
                }
            }
        } else {
            combinedDoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${css}</style></head><body>${rawHtml}<script>${js}<\/script></body></html>`;
        }

        const modalBody = livePreviewModal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = '';
            const newIframe = document.createElement('iframe');
            newIframe.id = 'live-sandbox-iframe';
            newIframe.setAttribute('sandbox', 'allow-scripts allow-modals');
            modalBody.appendChild(newIframe);
            newIframe.srcdoc = combinedDoc;
        }

        livePreviewModal.style.display = 'flex';
    };

    closeLivePreviewBtn.onclick = closeLivePreview;
    livePreviewModal.onclick = (e) => {
        if (e.target === livePreviewModal) closeLivePreview();
    };

    diffSnapshotBtn.onclick = async () => {
        const targetUrl = pageUrl.textContent || 'current-page';
        const cachedSnapshot = await SCVDB.getSnapshot(targetUrl);
        if (!cachedSnapshot) {
            await SCVDB.saveSnapshot(targetUrl, { data: allData });
            showToast("Snapshot saved! Re-extract this page and click Diff again.", "info");
            return;
        }

        const diffResults = SnapshotDiff.compareData(cachedSnapshot.data, allData);
        diffModalBody.innerHTML = '';
        diffResults.forEach(r => {
            const card = document.createElement('div');
            card.className = 'diff-result-card';
            card.innerHTML = `<h4>${escapeHTML(r.path)} <span class="diff-status-tag ${r.status}">${r.status.toUpperCase()}</span></h4>`;
            if (r.lineDiff) {
                card.innerHTML += SnapshotDiff.renderDiffHtml(r.lineDiff);
            }
            diffModalBody.appendChild(card);
        });
        diffModal.style.display = 'flex';
    };

    if (updateSnapshotBtn) {
        updateSnapshotBtn.onclick = async () => {
            const targetUrl = pageUrl.textContent || 'current-page';
            await SCVDB.saveSnapshot(targetUrl, { data: allData, updatedAt: new Date().toISOString() });
            showToast("Baseline snapshot updated to current page state!", "info");
            diffModal.style.display = 'none';
        };
    }

    closeDiffModalBtn.onclick = () => { diffModal.style.display = 'none'; };

    exportDropdownBtn.onclick = (e) => {
        e.stopPropagation();
        exportMenu.style.display = exportMenu.style.display === 'none' ? 'block' : 'none';
    };

    document.addEventListener('click', (e) => {
        if (exportMenu && !e.target.closest('.dropdown-wrapper')) {
            exportMenu.style.display = 'none';
        }
    });

    document.getElementById('export-vscode-btn').onclick = () => {
        if (!allData || allData.length === 0) return showToast("No files to export.", "warning");
        ExportIntegrations.exportToVSCode(allData, pageTitle.textContent, pageUrl.textContent);
    };

    document.getElementById('export-vscodedev-btn').onclick = () => {
        ExportIntegrations.exportToVSCodeDev(currentActiveItem, pageUrl.textContent);
    };

    document.getElementById('export-codepen-btn').onclick = () => {
        const html = allData.find(i => i.type === 'html')?.content || '';
        const css = allData.filter(i => i.type === 'css').map(i => i.content).join('\n');
        const js = allData.filter(i => i.type === 'js').map(i => i.content).join('\n');
        ExportIntegrations.exportToCodePen(html, css, js, pageTitle.textContent);
    };

    document.getElementById('export-jsfiddle-btn').onclick = () => {
        const html = allData.find(i => i.type === 'html')?.content || '';
        const css = allData.filter(i => i.type === 'css').map(i => i.content).join('\n');
        const js = allData.filter(i => i.type === 'js').map(i => i.content).join('\n');
        ExportIntegrations.exportToJSFiddle(html, css, js, pageTitle.textContent);
    };

    document.getElementById('export-stackblitz-btn').onclick = () => {
        const html = allData.find(i => i.type === 'html')?.content || '';
        const css = allData.filter(i => i.type === 'css').map(i => i.content).join('\n');
        const js = allData.filter(i => i.type === 'js').map(i => i.content).join('\n');
        ExportIntegrations.exportToStackBlitz(html, css, js, pageTitle.textContent);
    };

    document.getElementById('export-gist-btn').onclick = async () => {
        const settings = await chrome.storage.sync.get({ github_pat: '' });
        if (!settings.github_pat) {
            const pat = prompt("Enter your GitHub Personal Access Token (PAT):");
            if (pat) {
                await chrome.storage.sync.set({ github_pat: pat });
                settings.github_pat = pat;
            } else return;
        }

        try {
            const gistUrl = await ExportIntegrations.exportToGitHubGist(allData, `Source Code Viewer snapshot for ${pageTitle.textContent}`, false, settings.github_pat);
            showToast("Gist created! Opening...", "info");
            chrome.tabs.create({ url: gistUrl });
        } catch (err) {
            alert(err.message);
        }
    };

    diffModal.onclick = (e) => {
        if (e.target === diffModal) diffModal.style.display = 'none';
    };

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (livePreviewModal.style.display === 'flex') closeLivePreview();
            if (diffModal.style.display === 'flex') diffModal.style.display = 'none';
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            if (codeScrollContainer.style.display !== 'none') {
                e.preventDefault();
                EditorEngine.openSearchBar(codeScrollContainer);
            }
        }
    });

    downloadBtn.onclick = async () => {
        const originalHTML = downloadBtn.innerHTML;
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = `<span>Zipping...</span>`;

        try {
            const zip = new JSZip();
            allData.forEach(item => {
                if (item.filePath) {
                    const content = item.error || item.content || '';
                    zip.file(item.filePath, content, { base64: item.isBase64 });
                }
            });
            const blob = await zip.generateAsync({ type: "blob" });

            let hostname = '';
            try { hostname = new URL(pageUrl.textContent).hostname.replace(/^www\./i, ''); } catch (err) {}
            if (!hostname) hostname = 'page_sources';

            const blobUrl = URL.createObjectURL(blob);
            chrome.downloads.download({ url: blobUrl, filename: `${hostname}.zip` }, () => {
                setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
            });

            downloadBtn.innerHTML = `<span>Downloaded!</span>`;
        } catch (err) {
            downloadBtn.innerHTML = `<span>Error!</span>`;
        } finally {
            setTimeout(() => { downloadBtn.innerHTML = originalHTML; downloadBtn.disabled = false; }, 2000);
        }
    };

    function applyViewerTheme(themeConfig, themeName = '') {
        const styleEl = document.getElementById('theme-styles');
        const css = `:root { ${Object.entries(themeConfig).map(([key, val]) => `${key}: ${val};`).join(' ')} }`;
        if (styleEl) styleEl.textContent = css;
        document.body.classList.toggle('light-theme', themeName === 'Light');
    }

    function applyCustomCSS(css) {
        const styleEl = document.getElementById('custom-user-css');
        if (styleEl) styleEl.textContent = css || '';
    }

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

    async function loadThemeSettings() {
        viewerSettings = await chrome.storage.sync.get({
            theme: 'Dark',
            customTheme: {},
            linkColor: '',
            customCSS: '',
            showLineNumbers: true,
            customTooltips: true,
            autoBeautify: false,
            hideActions: false,
            enableTabSwitching: true,
            github_pat: ''
        });

        showLineNumbers = viewerSettings.showLineNumbers !== false;
        initFloatingTooltips(viewerSettings.customTooltips !== false);

        const baseTheme = viewerSettings.theme === 'Custom'
            ? { ...viewerSettings.customTheme }
            : { ...(THEMES[viewerSettings.theme] || THEMES['Dark']) };

        if (viewerSettings.linkColor) {
            baseTheme['--link-color'] = viewerSettings.linkColor;
        }

        applyViewerTheme(baseTheme, viewerSettings.theme);
        applyCustomCSS(viewerSettings.customCSS);
        applyCodeActionsVisibility(viewerSettings.hideActions);
    }

    chrome.storage.onChanged.addListener(async (changes, area) => {
        if (area !== 'sync') return;
        if (changes.showLineNumbers) {
            showLineNumbers = changes.showLineNumbers.newValue !== false;
            if (currentActiveItem) loadCode(currentActiveItem, currentFileSize.textContent);
        }
        if (changes.customTooltips) {
            initFloatingTooltips(changes.customTooltips.newValue !== false);
        }
        if (changes.enableTabSwitching) {
            if (changes.enableTabSwitching.newValue === false) {
                if (tabSelectorContainer) tabSelectorContainer.style.display = 'none';
            } else {
                await initTabSelector();
            }
        }
        if (changes.hideActions) {
            viewerSettings.hideActions = changes.hideActions.newValue;
            applyCodeActionsVisibility(viewerSettings.hideActions);
        }
        if (changes.autoBeautify) {
            viewerSettings.autoBeautify = changes.autoBeautify.newValue;
        }
        if (changes.theme || changes.customTheme || changes.linkColor || changes.customCSS) {
            loadThemeSettings();
        }
    });

    await loadThemeSettings();
    await loadSessionData();
});
