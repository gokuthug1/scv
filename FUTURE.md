# 🚀 Source Code Viewer — Chrome Web Store Developer Console Guide & Maintenance Plan (`FUTURE.md`)

*Created: August 2026 | Codebase Version: v10.8 | Target Web Store Version: v10.8 (Upgrade from v8.0)*  
*Extension ID: `jfcfmlcbjaloijgkjhfkfioonngengnm` | Live URL: [Source Code Viewer on Chrome Web Store](https://chromewebstore.google.com/detail/jfcfmlcbjaloijgkjhfkfioonngengnm?authuser=0&hl=en)*

---

## 📑 TABLE OF CONTENTS

1. [Chrome Web Store Console — Exact Text Placements](#-chrome-web-store-console--exact-text-placements)
   - [Tab 1: Package (`/edit/package`)](#tab-1-package-editpackage)
   - [Tab 2: Store Listing (`/edit/listing`)](#tab-2-store-listing-editlisting)
   - [Tab 3: Privacy (`/edit/privacy`)](#tab-3-privacy-editprivacy)
     - [3.1 Single Purpose Description](#31-single-purpose-description)
     - [3.2 Permission Justifications (All 8 Permissions + Host Permissions)](#32-permission-justifications)
     - [3.3 Remote Code Declaration & Justification](#33-remote-code-declaration--justification)
     - [3.4 Data Usage Disclosures & Certifications](#34-data-usage-disclosures--certifications)
     - [3.5 Privacy Policy URL & Full Text](#35-privacy-policy-url--full-text)
   - [Tab 4: Distribution (`/edit/distribution`)](#tab-4-distribution-editdistribution)
   - [Tab 5: Access / Test Instructions (`/testcredentials`)](#tab-5-access--test-instructions-testcredentials)
2. [Release Notes / "What's New in v10.8"](#-release-notes--whats-new-in-v101)
3. [Phase 1: Immediate Deployment Checklist](#-phase-1-immediate-deployment-checklist)
4. [Phase 2: Platform Maintenance & MV3 Lifecycle](#-phase-2-platform-maintenance--mv3-lifecycle)
5. [Phase 3: Performance, Polish & Stability Post-Peak Hardening](#-phase-3-performance-polish--stability-post-peak-hardening)
6. [Phase 4: Quarterly Maintenance & Security Checklist](#-phase-4-quarterly-maintenance--security-checklist)

---

## 🌐 Chrome Web Store Console — Exact Text Placements

Navigate to each tab in the [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole/bfe4cf53-79b9-4dde-9b56-5eb2858aa5e5/jfcfmlcbjaloijgkjhfkfioonngengnm) and copy-paste the exact entries below.

---

### Tab 1: Package (`/edit/package`)

#### **Action: Upload New Package**
1. Run this command inside the project directory to create the clean release ZIP:
   ```bash
   zip -r source-code-viewer-v10.8.zip . -x ".git/*" "*.md" ".system_generated/*"
   ```
2. In the Developer Console, click **"Upload new package"** and upload `source-code-viewer-v10.8.zip`.
3. Verify that the manifest version displays `10.1` and `manifest_version: 3`.

---

### Tab 2: Store Listing (`/edit/listing`)

#### **Field: Extension Name**
*Character limit: 45 | Current count: 18*
```text
Source Code Viewer
```

#### **Field: Summary / Short Description**
*Character limit: 132 | Current count: 94*
```text
Inspect, search, format, and export webpage source files in a private browser-based workspace.
```

#### **Field: Detailed Description**
*Character limit: 16,000 | Clean, descriptive, and free of keyword lists*
```text
Source Code Viewer helps developers and designers examine the client-side files used by a webpage without leaving the browser.

Open the extension on any page to collect its readable source files and organize them in a focused workspace. You can review formatted markup, styles, scripts, vector graphics, font specimens, and media assets with syntax highlighting and line numbers.

WORKFLOW & CAPABILITIES:
• In-File & Global Search: Quickly search within the current file or across the entire extracted file collection with instant line navigation.
• Source Map Reconstruction: Reconstruct original file directory paths when a page publishes compatible map files.
• Security & Credential Review: Inspect client-side scripts with an automated scanner that highlights potentially exposed access tokens and credentials.
• Snapshot Comparison: Compare the current page state against a saved baseline extraction to highlight added, modified, or removed code lines.
• Visual Previews: Preview rendered vector graphics alongside formatted markup, and examine typography specimens directly in the viewer.
• Organized Archiving: Download individual files directly or export the complete collection as an organized archive package.
• Flexible Workspaces: Inspect files in a popup, a dedicated window, or docked directly into the browser's side panel for side-by-side browsing.
• Visual Customization: Choose from built-in appearance themes or tailor the workspace with custom styling options.

PRIVACY & PERFORMANCE:
The core inspection workflow executes locally within your browser sandbox. The extension contains no analytics, telemetry, or remote code. Information is never transmitted externally unless you explicitly initiate an export action to an outside development service under your own direction.
```

#### **Field: Category**
```text
Developer Tools
```
*(Secondary category: Productivity)*

#### **Field: Language**
```text
English (United States)
```

#### **Field: Graphic Assets Specifications & Captions**
- **Store Icon** (`128x128 px`): `images/v.png`
- **Small Promo Tile** (`440x280 px`):
  - Headline: `Source Code Viewer`
  - Subhead: `Inspect and export webpage source files`
  - Badge: `Private browser-based workspace`
- **Large Promo Tile** (`920x680 px`):
  - Headline: `Source Code Viewer`
  - Tagline: `A focused workspace for understanding webpage source files`
- **Marquee Promo Tile** (`1400x560 px`):
  - Headline: `Source Code Viewer`
  - Subhead: `Review, search, and download the files used by a webpage`
- **Screenshots (1280x800 px or 640x400 px)**:
  - *Screenshot 1 Caption*: `Browse extracted files and search the currently selected source.`
  - *Screenshot 2 Caption*: `Review original file paths when compatible source maps are available.`
  - *Screenshot 3 Caption*: `Review possible exposed credentials found in readable page scripts.`
  - *Screenshot 4 Caption*: `Download one file or save the complete extraction as an organized archive.`
  - *Screenshot 5 Caption*: `Adjust the workspace appearance with built-in and custom styles.`

#### **Field: Official URLs**
- **Official Homepage URL**: `https://gokuthug1.github.io/scv/`
- **Support URL**: `https://gokuthug1.github.io/scv/`

---

### Tab 3: Privacy (`/edit/privacy`)

---

#### 3.1 Single Purpose Description
*Character limit: 1,000 | Current count: ~290*
```text
The single purpose of Source Code Viewer is to provide web developers, security researchers, and designers with an in-browser inspection, beautification, security secret scanning, source map unbundling, and code export tool to analyze and understand client-side web page assets directly within their browser.
```

---

#### 3.2 Permission Justifications

Paste each justification into its respective input box under **Permission justification**:

##### **`activeTab` justification**
*Character limit: 1,000 | Current count: ~155*
```text
Required to inspect and extract client-side HTML, CSS, JavaScript, and media assets from the currently active browser tab when the user invokes the extension.
```

##### **`scripting` justification**
*Character limit: 1,000 | Current count: ~198*
```text
Required to execute the content extraction bridge inside the web page context to retrieve rendered DOM trees, stylesheets, dynamic script tags, and framework metadata without modifying page behavior.
```

##### **`storage` justification**
*Character limit: 1,000 | Current count: ~169*
```text
Required to save user preferences, selected UI themes, custom CSS overrides, line counter display settings, and optional GitHub Personal Access Tokens for Gist export.
```

##### **`downloads` justification**
*Character limit: 1,000 | Current count: ~159*
```text
Required to allow users to export and download extracted source files, unbundled source maps, and complete website asset ZIP bundles directly to their local disk.
```

##### **`contextMenus` justification**
*Character limit: 1,000 | Current count: ~133*
```text
Required to provide quick right-click context menu shortcuts for instant source inspection, script auditing, and launching the viewer.
```

##### **`unlimitedStorage` justification**
*Character limit: 1,000 | Current count: ~189*
```text
Required to store larger extracted code snapshots, IndexedDB offline caches (SCVDB), and source map bundle trees locally without failing on storage quota limits on large web applications.
```

##### **`tabs` justification**
*Character limit: 1,000 | Current count: ~147*
```text
Required to launch the full-screen viewer and settings pages in dedicated browser tabs and capture the target tab's URL and title for export naming.
```

##### **`sidePanel` justification**
*Character limit: 1,000 | Current count: ~137*
```text
Required to dock the source code viewer directly into Chrome's native Side Panel for simultaneous side-by-side inspection while browsing.
```

##### **Host permission justification (`<all_urls>`)**
*Character limit: 1,000 | Current count: ~213*
```text
Required to fetch, beautify, and inspect external stylesheets, scripts, remote source maps, and embedded assets referenced across diverse third-party domains and CDNs on any web page the user chooses to inspect.
```

---

#### 3.3 Remote Code Declaration & Justification

##### **Radio Button Selection:**
- Select: **⚪ No, I am not using Remote code**

##### **Justification (if requested by the dashboard):**
*Character limit: 1,000 | Current count: ~239*
```text
All JavaScript, CSS, HTML, and assets are bundled locally inside the extension package. The extension does not load external scripts or execute dynamic code via eval(), adhering strictly to Manifest V3 security requirements.
```

---

#### 3.4 Data Usage Disclosures & Certifications

##### **Question: What user data do you plan to collect from users now or in the future?**

| Data Category | Checkbox State | Reason / Policy Note |
| :--- | :---: | :--- |
| Personally identifiable information | ❌ **Unchecked** | No names, emails, addresses, or user IDs are collected. |
| Health information | ❌ **Unchecked** | No medical or health data is accessed. |
| Financial and payment information | ❌ **Unchecked** | No payment or financial records are accessed. |
| Authentication information | ❌ **Unchecked** | No user passwords or PINs are collected. |
| Personal communications | ❌ **Unchecked** | No chats, emails, or messages are read. |
| Location | ❌ **Unchecked** | No GPS, IP, or location tracking is performed. |
| Web history | ❌ **Unchecked** | No list of visited sites or timestamps are tracked/saved. |
| User activity | ❌ **Unchecked** | No mouse clicks, keystrokes, or tracking telemetry. |
| **Website content** | ✅ **Checked** *(or ❌ Unchecked)* | See configuration below. |

---

##### **Configuration when "Website content" is Checked ✅ (As shown in your screenshot):**

When you check **Website content**, Chrome Web Store prompts you for the usage reason and handling details:

1. **Why do you collect this data? / Usage Purpose:**
   - [x] **App functionality** *(Check this box)*
   - [ ] Analytics *(Leave unchecked)*
   - [ ] Developer communications *(Leave unchecked)*
   - [ ] Advertising or marketing *(Leave unchecked)*
   - [ ] Fraud prevention or security *(Leave unchecked)*
   - [ ] Personalization *(Leave unchecked)*

2. **Is this data collection required or optional?**
   - Select: **Required** *(or "Primary to item functionality")*

3. **Data Handling / Ephemeral Processing:**
   - Select: **Yes, this data is processed ephemerally** *(if asked)*

4. **Explanation / Justification Box (if prompted):**
   *Character limit: 1,000 | Current count: ~312*
   ```text
   The extension reads client-side website content (HTML DOM, CSS styles, JavaScript source files, and image assets) ephemerally from the active page to display formatted source code, syntax highlighting, and security audit metrics to the user. All processing is 100% local within the browser sandbox; no website content is ever collected, stored on external servers, or transmitted to third parties.
   ```

---

##### **Certifications (Check all three boxes at the bottom):**
- [x] **I do not sell or transfer user data to third parties, outside of the approved use cases**
- [x] **I do not use or transfer user data for purposes that are unrelated to my item's single purpose**
- [x] **I do not use or transfer user data to determine creditworthiness or for lending purposes**

---

#### 3.5 Privacy Policy URL & Full Text

##### **Field: Privacy policy URL**
*Character limit: 2,048*
```text
https://gokuthug1.github.io/scv/
```

##### **Full Privacy Policy Text (Hosted at `https://gokuthug1.github.io/scv/`):**
```markdown
# Privacy Policy for Source Code Viewer

*Last Updated: August 2026*

Source Code Viewer ("the Extension") is dedicated to protecting user privacy and data security. This Privacy Policy details how the Extension handles information when you use it.

### 1. Zero Data Collection & Zero Telemetry
• Source Code Viewer does NOT collect, store, transmit, or sell any personal data, browsing history, user identities, IP addresses, or keystrokes.
• The Extension contains NO tracking scripts, NO analytics SDKs (e.g. Google Analytics), and NO remote advertising pixels.

### 2. 100% Local In-Browser Processing
• All source code extraction, syntax highlighting, beautification, minification, credential auditing, source map unbundling, and ZIP packaging is executed entirely within your browser's local sandbox using client-side JavaScript and Web Workers.
• Extracted page contents never leave your machine unless you explicitly initiate an export action to an external service.

### 3. User-Initiated Third-Party Exports (Optional)
• If you choose to use third-party export features (e.g. CodePen, JSFiddle, StackBlitz, VS Code for Web, or GitHub Gists), only the specific code snippets you choose to export are transmitted directly to the respective third-party platform under your own direction and account credentials.
• GitHub Personal Access Tokens (PAT) entered in Settings are stored exclusively in your browser's secure `chrome.storage.sync` area and are only transmitted to `api.github.com` when creating a Gist.

### 4. Permissions Usage
• The Extension requests permissions (`activeTab`, `scripting`, `storage`, `downloads`, `contextMenus`, `unlimitedStorage`, `tabs`, `sidePanel`, and `<all_urls>`) strictly to perform code extraction, file downloading, theme persistence, and side-panel docking on behalf of the user.

### 5. Contact & Inquiries
For questions or feedback regarding this Privacy Policy, please open an issue at:
https://github.com/gokuthug1/scv/issues
```

---

### Tab 4: Distribution (`/edit/distribution`)

#### **Field: Visibility**
- Select: **Public**

#### **Field: Distribution Regions**
- Select: **All regions (Worldwide)**

#### **Field: Pricing**
- Select: **Free**

---

### Tab 5: Access / Test Instructions (`/testcredentials`)

#### **Field: Test instructions**
*Character limit: 2,048 | Current count: ~648*
```text
No login or authentication credentials are required to test this extension.

To verify functionality:
1. Install the extension package.
2. Navigate to any public website (for example: https://example.com or https://react.dev).
3. Click the Source Code Viewer icon in the extension toolbar, or right-click anywhere on the page and select "View Page Source (SCV)".
4. Verify key features:
   - Elements / HTML & Scripts tabs: Inspect formatted source code with syntax highlighting and line numbers.
   - Secret Scanner tab: Run the live credential scanner to audit client-side scripts.
   - Source Maps: On sites with production maps (e.g., https://react.dev), click "Resolve Source Maps" to inspect the unbundled directory tree.
   - Export: Test "Download ZIP" or "Export to VS Code / CodePen".
```

---

## 🚀 Release Notes / "What's New in v10.8"

```text
Version 10.1 Release Highlights:
• [Editor Engine] Added custom line numbers gutter with one-click line counter toggle.
• [Source Maps] Upgraded Source Map (.map) Resolver to reconstruct full development directory trees.
• [Security] Expanded Secret Scanner with 10+ credential and API key audit rules.
• [Exports] Added direct VS Code Desktop folder project exporter and GitHub Gist integration.
• [UI/UX] Added 7 high-contrast developer themes and live Custom CSS Editor with instant preview.
• [Performance] Web Worker optimization for smooth inspection of 10MB+ single-page application chunks.
• [Platform] Full compliance with latest Manifest V3 service worker and native Chrome Side Panel APIs.
```

---

## 📌 Phase 1: Immediate Deployment Checklist

- [ ] **1. Package Release ZIP**:
  ```bash
  zip -r source-code-viewer-v10.8.zip . -x ".git/*" "*.md" ".system_generated/*"
  ```
- [ ] **2. Package Tab (`/edit/package`)**: Upload `source-code-viewer-v10.8.zip`.
- [ ] **3. Store Listing Tab (`/edit/listing`)**: Copy Name, Short Description, Detailed Description, Category (`Developer Tools`), Homepage, and Graphic Assets.
- [ ] **4. Privacy Tab (`/edit/privacy`)**:
  - Paste Single Purpose Description.
  - Paste all 8 Permission Justifications + Host Permissions.
  - Select "No, I am not using Remote code".
  - Check the 3 Data Usage certification boxes.
  - Enter Privacy Policy URL: `https://gokuthug1.github.io/scv/`.
- [ ] **5. Distribution Tab (`/edit/distribution`)**: Set to Public, All Regions.
- [ ] **6. Test Instructions Tab (`/testcredentials`)**: Paste the 4-step verification instructions.
- [ ] **7. Click "Submit for Review"**: Review typically takes 24-48 hours.

---

## 🛡️ Phase 2: Platform Maintenance & MV3 Lifecycle

Google regularly updates Manifest V3 requirements, permission policies, and browser APIs. Follow these guidelines to maintain ongoing platform compatibility:

### 1. Background Service Worker Resilience
- **Watch For**: Chrome periodically terminates inactive MV3 background service workers (`js/background.js`).
- **Action Items**:
  - Keep `background.js` strictly stateless; all persistent settings and sessions remain in `chrome.storage.sync` and IndexedDB (`SCVDB`).
  - Verify context menu registrations (`updateContextMenus`) trigger cleanly on `runtime.onInstalled` and `runtime.onStartup`.

### 2. Side Panel & Tab Integration
- **Watch For**: Changes to Chrome's native Side Panel API (`chrome.sidePanel`).
- **Action Items**:
  - Maintain compatibility with both the popup interface (`popup.html`) and the side-panel dock (`viewer.html`).
  - Test new Chrome window docking behaviors across macOS, Windows, and Linux.

### 3. Strict Content Security Policy (CSP) & CORS Adaptations
- **Watch For**: High-security websites adopting stricter CSPs (e.g. `trusted-types`, strict nonce restrictions, COEP/COOP headers).
- **Action Items**:
  - Maintain `content-bridge.js` DOM extraction techniques that avoid `eval()` or prohibited inline script executions in page contexts.
  - Ensure fetch fallbacks continue working through background requests when page-level CORS blocks asset fetches.

---

## ⚡ Phase 3: Performance, Polish & Stability Post-Peak Hardening

Because the feature set is complete and fully featured, technical efforts should focus on **speed, depth, and edge-case handling**:

### 1. Mega-Bundle & Memory Safeguards
- **Goal**: Instant rendering even when inspecting 10MB+ minified SPA chunks (e.g., Discord Web, Figma, Twitter).
- **Action Items**:
  - Fine-tune Web Worker chunking for syntax highlighting large JS files (`js/worker.js`).
  - Keep beautification safety limits active to avoid freezing browser tabs on monster files.

### 2. Source Map Edge Cases
- **Goal**: Handle non-standard source map configurations.
- **Action Items**:
  - Support `sourcesContent` extraction when external source file URLs are blocked by CORS.
  - Correctly map relative `sourceRoot` paths in nested micro-frontends.

### 3. Lightweight JS De-obfuscation / Unpacker
- **Goal**: Aid in reverse-engineering minified or packed scripts.
- **Action Items**:
  - Support automatic unpacking of standard `eval(function(p,a,c,k,e,d)...)` (Dean Edwards packer).
  - Add basic hex array unmasking for heavily minified third-party libraries.

---

## 📋 Phase 4: Quarterly Maintenance & Security Checklist

- [ ] **Run Syntax & Build Validation**: Test with latest Node/V8 runtime.
- [ ] **Review Web Store Reviews & Bug Reports**: Check for reported edge cases on specific popular sites.
- [ ] **Manifest & Permissions Audit**: Ensure no unused permissions exist to maintain fast automated store approval.
- [ ] **Support Link Health Check**: Confirm donation link (`$gokuthug1`) and homepage links (`https://gokuthug1.github.io/scv/`) remain valid.
