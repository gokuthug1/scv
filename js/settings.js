document.addEventListener('DOMContentLoaded', () => {
  const themeSelect = document.getElementById('theme-select');
  const customSettings = document.getElementById('custom-theme-settings');
  const themePresetSelect = document.getElementById('theme-preset-select');
  const savePresetBtn = document.getElementById('save-preset-btn');
  const deletePresetBtn = document.getElementById('delete-preset-btn');
  const exportThemeBtn = document.getElementById('export-theme-btn');
  const importThemeFileInput = document.getElementById('import-theme-file');
  const customColorPickersContainer = document.getElementById('custom-color-pickers-container');
  
  // Custom CSS Editor Elements
  const customCssInput = document.getElementById('custom-css-input');
  const cssGutter = document.getElementById('css-editor-gutter');
  const cssSnippetSelect = document.getElementById('css-snippet-select');
  const insertSnippetBtn = document.getElementById('insert-snippet-btn');
  const formatCssBtn = document.getElementById('format-css-btn');
  const clearCssBtn = document.getElementById('clear-css-btn');
  const cssStatus = document.getElementById('css-status');
  const cssCharCount = document.getElementById('css-char-count');
  const customUserCssStyle = document.getElementById('custom-user-css');

  const saveBtn = document.getElementById('save-btn');
  const statusMessage = document.getElementById('status-message');
  const themeStyles = document.getElementById('theme-styles');
  const windowModeToggle = document.getElementById('window-mode-toggle');
  const autoBeautifyToggle = document.getElementById('auto-beautify-toggle');
  const hideActionsToggle = document.getElementById('hide-actions-toggle'); 
  const hideDonationToggle = document.getElementById('hide-donation-toggle'); 
  const deepCrawlToggle = document.getElementById('deep-crawl-toggle'); 
  const contextMenuToggle = document.getElementById('context-menu-toggle');
  const customTooltipsToggle = document.getElementById('custom-tooltips-toggle');
  const lineNumbersToggle = document.getElementById('line-numbers-toggle');
  const tabSwitchingToggle = document.getElementById('tab-switching-toggle');
  const beautifyWarning = document.getElementById('beautify-warning'); 
  const deepCrawlWarning = document.getElementById('deep-crawl-warning'); 
  const donationSection = document.getElementById('donation-section'); 

  const defaultTheme = THEMES['Dark'];
  let savedCustomThemes = {};

  const CSS_SNIPPETS = {
    'neon-glow': `/* Neon Glow & Accents */
.token.url {
  color: #00f0ff !important;
  text-shadow: 0 0 8px rgba(0, 240, 255, 0.7);
}
.token.keyword {
  color: #ff007f !important;
  text-shadow: 0 0 6px rgba(255, 0, 127, 0.5);
}
.primary-btn {
  box-shadow: 0 0 15px rgba(255, 0, 127, 0.4);
}`,
    'glassmorphism': `/* Glassmorphism Panel Aesthetics */
header, .sidebar, .editor-toolbar {
  backdrop-filter: blur(16px);
  background-color: rgba(20, 24, 38, 0.75) !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
}
.file-item:hover, .tree-file-item:hover {
  backdrop-filter: blur(8px);
}`,
    'custom-font': `/* Local Developer Font Stack & Contextual Ligatures */
pre, code, .scv-line-number, .css-editor-textarea {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', 'Consolas', monospace !important;
  font-variant-ligatures: contextual;
  font-feature-settings: "calt" 1, "liga" 1;
}`,
    'minimal-clean': `/* Minimalist Clean Code View */
.scv-editor-gutter {
  background: transparent !important;
  border-right: none !important;
}
.scv-line-number {
  opacity: 0.3 !important;
}
pre {
  padding: 20px 32px !important;
}`,
    'retro-amber': `/* Retro Amber Terminal Vibe */
pre, code, .scv-editor-code-area {
  background-color: #120c02 !important;
  color: #ffb000 !important;
}
.token.comment { color: #805800 !important; }
.token.string { color: #ffd060 !important; }
.token.url { color: #ff9000 !important; text-shadow: 0 0 6px #ff9000; }`,
    'cyberpunk-borders': `/* Cyberpunk Glowing Outlines */
.main-container, .modal-card, .file-item.active, .tree-file-item.active {
  border: 1px solid #ff007f !important;
  box-shadow: 0 0 10px rgba(255, 0, 127, 0.3) !important;
}`,
    'custom-scrollbar': `/* Sleek Custom Scrollbars */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--secondary-bg); }
::-webkit-scrollbar-thumb {
  background: var(--accent-color);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--accent-hover-color);
}`
  };

  function escapeHTML(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function hexToRgba(hex, alpha = 0.5) {
    if (!hex || !hex.startsWith('#')) return ''; 
    let cleanHex = hex.slice(1);
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(char => char + char).join('');
    }
    if (cleanHex.length !== 6) return '';
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function applyTheme(theme, themeName = '') {
    const themeWithShadow = { ...theme };
    if (themeWithShadow['--link-color']) {
      themeWithShadow['--link-shadow-color'] = hexToRgba(themeWithShadow['--link-color']);
    }
    const css = `:root { ${Object.entries(themeWithShadow).map(([key, val]) => `${key}: ${val};`).join(' ')} }`;
    themeStyles.textContent = css;
    document.body.classList.toggle('light-theme', themeName === 'Light');
  }

  function applyCustomCSS(css) {
    if (customUserCssStyle) {
      customUserCssStyle.textContent = css || '';
    }
  }

  function updateCssEditorGutter() {
    if (!customCssInput || !cssGutter) return;
    const lines = customCssInput.value.split('\n').length || 1;
    let gutterText = '';
    for (let i = 1; i <= lines; i++) {
      gutterText += i + '\n';
    }
    cssGutter.textContent = gutterText;
    if (cssCharCount) {
      cssCharCount.textContent = `${customCssInput.value.length} chars (${lines} lines)`;
    }
  }

  function populatePresetDropdown(activeName = '') {
    if (!themePresetSelect) return;
    themePresetSelect.innerHTML = '';

    // Built-in presets group
    const builtInGroup = document.createElement('optgroup');
    builtInGroup.label = 'Built-in Presets';
    Object.keys(THEMES).forEach(name => {
      const opt = document.createElement('option');
      opt.value = `builtin:${name}`;
      opt.textContent = name;
      builtInGroup.appendChild(opt);
    });
    themePresetSelect.appendChild(builtInGroup);

    // User saved presets group
    const customNames = Object.keys(savedCustomThemes);
    if (customNames.length > 0) {
      const customGroup = document.createElement('optgroup');
      customGroup.label = 'My Saved Themes';
      customNames.forEach(name => {
        const opt = document.createElement('option');
        opt.value = `custom:${name}`;
        opt.textContent = name;
        customGroup.appendChild(opt);
      });
      themePresetSelect.appendChild(customGroup);
    }

    if (activeName) {
      themePresetSelect.value = activeName;
    }
    updatePresetControlsState();
  }

  function updatePresetControlsState() {
    if (!deletePresetBtn || !themePresetSelect) return;
    const val = themePresetSelect.value;
    if (val.startsWith('custom:')) {
      deletePresetBtn.style.display = 'inline-flex';
    } else {
      deletePresetBtn.style.display = 'none';
    }
  }

  function generateCustomFields(colors) {
    if (!customColorPickersContainer) return;
    customColorPickersContainer.innerHTML = '';
    
    for (const [key, value] of Object.entries(defaultTheme)) {
      if (key.includes('--font')) continue;

      const color = colors[key] || value;
      const safeColor = escapeHTML(color);
      const name = key.replace('--', '').replace(/-/g, ' ');
      const field = `
        <div class="color-picker-row">
          <label for="${key}">${name}</label>
          <input type="color" id="${key}" value="${safeColor}">
        </div>`;
      customColorPickersContainer.insertAdjacentHTML('beforeend', field);
    }
    
    customColorPickersContainer.querySelectorAll('input[type="color"]').forEach(picker => {
      picker.addEventListener('input', () => {
        previewTheme();
      });
    });
  }

  function getCustomColorsFromInputs() {
    const customTheme = {};
    for (const key of Object.keys(defaultTheme)) {
      if (key.includes('--font')) {
        customTheme[key] = defaultTheme[key]; 
      } else {
        const el = document.getElementById(key);
        customTheme[key] = el ? el.value : defaultTheme[key];
      }
    }
    return customTheme;
  }

  function setCustomColorsToInputs(colors) {
    for (const [key, value] of Object.entries(colors)) {
      const el = document.getElementById(key);
      if (el) el.value = value;
    }
  }

  function saveSettings() {
    const selectedTheme = themeSelect.value;
    const isWindowMode = windowModeToggle.checked;
    const isAutoBeautify = autoBeautifyToggle.checked;
    const isHideActions = hideActionsToggle.checked; 
    const isHideDonation = hideDonationToggle.checked; 
    const isDeepCrawl = deepCrawlToggle.checked;
    const isContextMenu = contextMenuToggle.checked;
    const isCustomTooltips = customTooltipsToggle.checked;
    const isShowLineNumbers = lineNumbersToggle ? lineNumbersToggle.checked : true;
    const tabSwitchingToggleVal = tabSwitchingToggle.checked;
    const githubPat = document.getElementById('github-pat-input').value.trim();
    const customCSSVal = customCssInput ? customCssInput.value : '';
    const customTheme = getCustomColorsFromInputs();
    const customLinkColor = customTheme['--link-color'] || '';

    chrome.storage.sync.set({
      theme: selectedTheme,
      customTheme: customTheme,
      savedCustomThemes: savedCustomThemes,
      linkColor: customLinkColor,
      customCSS: customCSSVal,
      windowMode: isWindowMode,
      autoBeautify: isAutoBeautify,
      hideActions: isHideActions,
      hideDonation: isHideDonation,
      deepCrawl: isDeepCrawl,
      enableContextMenu: isContextMenu,
      customTooltips: isCustomTooltips,
      showLineNumbers: isShowLineNumbers,
      enableTabSwitching: tabSwitchingToggleVal,
      github_pat: githubPat
    }, () => {
      chrome.action.setPopup({ popup: isWindowMode ? "" : "popup.html" });

      statusMessage.textContent = 'Settings saved!';
      setTimeout(() => { statusMessage.textContent = ''; }, 2500);
    });
  }

  function loadSettings() {
    chrome.storage.sync.get({
      theme: 'Dark',
      customTheme: {},
      savedCustomThemes: {},
      linkColor: '',
      customCSS: '',
      windowMode: false,
      autoBeautify: false,
      hideActions: false, 
      hideDonation: false,
      deepCrawl: false,
      enableContextMenu: true,
      customTooltips: true,
      showLineNumbers: true,
      enableTabSwitching: true,
      github_pat: ''
    }, (items) => {
      themeSelect.value = items.theme;
      savedCustomThemes = items.savedCustomThemes || {};
      windowModeToggle.checked = items.windowMode;
      autoBeautifyToggle.checked = items.autoBeautify;
      hideActionsToggle.checked = items.hideActions; 
      hideDonationToggle.checked = items.hideDonation; 
      deepCrawlToggle.checked = items.deepCrawl;
      contextMenuToggle.checked = items.enableContextMenu;
      customTooltipsToggle.checked = items.customTooltips;
      if (lineNumbersToggle) {
        lineNumbersToggle.checked = items.showLineNumbers !== false;
      }
      if (cssGutter) {
        cssGutter.style.display = items.showLineNumbers !== false ? 'block' : 'none';
      }
      tabSwitchingToggle.checked = items.enableTabSwitching;
      document.getElementById('github-pat-input').value = items.github_pat || '';
      
      donationSection.style.display = items.hideDonation ? 'none' : 'block';

      if (items.autoBeautify) {
        beautifyWarning.classList.add('visible');
      } else {
        beautifyWarning.classList.remove('visible');
      }

      if (items.deepCrawl) {
        deepCrawlWarning.classList.add('visible');
      } else {
        deepCrawlWarning.classList.remove('visible');
      }
      
      chrome.action.setPopup({ popup: items.windowMode ? "" : "popup.html" });

      const themeLinkColor = items.theme === 'Custom'
        ? (items.customTheme?.['--link-color'] || defaultTheme['--link-color'])
        : (THEMES[items.theme]?.['--link-color'] || defaultTheme['--link-color']);
      const mergedCustom = { ...defaultTheme, ...items.customTheme };
      if (items.linkColor) {
        mergedCustom['--link-color'] = items.linkColor;
      }

      generateCustomFields(mergedCustom);
      populatePresetDropdown();

      if (customCssInput) {
        customCssInput.value = items.customCSS || '';
        updateCssEditorGutter();
        applyCustomCSS(items.customCSS);
      }

      previewTheme();
    });
  }

  function previewTheme() {
    const selected = themeSelect.value;

    if (selected === 'Custom') {
      const customTheme = getCustomColorsFromInputs();
      applyTheme(customTheme, selected);
    } else {
      const baseTheme = { ...(THEMES[selected] || defaultTheme) };
      applyTheme(baseTheme, selected);
    }
    
    if (customCssInput) {
      applyCustomCSS(customCssInput.value);
    }
    
    toggleCustomSettings();
  }

  function toggleCustomSettings() {
    const isCustom = themeSelect.value === 'Custom';
    customSettings.style.display = isCustom ? 'block' : 'none';
  }

  // --- Preset Selection Listener ---
  if (themePresetSelect) {
    themePresetSelect.addEventListener('change', () => {
      const val = themePresetSelect.value;
      if (val.startsWith('builtin:')) {
        const themeName = val.replace('builtin:', '');
        const presetColors = THEMES[themeName];
        if (presetColors) {
          setCustomColorsToInputs(presetColors);
          previewTheme();
        }
      } else if (val.startsWith('custom:')) {
        const themeName = val.replace('custom:', '');
        const customPreset = savedCustomThemes[themeName];
        if (customPreset) {
          const colors = customPreset.colors || customPreset;
          setCustomColorsToInputs(colors);
          if (customPreset.customCSS && customCssInput) {
            customCssInput.value = customPreset.customCSS;
            updateCssEditorGutter();
          }
          previewTheme();
        }
      }
      updatePresetControlsState();
    });
  }

  // --- Save As Custom Theme Preset ---
  if (savePresetBtn) {
    savePresetBtn.addEventListener('click', () => {
      const currentColors = getCustomColorsFromInputs();
      const defaultName = `Theme ${Object.keys(savedCustomThemes).length + 1}`;
      const name = prompt("Enter a name for this custom theme preset:", defaultName);
      if (!name || !name.trim()) return;

      const trimmedName = name.trim();
      savedCustomThemes[trimmedName] = {
        colors: currentColors,
        customCSS: customCssInput ? customCssInput.value : '',
        savedAt: new Date().toISOString()
      };

      chrome.storage.sync.set({ savedCustomThemes }, () => {
        populatePresetDropdown(`custom:${trimmedName}`);
        statusMessage.textContent = `Theme '${trimmedName}' saved!`;
        setTimeout(() => { statusMessage.textContent = ''; }, 2500);
      });
    });
  }

  // --- Delete Custom Theme Preset ---
  if (deletePresetBtn) {
    deletePresetBtn.addEventListener('click', () => {
      const val = themePresetSelect.value;
      if (!val.startsWith('custom:')) return;
      const themeName = val.replace('custom:', '');
      
      if (confirm(`Delete custom theme preset '${themeName}'?`)) {
        delete savedCustomThemes[themeName];
        chrome.storage.sync.set({ savedCustomThemes }, () => {
          populatePresetDropdown();
          statusMessage.textContent = `Theme '${themeName}' deleted.`;
          setTimeout(() => { statusMessage.textContent = ''; }, 2500);
        });
      }
    });
  }

  // --- Export Theme to JSON File ---
  if (exportThemeBtn) {
    exportThemeBtn.addEventListener('click', () => {
      const currentColors = getCustomColorsFromInputs();
      let themeName = 'custom-theme';
      if (themePresetSelect && themePresetSelect.value) {
        themeName = themePresetSelect.value.split(':')[1] || 'custom-theme';
      }
      
      const themeData = {
        name: themeName,
        version: "1.0",
        exportedAt: new Date().toISOString(),
        colors: currentColors,
        customCSS: customCssInput ? customCssInput.value : ''
      };

      const jsonStr = JSON.stringify(themeData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const filename = `scv-theme-${themeName.toLowerCase().replace(/[^a-z0-9]/gi, '-')}.json`;

      chrome.downloads.download({ url, filename, saveAs: true }, () => {
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        statusMessage.textContent = 'Theme exported!';
        setTimeout(() => { statusMessage.textContent = ''; }, 2500);
      });
    });
  }

  // --- Import Theme from JSON File ---
  if (importThemeFileInput) {
    importThemeFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          let importedColors = null;
          let importedCSS = '';
          let themeName = parsed.name || file.name.replace(/\.json$/i, '');

          if (parsed.colors && typeof parsed.colors === 'object') {
            importedColors = parsed.colors;
            importedCSS = parsed.customCSS || '';
          } else if (parsed['--main-bg']) {
            importedColors = parsed;
          }

          if (!importedColors) {
            throw new Error("Invalid theme file format. Missing CSS color tokens.");
          }

          // Apply to inputs
          setCustomColorsToInputs(importedColors);
          if (importedCSS && customCssInput) {
            customCssInput.value = importedCSS;
            updateCssEditorGutter();
          }

          // Save to local custom themes
          savedCustomThemes[themeName] = {
            colors: importedColors,
            customCSS: importedCSS,
            importedAt: new Date().toISOString()
          };

          chrome.storage.sync.set({ savedCustomThemes }, () => {
            populatePresetDropdown(`custom:${themeName}`);
            previewTheme();
            statusMessage.textContent = `Theme '${themeName}' imported!`;
            setTimeout(() => { statusMessage.textContent = ''; }, 2500);
          });
        } catch (err) {
          alert(`Failed to import theme: ${err.message}`);
        } finally {
          importThemeFileInput.value = '';
        }
      };
      reader.readAsText(file);
    });
  }

  // --- Custom CSS Editor Handlers ---
  if (customCssInput) {
    customCssInput.addEventListener('input', () => {
      updateCssEditorGutter();
      applyCustomCSS(customCssInput.value);
    });

    customCssInput.addEventListener('scroll', () => {
      if (cssGutter) cssGutter.scrollTop = customCssInput.scrollTop;
    });

    // Tab key support (inserts 2 spaces)
    customCssInput.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = customCssInput.selectionStart;
        const end = customCssInput.selectionEnd;
        customCssInput.value = customCssInput.value.substring(0, start) + '  ' + customCssInput.value.substring(end);
        customCssInput.selectionStart = customCssInput.selectionEnd = start + 2;
        updateCssEditorGutter();
        applyCustomCSS(customCssInput.value);
      }
    });
  }

  // Insert CSS Snippet
  if (insertSnippetBtn && cssSnippetSelect && customCssInput) {
    insertSnippetBtn.addEventListener('click', () => {
      const snippetKey = cssSnippetSelect.value;
      if (!snippetKey || !CSS_SNIPPETS[snippetKey]) return;

      const snippet = CSS_SNIPPETS[snippetKey];
      if (customCssInput.value.trim().length > 0) {
        customCssInput.value += '\n\n' + snippet;
      } else {
        customCssInput.value = snippet;
      }
      updateCssEditorGutter();
      applyCustomCSS(customCssInput.value);
      cssSnippetSelect.value = '';
    });
  }

  // Format CSS (Beautify)
  if (formatCssBtn && customCssInput) {
    formatCssBtn.addEventListener('click', () => {
      if (!customCssInput.value.trim()) return;
      if (typeof Beautifier !== 'undefined') {
        customCssInput.value = Beautifier.format(customCssInput.value, 'css');
        updateCssEditorGutter();
        applyCustomCSS(customCssInput.value);
      }
    });
  }

  // Clear CSS
  if (clearCssBtn && customCssInput) {
    clearCssBtn.addEventListener('click', () => {
      if (!customCssInput.value.trim()) return;
      if (confirm("Are you sure you want to clear all custom CSS?")) {
        customCssInput.value = '';
        updateCssEditorGutter();
        applyCustomCSS('');
      }
    });
  }

  themeSelect.addEventListener('change', () => {
    previewTheme();
  });

  saveBtn.addEventListener('click', saveSettings);

  autoBeautifyToggle.addEventListener('change', () => {
    if (autoBeautifyToggle.checked) {
      beautifyWarning.classList.add('visible');
    } else {
      beautifyWarning.classList.remove('visible');
    }
  });

  hideDonationToggle.addEventListener('change', () => {
      donationSection.style.display = hideDonationToggle.checked ? 'none' : 'block';
  });

  deepCrawlToggle.addEventListener('change', () => {
    if (deepCrawlToggle.checked) {
      deepCrawlWarning.classList.add('visible');
    } else {
      deepCrawlWarning.classList.remove('visible');
    }
  });

  if (lineNumbersToggle) {
    lineNumbersToggle.addEventListener('change', () => {
      if (cssGutter) {
        cssGutter.style.display = lineNumbersToggle.checked ? 'block' : 'none';
      }
    });
  }

  loadSettings();
});