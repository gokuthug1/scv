/**
 * js/zip.js
 * Native drop-in replacement for JSZip.
 * Utilizes CompressionStream and TextEncoder to construct standard PKZIP archives.
 * Correctly decodes Base64 binary assets into Uint8Array buffers to prevent ZIP corruption.
 */

function ensureUint8Array(content, isBase64 = false) {
    if (!content) return new Uint8Array(0);
    if (content instanceof Uint8Array) return content;
    if (content instanceof ArrayBuffer) return new Uint8Array(content);
    if (ArrayBuffer.isView(content)) return new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
    if (typeof content === 'string') {
        if (isBase64) {
            try {
                const binary = atob(content);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                return bytes;
            } catch (e) {
                return new TextEncoder().encode(content);
            }
        }
        return new TextEncoder().encode(content);
    }
    if (Array.isArray(content)) return new Uint8Array(content);
    if (typeof content === 'object') {
        return new Uint8Array(Object.values(content));
    }
    return new Uint8Array(0);
}

class JSZip {
    constructor() {
        this.files = [];
        this.encoder = new TextEncoder();
    }

    sanitizePath(path) {
        if (!path || typeof path !== 'string') return 'unknown_file';
        const cleanPath = path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
        const segments = cleanPath.split('/');
        const cleanedSegments = [];
        const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

        for (let seg of segments) {
            seg = seg.trim().replace(/^\.+|\.+$/g, '').replace(/[<>:"\\|?*]/g, '_');
            if (!seg) continue;
            if (reservedNames.test(seg)) seg = '_' + seg;
            if (seg.length > 80) {
                const lastDot = seg.lastIndexOf('.');
                if (lastDot !== -1 && (seg.length - lastDot) < 10) {
                    const ext = seg.slice(lastDot);
                    seg = seg.slice(0, 80 - ext.length) + ext;
                } else {
                    seg = seg.slice(0, 80);
                }
            }
            cleanedSegments.push(seg);
        }

        if (cleanedSegments.length === 0) return 'file';
        let finalPath = cleanedSegments.join('/').replace(/\/+$/, '');

        if (finalPath.length > 200) {
            const fileName = cleanedSegments.pop() || 'file';
            const maxFolderLength = 200 - fileName.length - 1;
            let folderPath = cleanedSegments.join('/');
            if (folderPath.length > maxFolderLength) {
                folderPath = folderPath.slice(-maxFolderLength);
                const firstSlash = folderPath.indexOf('/');
                folderPath = firstSlash !== -1 ? folderPath.slice(firstSlash + 1) : '';
            }
            finalPath = folderPath ? `${folderPath}/${fileName}` : fileName;
        }
        return finalPath;
    }

    file(path, content, options = {}) {
        const cleanPath = this.sanitizePath(path);
        let finalPath = cleanPath;
        let counter = 1;

        while (this.files.some(f => f.path === finalPath)) {
            const parts = cleanPath.split('/');
            const fileName = parts.pop();
            const lastDot = fileName.lastIndexOf('.');
            let base = fileName;
            let ext = '';
            if (lastDot !== -1 && lastDot > 0) {
                base = fileName.slice(0, lastDot);
                ext = fileName.slice(lastDot);
            }
            parts.push(`${base}_${counter}${ext}`);
            finalPath = parts.join('/');
            counter++;
        }

        const isBase64 = Boolean(options && (options.base64 || options.isBase64));
        this.files.push({ path: finalPath, content: content ?? '', isBase64 });
        return this;
    }

    async generateAsync(options = { type: 'blob' }) {
        if (this.files.length === 0) {
            this.file("readme.txt", "No source code could be extracted from this page.");
        }

        const crcTable = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
            crcTable[i] = c;
        }

        const crc32 = (arr) => {
            let crc = 0 ^ -1;
            for (let i = 0; i < arr.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ arr[i]) & 0xFF];
            return (crc ^ -1) >>> 0;
        };

        const deflateRaw = async (uint8arr) => {
            if (uint8arr.length === 0) return { data: new Uint8Array(0), method: 0 };
            try {
                const stream = new Blob([uint8arr]).stream().pipeThrough(new CompressionStream('deflate-raw'));
                const buffer = await new Response(stream).arrayBuffer();
                const compressed = new Uint8Array(buffer);
                if (compressed.length < uint8arr.length) {
                    return { data: compressed, method: 8 };
                }
            } catch (err) {
                console.warn("Deflate compression unavailable, saving uncompressed:", err);
            }
            return { data: uint8arr, method: 0 };
        };

        const zipData = [];
        const centralDirectory = [];
        let offset = 0;
        let totalEntries = 0;
        const writtenDirs = new Set();

        const now = new Date();
        const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
        const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

        const writeDirectoryEntry = (dirPath) => {
            if (writtenDirs.has(dirPath)) return;
            writtenDirs.add(dirPath);

            const dirNameBytes = this.encoder.encode(dirPath + '/');
            const lfh = new ArrayBuffer(30);
            const lfhView = new DataView(lfh);
            lfhView.setUint32(0, 0x04034b50, true);
            lfhView.setUint16(4, 10, true);
            lfhView.setUint16(6, 0x0800, true);
            lfhView.setUint16(8, 0, true);
            lfhView.setUint16(10, dosTime, true);
            lfhView.setUint16(12, dosDate, true);
            lfhView.setUint32(14, 0, true);
            lfhView.setUint32(18, 0, true);
            lfhView.setUint32(22, 0, true);
            lfhView.setUint16(26, dirNameBytes.length, true);
            lfhView.setUint16(28, 0, true);

            zipData.push(new Uint8Array(lfh), dirNameBytes);

            const cdr = new ArrayBuffer(46);
            const cdrView = new DataView(cdr);
            cdrView.setUint32(0, 0x02014b50, true);
            cdrView.setUint16(4, 0x0314, true);
            cdrView.setUint16(6, 10, true);
            cdrView.setUint16(8, 0x0800, true);
            cdrView.setUint16(10, 0, true);
            cdrView.setUint16(12, dosTime, true);
            cdrView.setUint16(14, dosDate, true);
            cdrView.setUint32(16, 0, true);
            cdrView.setUint32(20, 0, true);
            cdrView.setUint32(24, 0, true);
            cdrView.setUint16(28, dirNameBytes.length, true);
            cdrView.setUint16(30, 0, true);
            cdrView.setUint16(32, 0, true);
            cdrView.setUint16(34, 0, true);
            cdrView.setUint16(36, 0, true);
            cdrView.setUint32(38, 0x41ed0010, true);
            cdrView.setUint32(42, offset, true);

            centralDirectory.push(new Uint8Array(cdr), dirNameBytes);
            offset += lfh.byteLength + dirNameBytes.length;
            totalEntries++;
        };

        for (const file of this.files) {
            const segments = file.path.split('/');
            if (segments.length > 1) {
                let currentAccumulatedPath = '';
                for (let i = 0; i < segments.length - 1; i++) {
                    currentAccumulatedPath += (i > 0 ? '/' : '') + segments[i];
                    writeDirectoryEntry(currentAccumulatedPath);
                }
            }

            const nameBytes = this.encoder.encode(file.path);
            const contentBytes = ensureUint8Array(file.content, file.isBase64);
            const crc = crc32(contentBytes);
            const compressedRes = await deflateRaw(contentBytes);
            const compressedBytes = compressedRes.data;
            const compressionMethod = compressedRes.method;
            const versionNeeded = compressionMethod === 0 ? 10 : 20;

            const lfh = new ArrayBuffer(30);
            const lfhView = new DataView(lfh);
            lfhView.setUint32(0, 0x04034b50, true);
            lfhView.setUint16(4, versionNeeded, true);
            lfhView.setUint16(6, 0x0800, true);
            lfhView.setUint16(8, compressionMethod, true);
            lfhView.setUint16(10, dosTime, true);
            lfhView.setUint16(12, dosDate, true);
            lfhView.setUint32(14, crc, true);
            lfhView.setUint32(18, compressedBytes.length, true);
            lfhView.setUint32(22, contentBytes.length, true);
            lfhView.setUint16(26, nameBytes.length, true);
            lfhView.setUint16(28, 0, true);

            zipData.push(new Uint8Array(lfh), nameBytes, compressedBytes);

            const cdr = new ArrayBuffer(46);
            const cdrView = new DataView(cdr);
            cdrView.setUint32(0, 0x02014b50, true);
            cdrView.setUint16(4, 0x0314, true);
            cdrView.setUint16(6, versionNeeded, true);
            cdrView.setUint16(8, 0x0800, true);
            cdrView.setUint16(10, compressionMethod, true);
            cdrView.setUint16(12, dosTime, true);
            cdrView.setUint16(14, dosDate, true);
            cdrView.setUint32(16, crc, true);
            cdrView.setUint32(20, compressedBytes.length, true);
            cdrView.setUint32(24, contentBytes.length, true);
            cdrView.setUint16(28, nameBytes.length, true);
            cdrView.setUint16(30, 0, true);
            cdrView.setUint16(32, 0, true);
            cdrView.setUint16(34, 0, true);
            cdrView.setUint16(36, 0, true);
            cdrView.setUint32(38, 0x81a40020, true);
            cdrView.setUint32(42, offset, true);

            centralDirectory.push(new Uint8Array(cdr), nameBytes);
            offset += lfh.byteLength + nameBytes.length + compressedBytes.length;
            totalEntries++;
        }

        const cdOffset = offset;
        let cdSize = 0;
        for (const chunk of centralDirectory) cdSize += chunk.length;

        const eocd = new ArrayBuffer(22);
        const eocdView = new DataView(eocd);
        eocdView.setUint32(0, 0x06054b50, true);
        eocdView.setUint16(4, 0, true);
        eocdView.setUint16(6, 0, true);
        eocdView.setUint16(8, totalEntries, true);
        eocdView.setUint16(10, totalEntries, true);
        eocdView.setUint32(12, cdSize, true);
        eocdView.setUint32(16, cdOffset, true);
        eocdView.setUint16(20, 0, true);

        zipData.push(...centralDirectory, new Uint8Array(eocd));
        return new Blob(zipData, { type: 'application/zip' });
    }
}

if (typeof globalThis !== 'undefined') globalThis.JSZip = JSZip;
if (typeof window !== 'undefined') window.JSZip = JSZip;
if (typeof module !== 'undefined' && module.exports) module.exports = JSZip;