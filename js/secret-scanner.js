/**
 * js/secret-scanner.js
 * Hardcoded Secret & API Key Audit Engine for Source Code Viewer.
 * Scans client-side JavaScript, HTML, and CSS for exposed security credentials.
 * Implements context-centered snippets for minified single-line files.
 */

const SecretScanner = {
    RULES: [
        { name: 'Google API Key', severity: 'HIGH', pattern: /\bAIzaSy[A-Za-z0-9_-]{35}\b/g },
        { name: 'AWS Access Key ID', severity: 'CRITICAL', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
        { name: 'Stripe Secret Key', severity: 'CRITICAL', pattern: /\bsk_live_[0-9a-zA-Z]{24,}\b/g },
        { name: 'Stripe Publishable Key', severity: 'MEDIUM', pattern: /\bpk_live_[0-9a-zA-Z]{24,}\b/g },
        { name: 'GitHub Access Token', severity: 'CRITICAL', pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36}\b/g },
        { name: 'OpenAI API Key', severity: 'HIGH', pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g },
        { name: 'Slack Token / Webhook', severity: 'HIGH', pattern: /(?:https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9_]+\/B[A-Z0-9_]+\/[A-Za-z0-9_]+|\bxox[baprs]-[0-9a-zA-Z]{10,}\b)/g },
        { name: 'JWT / Bearer Token', severity: 'MEDIUM', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
        { name: 'Private Key Header', severity: 'CRITICAL', pattern: /-----BEGIN (?:RSA|EC|DSA|OPENSSH|PRIVATE) KEY-----/g },
        { name: 'Firebase / Supabase Secret', severity: 'HIGH', pattern: /\b(?:sbp_[a-zA-Z0-9]{40}|firebaseio\.com\b)/g },
        { name: 'Mapbox Access Token', severity: 'MEDIUM', pattern: /\bpk\.eyJ1Ijo[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g },
        { name: 'Generic Secret Keyword Assignment', severity: 'LOW', pattern: /\b(?:password|passwd|secret_key|api_secret)\s*[:=]\s*["']([^"']{8,})["']/gi }
    ],

    scan(allData) {
        if (!Array.isArray(allData)) return [];
        const findings = [];

        allData.forEach(item => {
            if (!item || !item.content || typeof item.content !== 'string') return;
            const fullContent = item.content;

            const lineBreaks = [];
            for (let idx = 0; idx < fullContent.length; idx++) {
                if (fullContent.charCodeAt(idx) === 10) lineBreaks.push(idx);
            }

            const getLineInfo = (matchIndex) => {
                let low = 0;
                let high = lineBreaks.length - 1;
                let lineNum = 1;
                let lineStartIndex = 0;

                while (low <= high) {
                    const mid = (low + high) >> 1;
                    if (lineBreaks[mid] < matchIndex) {
                        lineNum = mid + 2;
                        lineStartIndex = lineBreaks[mid] + 1;
                        low = mid + 1;
                    } else {
                        high = mid - 1;
                    }
                }

                const nextBreak = lineBreaks[lineNum - 1];
                const lineEndIndex = nextBreak !== undefined ? nextBreak : fullContent.length;
                return { lineNum, lineStartIndex, lineEndIndex };
            };

            this.RULES.forEach(rule => {
                const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
                let match;

                while ((match = pattern.exec(fullContent)) !== null) {
                    const matchIndex = match.index;
                    const matchedText = match[0];
                    const { lineNum, lineStartIndex, lineEndIndex } = getLineInfo(matchIndex);

                    const lineLength = lineEndIndex - lineStartIndex;
                    let sanitizedSnippet = '';

                    if (lineLength <= 140) {
                        sanitizedSnippet = fullContent.substring(lineStartIndex, lineEndIndex).trim();
                    } else {
                        const snippetStart = Math.max(lineStartIndex, matchIndex - 35);
                        const snippetEnd = Math.min(lineEndIndex, matchIndex + matchedText.length + 35);
                        const prefix = snippetStart > lineStartIndex ? '...' : '';
                        const suffix = snippetEnd < lineEndIndex ? '...' : '';
                        sanitizedSnippet = `${prefix}${fullContent.substring(snippetStart, snippetEnd).trim()}${suffix}`;
                    }

                    findings.push({
                        ruleName: rule.name,
                        severity: rule.severity,
                        filePath: item.filePath || item.source || 'inline',
                        fullUrl: item.fullUrl,
                        line: lineNum,
                        secret: matchedText,
                        snippet: sanitizedSnippet,
                        item: item
                    });

                    if (match.index === pattern.lastIndex) pattern.lastIndex++;
                }
            });
        });

        return findings;
    }
};

if (typeof globalThis !== 'undefined') globalThis.SecretScanner = SecretScanner;
if (typeof window !== 'undefined') window.SecretScanner = SecretScanner;