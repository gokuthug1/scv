/**
 * js/export-integrations.js
 * Cloud and IDE Export Integration Engine for Source Code Viewer.
 * Exports extractions to VS Code, CodePen, JSFiddle, StackBlitz, and GitHub Gists.
 * Packages multi-file projects into structured ZIP archives to avoid browser download throttling.
 */

const ExportIntegrations = {
    exportToVSCode(allData = [], pageTitle = '', pageUrl = '') {
        const targetUrl = pageUrl || '';
        const isGitRepo = /github\.com\/[^/]+\/[^/]+|gitlab\.com\/[^/]+\/[^/]+|\.git$/i.test(targetUrl);

        if (isGitRepo) {
            const cleanRepoUrl = targetUrl.replace(/\/(?:blob|tree)\/[^/]+\/.*/, '');
            const vscodeUri = `vscode://vscode.git/clone?url=${encodeURIComponent(cleanRepoUrl)}`;
            window.open(vscodeUri, '_self');
            return;
        }

        if (!Array.isArray(allData) || allData.length === 0) {
            alert("No extracted files available to export.");
            return;
        }

        const cleanTitle = (pageTitle || 'Project')
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .replace(/^_+|_+$/g, '') || 'SourceViewer_Export';

        try {
            const zip = new JSZip();
            allData.forEach(item => {
                if (item.filePath) {
                    const content = item.error || item.content || '';
                    zip.file(item.filePath, content, { base64: item.isBase64 });
                }
            });

            zip.generateAsync({ type: 'blob' }).then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                chrome.downloads.download({
                    url: blobUrl,
                    filename: `VSCode_${cleanTitle}.zip`,
                    saveAs: true
                }, () => {
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
                });
            });
        } catch (err) {
            console.error("VS Code export archive creation failed:", err);
        }
    },

    exportToVSCodeDev(item, pageUrl = '') {
        const targetUrl = item?.fullUrl || pageUrl || '';
        const ghMatch = targetUrl.match(/github\.com\/([^/]+\/[^/]+)/i);
        if (ghMatch && ghMatch[1]) {
            const repoPath = ghMatch[1].replace(/\.git$/, '');
            window.open(`https://vscode.dev/github.com/${repoPath}`, '_blank');
        } else {
            window.open('https://vscode.dev/', '_blank');
        }
    },

    truncateForExternalForm(code, maxLen = 800000) {
        if (!code || typeof code !== 'string') return '';
        if (code.length <= maxLen) return code;
        return code.slice(0, maxLen) + '\n/* Truncated for export payload limit */';
    },

    exportToCodePen(html = '', css = '', js = '', title = 'Source Code Viewer Export') {
        const data = {
            title: title || 'Source Code Viewer Export',
            html: this.truncateForExternalForm(html),
            css: this.truncateForExternalForm(css),
            js: this.truncateForExternalForm(js)
        };
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = 'https://codepen.io/pen/define';
        form.target = '_blank';

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'data';
        input.value = JSON.stringify(data);
        form.appendChild(input);

        document.body.appendChild(form);
        form.submit();
        form.remove();
    },

    exportToJSFiddle(html = '', css = '', js = '', title = 'Source Code Viewer Export') {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = 'https://jsfiddle.net/api/post/library/pure/';
        form.target = '_blank';

        const fields = {
            html: this.truncateForExternalForm(html),
            css: this.truncateForExternalForm(css),
            js: this.truncateForExternalForm(js),
            title: title || 'Source Code Viewer Export'
        };

        Object.entries(fields).forEach(([name, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        form.remove();
    },

    exportToStackBlitz(html = '', css = '', js = '', title = 'Source Code Viewer Export') {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = 'https://stackblitz.com/run';
        form.target = '_blank';

        let finalHtml = html;
        if (!finalHtml) {
            finalHtml = '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <h1>Exported Page</h1>\n  <script src="index.js"></script>\n</body>\n</html>';
        } else {
            if (css && !finalHtml.includes('styles.css')) {
                if (finalHtml.includes('</head>')) {
                    finalHtml = finalHtml.replace('</head>', '  <link rel="stylesheet" href="styles.css">\n</head>');
                } else {
                    finalHtml = '<link rel="stylesheet" href="styles.css">\n' + finalHtml;
                }
            }
            if (js && !finalHtml.includes('index.js')) {
                if (finalHtml.includes('</body>')) {
                    finalHtml = finalHtml.replace('</body>', '  <script src="index.js"></script>\n</body>');
                } else {
                    finalHtml += '\n<script src="index.js"></script>';
                }
            }
        }

        const fields = {
            'project[title]': title || 'Source Code Viewer Export',
            'project[description]': 'Exported from Source Code Viewer Chrome Extension',
            'project[template]': 'javascript',
            'project[files][index.html]': finalHtml,
            'project[files][styles.css]': css || '/* Stylesheet */',
            'project[files][index.js]': js || '// JavaScript'
        };

        Object.entries(fields).forEach(([name, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        form.remove();
    },

    async exportToGitHubGist(allData, description = 'Source Code Viewer Export', isPublic = false, patToken = '') {
        if (!patToken) {
            throw new Error("GitHub Personal Access Token (PAT) is required. Please configure it in Settings.");
        }

        const filesObj = {};
        let validFileCount = 0;

        allData.forEach(item => {
            if (item.content && typeof item.content === 'string') {
                const filename = (item.filePath || item.source || 'file.txt').replace(/\//g, '_');
                filesObj[filename] = { content: item.content.slice(0, 1000000) };
                validFileCount++;
            }
        });

        if (validFileCount === 0) {
            throw new Error("No readable text files available to export to Gist.");
        }

        const payload = {
            description,
            public: isPublic,
            files: filesObj
        };

        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `token ${patToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            throw new Error(`GitHub API Error: ${errJson.message || response.statusText}`);
        }

        const result = await response.json();
        return result.html_url;
    }
};

if (typeof globalThis !== 'undefined') globalThis.ExportIntegrations = ExportIntegrations;
if (typeof window !== 'undefined') window.ExportIntegrations = ExportIntegrations;