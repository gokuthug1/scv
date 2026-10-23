/**
 * Shared file helpers for individual downloads.
 * Preserves binary assets while giving text files useful MIME types.
 */
const SCVFileUtils = {
    MIME_BY_EXTENSION: {
        html: 'text/html;charset=utf-8',
        htm: 'text/html;charset=utf-8',
        css: 'text/css;charset=utf-8',
        js: 'text/javascript;charset=utf-8',
        mjs: 'text/javascript;charset=utf-8',
        cjs: 'text/javascript;charset=utf-8',
        json: 'application/json;charset=utf-8',
        map: 'application/json;charset=utf-8',
        xml: 'application/xml;charset=utf-8',
        svg: 'image/svg+xml;charset=utf-8',
        txt: 'text/plain;charset=utf-8',
        md: 'text/markdown;charset=utf-8',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        ico: 'image/x-icon',
        avif: 'image/avif',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        ogg: 'audio/ogg',
        mp4: 'video/mp4',
        webm: 'video/webm',
        woff: 'font/woff',
        woff2: 'font/woff2',
        ttf: 'font/ttf',
        otf: 'font/otf',
        pdf: 'application/pdf',
        wasm: 'application/wasm'
    },

    sanitizeFilename(value, fallback = 'download.txt') {
        const rawName = String(value || fallback)
            .replace(/\\/g, '/')
            .split('/')
            .pop()
            .split(/[?#]/)[0]
            .trim();
        const cleaned = rawName
            .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
            .replace(/[. ]+$/g, '')
            .slice(0, 180);
        return cleaned || fallback;
    },

    getFilename(item, fallback = 'download.txt') {
        let filename = this.sanitizeFilename(
            item?.filePath || item?.source || item?.fullUrl || fallback,
            fallback
        );
        if (!filename.includes('.') && item?.type) {
            const extension = item.type === 'img' || item.type === 'media' || item.type === 'asset'
                ? 'bin'
                : item.type;
            filename = `${filename}.${extension}`;
        }
        return filename;
    },

    getMimeType(item, filename) {
        if (item?.mimeType) return item.mimeType;
        if (item?.contentType) return item.contentType;
        const extension = String(filename || '').split('.').pop().toLowerCase();
        return this.MIME_BY_EXTENSION[extension] || 'application/octet-stream';
    },

    base64ToBytes(value) {
        const binary = atob(value);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index++) {
            bytes[index] = binary.charCodeAt(index);
        }
        return bytes;
    },

    toBlob(item, filename) {
        const content = item?.error || item?.content || '';
        const mimeType = this.getMimeType(item, filename);

        if (content instanceof Blob) {
            return content.type ? content : new Blob([content], { type: mimeType });
        }

        if (!item?.error && item?.isBase64 && typeof content === 'string') {
            return new Blob([this.base64ToBytes(content)], { type: mimeType });
        }

        if (content instanceof ArrayBuffer || ArrayBuffer.isView(content)) {
            return new Blob([content], { type: mimeType });
        }

        const textMime = mimeType === 'application/octet-stream'
            ? 'text/plain;charset=utf-8'
            : mimeType;
        return new Blob([String(content)], { type: textMime });
    },

    async downloadItem(item, options = {}) {
        if (!item) throw new Error('No file is selected.');
        const filename = this.getFilename(item, options.fallbackName);
        const blob = this.toBlob(item, filename);
        const blobUrl = URL.createObjectURL(blob);

        try {
            const downloadId = await new Promise((resolve, reject) => {
                chrome.downloads.download({
                    url: blobUrl,
                    filename,
                    saveAs: options.saveAs === true,
                    conflictAction: 'uniquify'
                }, (id) => {
                    const error = chrome.runtime.lastError;
                    if (error) reject(new Error(error.message));
                    else resolve(id);
                });
            });
            return { downloadId, filename };
        } finally {
            setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
        }
    }
};

if (typeof globalThis !== 'undefined') globalThis.SCVFileUtils = SCVFileUtils;
if (typeof window !== 'undefined') window.SCVFileUtils = SCVFileUtils;
