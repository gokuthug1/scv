# 🚀 Source Code Viewer (v10.8)

[![Version](https://img.shields.io/badge/version-10.8-blue.svg)](manifest.json)
[![Manifest V3](https://img.shields.io/badge/manifest-v3-green.svg)](manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Zero Telemetry](https://img.shields.io/badge/privacy-100%25%20local-brightgreen.svg)](privacy.html)

**Source Code Viewer** is a private, client-side browser developer workspace for reverse-engineering, inspecting, formatting, auditing, and extracting webpage source files without leaving Chrome.

🌐 **Official Website & Live Demo**: [https://gokuthug1.github.io/scv/](https://gokuthug1.github.io/scv/)  
📦 **Chrome Web Store**: [Source Code Viewer on Chrome Web Store](https://chromewebstore.google.com/detail/jfcfmlcbjaloijgkjhfkfioonngengnm)  
🔒 **Privacy Policy**: [https://gokuthug1.github.io/scv/privacy.html](https://gokuthug1.github.io/scv/privacy.html)

---

## ⚡ Key Features

* **Comprehensive Extraction**: Inspect HTML, CSS, JavaScript, JSON, SVGs, audio/video media, and binary font files from any webpage or tab.
* **Source Map Auto-Reconstruction**: Resolves `sourceMappingURL` declarations to reconstruct original unbundled project directory trees (Webpack, Vite, Rollup, TypeScript) with path normalization.
* **Fast Native Editor**: Powered by the CSS Custom Highlight API (`CSS.highlights`) for instant multi-token search (`Ctrl+F`) across syntax spans without DOM mutations, synchronized with gutter line centering.
* **Security & Credential Scanner**: Scans client-side scripts in real-time for exposed API keys, bearer tokens, AWS credentials, and hardcoded secrets.
* **Smart Snapshot Diffing**: Compare page source extractions against stored baseline snapshots using bounded forward-lookahead windowing to prevent repeated token desynchronization, plus instant baseline updates.
* **Media & Font Previews**: Live SVG preview toggle (rendered visual vs XML source) with transparency grid, and dynamic `FontFace` API specimen registration for `woff2`, `woff`, `ttf`, and `otf` fonts.
* **Cloud & Desktop Exports**: Download individual files, export complete organized ZIP archives, or push directly to VS Code for Web (`vscode.dev`), VS Code Desktop, CodePen, JSFiddle, StackBlitz, or GitHub Gists.
* **Three Operating Surfaces**: Use as a compact popup, an independent floating window, or docked directly into Chrome's native **Side Panel**.
* **Themes & Custom CSS**: 8 built-in themes (Dark, Light, Monokai, Nord, Dracula, Cyberpunk, Solarized Dark, Custom) with custom CSS override editor and local developer font stack.

---

## 🔒 100% Private & Zero Telemetry

* **Local In-Browser Execution**: All source extraction, syntax highlighting, beautification, minification, credential auditing, source map unbundling, and ZIP packaging executes 100% locally within your browser sandbox.
* **Zero Tracking**: No analytics SDKs, no tracking pixels, and no remote code execution (`eval()` free, strictly adhering to Manifest V3).
* Data is never transmitted externally unless you explicitly initiate an export action to an external service under your own direction.

---

## 🛠️ Loading in Developer Mode (Local Installation)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/gokuthug1/scv.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select this folder (containing `manifest.json`).

---

## 📦 Directory Structure

```text
├── manifest.json              # Chrome Manifest V3 configuration
├── popup.html                 # Extension quick-action popup surface
├── settings.html              # Extension options & theme customization
├── viewer.html                # Main workspace & side-panel viewer UI
├── index.html                 # Official website homepage (GitHub Pages)
├── privacy.html               # Official Privacy Policy document
├── styles.css                 # Website styling
├── app.js                     # Website interactive simulator logic
├── css/                       # Extension stylesheets
│   ├── popup.css
│   ├── settings.css
│   └── viewer.css
├── js/                        # Extension client-side engines & workers
│   ├── background.js          # Service worker lifecycle & context menus
│   ├── beautifier.js          # JS/CSS/HTML formatting & static unpacker
│   ├── content-bridge.js      # DOM asset extraction bridge
│   ├── db.js                  # IndexedDB persistent snapshot cache
│   ├── editor-engine.js       # Code editor, gutter, & CSS Highlight API
│   ├── export-integrations.js # VS Code, CodePen, Gist, Sandbox exports
│   ├── file-utils.js          # Local download & file helpers
│   ├── framework-detector.js  # Framework & bundler signature detector
│   ├── highlighter.js         # Client-side syntax lexer
│   ├── popup.js               # Quick popup controller
│   ├── secret-scanner.js      # Security credential audit engine
│   ├── settings.js            # Settings manager & theme engine
│   ├── snapshot-diff.js       # Forward-lookahead line diffing engine
│   ├── sourcemap-resolver.js  # Source map unbundling & normalization
│   ├── themes.js              # Theme color definitions
│   ├── viewer.js              # Full workspace UI orchestrator
│   ├── worker.js              # Web worker for background beautification
│   └── zip.js                 # JSZip archive generator
├── images/                    # Extension & store icons (16, 32, 48, 128, QR, v)
└── source-code-viewer-v10.8.zip # Production Chrome Web Store distribution archive
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
