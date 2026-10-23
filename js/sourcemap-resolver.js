/**
 * js/sourcemap-resolver.js
 * Source Map (.map) Auto-Resolution Engine for Source Code Viewer.
 * Detects sourceMappingURL references, fetches map files, and unbundles original source files.
 * Handles data URIs with charset=utf-8, sourceRoot prefixes, and URL-encoded formats.
 * Normalizes relative and protocol paths (eliminating .. segments) and fetches external sources if omitted.
 */

const SourceMapResolver = {
    normalizePath(pathStr) {
        if (!pathStr || typeof pathStr !== 'string') return '';
        let cleaned = pathStr
            .replace(/^[a-z0-9_+-]+:\/\/\/?/i, '')
            .replace(/\\/g, '/');

        const segments = cleaned.split('/');
        const safeSegments = [];
        for (const seg of segments) {
            const trimmed = seg.trim();
            if (!trimmed || trimmed === '.') continue;
            if (trimmed === '..') {
                if (safeSegments.length > 0 && safeSegments[safeSegments.length - 1] !== '..') {
                    safeSegments.pop();
                }
            } else {
                safeSegments.push(trimmed);
            }
        }
        return safeSegments.join('/');
    },

    async resolve(item, fetchFn) {
        if (!item || !item.content || typeof item.content !== 'string') return [];
        const content = item.content;

        const mapRegex = /(?:\/\/#|\/\*#)\s*sourceMappingURL=([^\s*]+)/i;
        const match = content.match(mapRegex);
        if (!match || !match[1]) return [];

        const mapUrlRaw = match[1].trim();
        let mapData = null;
        let resolvedMapUrl = null;

        try {
            if (mapUrlRaw.startsWith('data:')) {
                const commaIdx = mapUrlRaw.indexOf(',');
                if (commaIdx !== -1) {
                    const meta = mapUrlRaw.substring(0, commaIdx);
                    const body = mapUrlRaw.substring(commaIdx + 1);
                    if (meta.includes('base64')) {
                        mapData = JSON.parse(atob(body));
                    } else {
                        mapData = JSON.parse(decodeURIComponent(body));
                    }
                }
            } else if (item.fullUrl) {
                resolvedMapUrl = new URL(mapUrlRaw, item.fullUrl).href;
                if (typeof fetchFn === 'function') {
                    const fetched = await fetchFn(resolvedMapUrl).catch(() => null);
                    if (fetched) {
                        mapData = typeof fetched === 'string' ? JSON.parse(fetched) : fetched;
                    }
                } else if (typeof fetch === 'function') {
                    const res = await fetch(resolvedMapUrl).catch(() => null);
                    if (res && res.ok) {
                        mapData = await res.json().catch(() => null);
                    }
                }
            }
        } catch (err) {
            return [];
        }

        if (!mapData || !Array.isArray(mapData.sources)) return [];

        const sources = mapData.sources;
        const sourcesContent = Array.isArray(mapData.sourcesContent) ? mapData.sourcesContent : [];
        const sourceRoot = (mapData.sourceRoot || '').replace(/\/+$/, '');

        const reconstructedFiles = await Promise.all(sources.map(async (sourcePath, idx) => {
            const combinedPath = sourceRoot ? `${sourceRoot}/${sourcePath}` : sourcePath;
            let cleanPath = SourceMapResolver.normalizePath(combinedPath);

            if (!cleanPath) cleanPath = `reconstructed-source-${idx + 1}.js`;

            let fileContent = sourcesContent[idx];

            // Fallback fetch external source if sourcesContent not provided
            if ((fileContent === undefined || fileContent === null) && (resolvedMapUrl || item.fullUrl)) {
                const baseUrl = resolvedMapUrl || item.fullUrl;
                try {
                    let sourceUrl = null;
                    if (sourceRoot && (sourceRoot.startsWith('http://') || sourceRoot.startsWith('https://'))) {
                        sourceUrl = new URL(sourcePath, sourceRoot.endsWith('/') ? sourceRoot : `${sourceRoot}/`).href;
                    } else if (baseUrl) {
                        const effectiveBase = sourceRoot ? new URL(sourceRoot.endsWith('/') ? sourceRoot : `${sourceRoot}/`, baseUrl).href : baseUrl;
                        sourceUrl = new URL(sourcePath, effectiveBase).href;
                    }

                    if (sourceUrl && (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://'))) {
                        if (typeof fetchFn === 'function') {
                            const res = await fetchFn(sourceUrl).catch(() => null);
                            if (res) {
                                fileContent = typeof res === 'string' ? res : (res.content || null);
                            }
                        } else if (typeof fetch === 'function') {
                            const res = await fetch(sourceUrl).catch(() => null);
                            if (res && res.ok) {
                                fileContent = await res.text().catch(() => null);
                            }
                        }
                    }
                } catch (_) {}
            }

            if (fileContent === undefined || fileContent === null) {
                fileContent = `// Original source content not embedded in .map for ${cleanPath}`;
            }

            const ext = cleanPath.split('.').pop()?.toLowerCase() || 'js';
            let type = 'js';
            if (['css', 'scss', 'less', 'sass'].includes(ext)) type = 'css';
            else if (['html', 'htm', 'vue', 'svelte'].includes(ext)) type = 'html';
            else if (['json'].includes(ext)) type = 'json';
            else if (['svg'].includes(ext)) type = 'images';

            return {
                type,
                source: cleanPath.split('/').pop() || cleanPath,
                filePath: `sourcemaps/${cleanPath}`,
                content: fileContent,
                fullUrl: item.fullUrl ? `${item.fullUrl}.map#${cleanPath}` : null,
                isReconstructed: true,
                originalMap: mapData.file || item.filePath
            };
        }));

        return reconstructedFiles.filter(Boolean);
    }
};

if (typeof globalThis !== 'undefined') globalThis.SourceMapResolver = SourceMapResolver;
if (typeof window !== 'undefined') window.SourceMapResolver = SourceMapResolver;
