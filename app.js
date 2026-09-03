/**
 * Source Code Viewer — Official Website Engine
 * Manages interactive in-page playground, single-pass syntax highlighting,
 * code beautification, Ctrl+F in-file search, and theme switching.
 */

(function () {
  'use strict';

  // --- Sample Dataset for the Live Interactive Playground ---
  const DEMO_FILES = [
    {
      id: 'app-js',
      name: 'src/app.js',
      type: 'js',
      size: '2.4 KB',
      unformatted: `import{createClient}from"@supabase/supabase-js";const API_URL="https://api.example.app/v1";const STRIPE_SECRET_KEY="sk_live_99a8b7c6d5e4f32101234567";const GOOGLE_KEY="AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6";export async function initializeApplication(config){console.log("Initializing client runtime with config:",config);const client=createClient(API_URL,GOOGLE_KEY);const session=await client.auth.getSession();if(!session?.data?.session){console.warn("No active session found, redirecting to login");return false;}document.body.classList.add("app-loaded");return true;}`,
      formatted: `import { createClient } from "@supabase/supabase-js";

// Core application runtime configuration
const API_URL = "https://api.example.app/v1";

// Security Scanner test credentials (detected as secrets in client-side script)
const STRIPE_SECRET_KEY = "sk_live_99a8b7c6d5e4f32101234567";
const GOOGLE_KEY = "AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6";

export async function initializeApplication(config) {
    console.log("Initializing client runtime with config:", config);
    const client = createClient(API_URL, GOOGLE_KEY);
    const session = await client.auth.getSession();

    if (!session?.data?.session) {
        console.warn("No active session found, redirecting to login");
        return false;
    }

    document.body.classList.add("app-loaded");
    return true;
}`
    },
    {
      id: 'index-html',
      name: 'index.html',
      type: 'html',
      size: '1.2 KB',
      unformatted: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Demo App</title><link rel="stylesheet" href="css/styles.css"></head><body><div id="root"><header class="app-header"><h1>Source Code Viewer</h1></header><main><p>Interactive page extraction simulator.</p></main></div><script src="src/app.js" type="module"></script></body></html>`,
      formatted: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Demo App</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <div id="root">
        <header class="app-header">
            <h1>Source Code Viewer</h1>
        </header>
        <main>
            <p>Interactive page extraction simulator.</p>
        </main>
    </div>
    <script src="src/app.js" type="module"></script>
</body>
</html>`
    },
    {
      id: 'styles-css',
      name: 'css/styles.css',
      type: 'css',
      size: '1.6 KB',
      unformatted: `:root{--primary:#2563eb;--bg:#0f172a;}body{margin:0;font-family:sans-serif;background:var(--bg);color:#f8fafc;}.app-header{display:flex;align-items:center;padding:16px 24px;border-bottom:1px solid #334155;}`,
      formatted: `:root {
    --primary: #2563eb;
    --bg: #0f172a;
}

body {
    margin: 0;
    font-family: system-ui, -apple-system, sans-serif;
    background: var(--bg);
    color: #f8fafc;
}

.app-header {
    display: flex;
    align-items: center;
    padding: 16px 24px;
    border-bottom: 1px solid #334155;
}`
    },
    {
      id: 'state-json',
      name: 'storage/state.json',
      type: 'json',
      size: '890 B',
      unformatted: `{"sessionToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID","theme":"dark","lastVisited":"/dashboard","userPreference":{"autoBeautify":true,"lineNumbers":true}}`,
      formatted: `{
    "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID",
    "theme": "dark",
    "lastVisited": "/dashboard",
    "userPreference": {
        "autoBeautify": true,
        "lineNumbers": true
    }
}`
    },
    {
      id: 'unbundled-map',
      name: 'sourcemaps/Component.tsx',
      type: 'map',
      size: '3.1 KB',
      unformatted: `import React from 'react';export const Button=({label,onClick})=>{return(<button onClick={onClick} className="btn-primary">{label}</button>);};`,
      formatted: `import React from 'react';

interface ButtonProps {
    label: string;
    onClick: () => void;
}

// Reconstructed from production .map file
export const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
    return (
        <button onClick={onClick} className="btn-primary">
            {label}
        </button>
    );
};`
    }
  ];

  // Mock Detected Secrets
  const DEMO_SECRETS = [
    {
      rule: 'Stripe Live Secret Key',
      severity: 'CRITICAL',
      file: 'src/app.js',
      line: 7,
      snippet: 'const STRIPE_SECRET_KEY = "sk_live_99a8b7c6..."'
    },
    {
      rule: 'Google Cloud API Key',
      severity: 'HIGH',
      file: 'src/app.js',
      line: 8,
      snippet: 'const GOOGLE_KEY = "AIzaSyA1B2C3D4E5F6..."'
    }
  ];

  // State
  let activeFile = DEMO_FILES[0];
  let isFormatted = true;
  let searchMatches = [];
  let currentMatchIdx = -1;

  // DOM Elements
  const dom = {
    fileList: document.getElementById('demo-file-list'),
    secretsList: document.getElementById('demo-secrets-list'),
    grepResults: document.getElementById('demo-grep-results'),
    grepInput: document.getElementById('demo-grep-input'),
    codeContainer: document.getElementById('demo-code-container'),
    gutter: document.getElementById('demo-gutter'),
    activeFileName: document.getElementById('demo-active-file-name'),
    activeFileSize: document.getElementById('demo-active-file-size'),
    activeFileLines: document.getElementById('demo-active-file-lines'),
    beautifyBtn: document.getElementById('demo-beautify-btn'),
    copyBtn: document.getElementById('demo-copy-btn'),
    copyText: document.getElementById('demo-copy-text'),
    downloadZip: document.getElementById('demo-download-zip'),
    searchInput: document.getElementById('demo-search-input'),
    searchCount: document.getElementById('demo-search-count'),
    searchNext: document.getElementById('demo-search-next'),
    searchPrev: document.getElementById('demo-search-prev'),
    codeViewport: document.getElementById('demo-code-viewport'),
    toast: document.getElementById('site-toast'),
    themeToggle: document.getElementById('theme-toggle'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    primaryNav: document.getElementById('primary-nav'),
    privacyModal: document.getElementById('privacy-dialog'),
    openPrivacyBtn: document.getElementById('open-privacy-modal'),
    closePrivacyBtn: document.getElementById('close-privacy-modal'),
    dismissPrivacyBtn: document.getElementById('dismiss-privacy-modal'),
    currentYear: document.getElementById('current-year')
  };

  // --- Minimalist HTML Entity Escaping ---
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- Syntax Lexer (Matches Source Code Viewer Token Types) ---
  function highlightCode(code, lang) {
    if (!code) return '';
    const safeCode = escapeHtml(code);

    if (lang === 'js' || lang === 'map' || lang === 'json') {
      return safeCode
        .replace(/(\/\/[^\n]*)/g, '<span class="tok-comment">$1</span>')
        .replace(/(".*?"|'.*?'|`.*?`)/g, '<span class="tok-string">$1</span>')
        .replace(/\b(import|export|from|const|let|var|function|async|await|return|if|else|interface|type)\b/g, '<span class="tok-keyword">$1</span>')
        .replace(/\b(true|false|null|undefined|\d+)\b/g, '<span class="tok-number">$1</span>')
        .replace(/\b([a-zA-Z_$][\w$]*)(?=\()/g, '<span class="tok-func">$1</span>');
    }

    if (lang === 'html') {
      return safeCode
        .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-comment">$1</span>')
        .replace(/(&lt;\/?[\w-]+)/g, '<span class="tok-tag">$1</span>')
        .replace(/([\w-]+)(?=\=)/g, '<span class="tok-attr">$1</span>')
        .replace(/(".*?"|'.*?')/g, '<span class="tok-string">$1</span>');
    }

    if (lang === 'css') {
      return safeCode
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-comment">$1</span>')
        .replace(/([a-zA-Z-]+)(?=\s*:)/g, '<span class="tok-attr">$1</span>')
        .replace(/(:root|\.[a-zA-Z0-9_-]+)/g, '<span class="tok-tag">$1</span>')
        .replace(/(#[0-9a-fA-F]{3,8}|\b\d+px|\b\d+rem)/g, '<span class="tok-number">$1</span>');
    }

    return safeCode;
  }

  // --- Toast Notification Helper ---
  let toastTimer = null;
  function showToast(message) {
    if (!dom.toast) return;
    dom.toast.textContent = message;
    dom.toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      dom.toast.classList.remove('visible');
    }, 2800);
  }

  // --- Render Editor ---
  function renderEditor() {
    const rawCode = isFormatted ? activeFile.formatted : activeFile.unformatted;
    dom.activeFileName.textContent = activeFile.name;
    dom.activeFileSize.textContent = activeFile.size;

    const lines = rawCode.split('\n');
    dom.activeFileLines.textContent = `${lines.length} lines`;

    // Render Gutter Numbers
    let gutterHtml = '';
    for (let i = 1; i <= lines.length; i++) {
      gutterHtml += `<div class="gutter-line">${i}</div>`;
    }
    dom.gutter.innerHTML = gutterHtml;

    // Syntax Highlight
    dom.codeContainer.innerHTML = highlightCode(rawCode, activeFile.type);
    applySearchHighlight();
  }

  // --- In-File Search Engine ---
  function applySearchHighlight() {
    const query = dom.searchInput ? dom.searchInput.value.trim().toLowerCase() : '';
    if (!query) {
      if (dom.searchCount) dom.searchCount.textContent = '0/0';
      searchMatches = [];
      currentMatchIdx = -1;
      return;
    }

    const rawCode = isFormatted ? activeFile.formatted : activeFile.unformatted;
    const lower = rawCode.toLowerCase();
    searchMatches = [];
    let pos = lower.indexOf(query);

    while (pos !== -1) {
      searchMatches.push(pos);
      pos = lower.indexOf(query, pos + query.length);
    }

    if (searchMatches.length > 0) {
      if (currentMatchIdx === -1) currentMatchIdx = 0;
      dom.searchCount.textContent = `${currentMatchIdx + 1}/${searchMatches.length}`;
    } else {
      currentMatchIdx = -1;
      dom.searchCount.textContent = '0/0';
    }
  }

  // --- Render File Explorer List ---
  function renderFileList() {
    dom.fileList.innerHTML = '';
    DEMO_FILES.forEach(file => {
      const item = document.createElement('div');
      item.className = `file-tree-item ${file.id === activeFile.id ? 'active' : ''}`;
      item.innerHTML = `
        <div class="file-tree-left">
          <span class="file-type-pill type-${file.type}">${file.type}</span>
          <span class="file-tree-name">${file.name}</span>
        </div>
        <span class="file-size-sub">${file.size}</span>
      `;
      item.addEventListener('click', () => {
        activeFile = file;
        renderFileList();
        renderEditor();
      });
      dom.fileList.appendChild(item);
    });
  }

  // --- Render Secrets Audit List ---
  function renderSecretsList() {
    dom.secretsList.innerHTML = '';
    DEMO_SECRETS.forEach(sec => {
      const card = document.createElement('div');
      card.className = 'secret-audit-card';
      card.innerHTML = `
        <div class="secret-card-top">
          <span class="secret-name">${sec.rule}</span>
          <span class="severity-pill sev-${sec.severity.toLowerCase()}">${sec.severity}</span>
        </div>
        <div class="secret-loc">${sec.file} : line ${sec.line}</div>
        <div class="secret-snip">${escapeHtml(sec.snippet)}</div>
      `;
      card.addEventListener('click', () => {
        const target = DEMO_FILES.find(f => f.name === sec.file);
        if (target) {
          activeFile = target;
          renderFileList();
          renderEditor();
          showToast(`Jumped to ${sec.file}`);
        }
      });
      dom.secretsList.appendChild(card);
    });
  }

  // --- Grep Engine across in-memory files ---
  function handleGrepSearch(query) {
    if (!query) {
      dom.grepResults.innerHTML = '<p class="empty-text">Type search query to search across in-memory files.</p>';
      return;
    }

    const q = query.toLowerCase();
    let hits = [];

    DEMO_FILES.forEach(file => {
      const lines = file.formatted.split('\n');
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(q)) {
          hits.push({ file, lineNum: index + 1, text: line.trim() });
        }
      });
    });

    if (hits.length === 0) {
      dom.grepResults.innerHTML = '<p class="empty-text">No matches found.</p>';
      return;
    }

    dom.grepResults.innerHTML = hits.map(hit => `
      <div class="secret-audit-card" data-file-id="${hit.file.id}">
        <div class="secret-loc">${hit.file.name} : Line ${hit.lineNum}</div>
        <div class="secret-snip">${escapeHtml(hit.text)}</div>
      </div>
    `).join('');

    dom.grepResults.querySelectorAll('.secret-audit-card').forEach(el => {
      el.addEventListener('click', () => {
        const file = DEMO_FILES.find(f => f.id === el.dataset.fileId);
        if (file) {
          activeFile = file;
          renderFileList();
          renderEditor();
        }
      });
    });
  }

  // --- Wire Sidebar Tabs ---
  function setupTabs() {
    const tabs = [
      { btn: document.getElementById('tab-btn-files'), panel: document.getElementById('demo-panel-files') },
      { btn: document.getElementById('tab-btn-secrets'), panel: document.getElementById('demo-panel-secrets') },
      { btn: document.getElementById('tab-btn-grep'), panel: document.getElementById('demo-panel-grep') }
    ];

    tabs.forEach(({ btn, panel }) => {
      if (!btn || !panel) return;
      btn.addEventListener('click', () => {
        tabs.forEach(t => {
          t.btn.classList.remove('active');
          t.btn.setAttribute('aria-selected', 'false');
          t.panel.classList.remove('active');
          t.panel.hidden = true;
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        panel.classList.add('active');
        panel.hidden = false;
      });
    });
  }

  // --- Event Listeners ---
  function initListeners() {
    // Beautify Toggle
    if (dom.beautifyBtn) {
      dom.beautifyBtn.addEventListener('click', () => {
        isFormatted = !isFormatted;
        renderEditor();
        showToast(isFormatted ? "Code beautified & formatted" : "Displaying raw minified source");
      });
    }

    // Copy Button
    if (dom.copyBtn) {
      dom.copyBtn.addEventListener('click', async () => {
        const text = isFormatted ? activeFile.formatted : activeFile.unformatted;
        try {
          await navigator.clipboard.writeText(text);
          dom.copyText.textContent = "Copied!";
          showToast(`Copied ${activeFile.name} to clipboard`);
          setTimeout(() => { dom.copyText.textContent = "Copy"; }, 2000);
        } catch (err) {
          showToast("Clipboard access restricted");
        }
      });
    }

    // Download ZIP Simulation
    if (dom.downloadZip) {
      dom.downloadZip.addEventListener('click', () => {
        showToast("Generating clean ZIP archive with reconstructed directories...");
        setTimeout(() => {
          showToast("Downloaded sample-workspace.zip!");
        }, 900);
      });
    }

    // In-File Search
    if (dom.searchInput) {
      dom.searchInput.addEventListener('input', applySearchHighlight);
      dom.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (searchMatches.length === 0) return;
          currentMatchIdx = (currentMatchIdx + (e.shiftKey ? -1 : 1) + searchMatches.length) % searchMatches.length;
          dom.searchCount.textContent = `${currentMatchIdx + 1}/${searchMatches.length}`;
        }
      });
    }

    if (dom.searchNext) {
      dom.searchNext.addEventListener('click', () => {
        if (searchMatches.length === 0) return;
        currentMatchIdx = (currentMatchIdx + 1) % searchMatches.length;
        dom.searchCount.textContent = `${currentMatchIdx + 1}/${searchMatches.length}`;
      });
    }

    if (dom.searchPrev) {
      dom.searchPrev.addEventListener('click', () => {
        if (searchMatches.length === 0) return;
        currentMatchIdx = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length;
        dom.searchCount.textContent = `${currentMatchIdx + 1}/${searchMatches.length}`;
      });
    }

    // Grep Input
    if (dom.grepInput) {
      dom.grepInput.addEventListener('input', (e) => {
        handleGrepSearch(e.target.value.trim());
      });
    }

    // Theme Toggle
    if (dom.themeToggle) {
      const savedTheme = localStorage.getItem('scv_landing_theme') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);

      dom.themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('scv_landing_theme', next);
      });
    }

    // Mobile Navigation Drawer
    if (dom.mobileMenuBtn && dom.primaryNav) {
      dom.mobileMenuBtn.addEventListener('click', () => {
        const expanded = dom.mobileMenuBtn.getAttribute('aria-expanded') === 'true';
        dom.mobileMenuBtn.setAttribute('aria-expanded', !expanded);
        dom.primaryNav.classList.toggle('open');
      });

      dom.primaryNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          dom.primaryNav.classList.remove('open');
          dom.mobileMenuBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // Accessible Privacy Dialog
    if (dom.openPrivacyBtn && dom.privacyModal) {
      dom.openPrivacyBtn.addEventListener('click', () => {
        dom.privacyModal.showModal();
      });
    }

    if (dom.closePrivacyBtn && dom.privacyModal) {
      dom.closePrivacyBtn.addEventListener('click', () => {
        dom.privacyModal.close();
      });
    }

    if (dom.dismissPrivacyBtn && dom.privacyModal) {
      dom.dismissPrivacyBtn.addEventListener('click', () => {
        dom.privacyModal.close();
      });
    }

    // Synchronize gutter scrolling with code area
    if (dom.codeViewport) {
      const pre = dom.codeViewport.querySelector('.editor-pre');
      if (pre && dom.gutter) {
        pre.addEventListener('scroll', () => {
          dom.gutter.scrollTop = pre.scrollTop;
        });
      }
    }

    // Dynamic Year
    if (dom.currentYear) {
      dom.currentYear.textContent = new Date().getFullYear();
    }
  }

  // --- Initialization ---
  function init() {
    setupTabs();
    renderFileList();
    renderSecretsList();
    renderEditor();
    initListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
