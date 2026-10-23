/**

 * js/highlighter.js

 * Single-pass regex lexer with language coverage for JS, TS, HTML, XML, SVG, CSS, SCSS, LESS, and JSON.

 * Normalizes input, parses inline scripts/styles, handles regex character classes, and safely linkifies embedded URLs.

 */



const SyntaxHighlighter = {

    PATTERNS: {

        javascript: new RegExp([

            /(?<comment>\/\/.*|\/\*[\s\S]*?\*\/)/,

            /(?<string>`(?:\\[\s\S]|[^\\`])*`|"([^"\\]|\\.)*"|'([^'\\]|\\.)*')/,

            /(?<regex>\/(?![/*\s])(?:\\[\s\S]|\[(?:\\[\s\S]|[^\]\r\n])*\]|[^\\\/\r\n\[])+\/[gimsuy]*(?=\s*[.,;):}\]]|\s*$))/,

            /(?<url>\bhttps?:\/\/[^\s"'<>`]+)/,

            /(?<keyword>\b(?:const|let|var|if|else|for|while|do|async|await|function|return|new|import|export|from|class|extends|super|this|switch|case|default|break|continue|try|catch|finally|throw|delete|typeof|instanceof|void|yield|in|of|interface|type|enum|implements|private|public|protected|readonly|declare|abstract|as|satisfies|keyof|infer|any|unknown|never)\b)/,

            /(?<builtin>\b(?:document|window|console|navigator|globalThis|Math|JSON|Promise|Object|Array|String|Number|Boolean|Date|Map|Set|WeakMap|WeakSet|Symbol|Reflect|Proxy|Error|RegExp|BigInt|Intl|URL|fetch|localStorage|sessionStorage)\b)/,

            /(?<boolean>\b(?:true|false|null|undefined|NaN|Infinity)\b)/,

            /(?<number>\b(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d[\d_]*)?n?)\b)/,

            /(?<function>\b[a-zA-Z_$][\w$]*(?=\s*\())/,

            /(?<className>\b[A-Z][A-Za-z0-9_$]*\b)/,

            /(?<property>\b[a-zA-Z_$][\w$]*(?=\s*:))/,

            /(?<operator>\?\?=?|\?\.|\.\.\.|=>|===|!==|==|!=|<=|>=|&&|\|\||[+\-*\/%&|^!~<>]=?)/,

            /(?<punctuation>[\{\}\[\]\(\);,.:])/

        ].map(r => r.source).join('|'), 'g'),



        html: new RegExp([

            /(?<comment><!--[\s\S]*?-->)/,

            /(?<doctype><!DOCTYPE[^>]+>)/i,

            /(?<tag><\/?[\w:-]+)/,

            /(?<url>\bhttps?:\/\/[^\s"'<>`]+)/,

            /(?<attrName>\b[\w:-]+(?=\s*(?:=|[\s>])))/,

            /(?<attrValue>"[^"]*"|'[^']*')/,

            /(?<punctuation>\/?>|=)/,

            /(?<entity>&[a-zA-Z0-9#]+;)/

        ].map(r => r.source).join('|'), 'gi'),



        css: new RegExp([

            /(?<comment>\/\*[\s\S]*?\*\/)/,

            /(?<string>"([^"\\]|\\.)*"|'([^'\\]|\\.)*')/,

            /(?<url>\bhttps?:\/\/[^\s"'<>`()]+)/,

            /(?<atrule>@[a-z-]+)/,

            /(?<function>\b[a-zA-Z-]+(?=\())/,

            /(?<property>(?:--[a-zA-Z0-9-]+|[a-zA-Z-]+)(?=\s*:))/,

            /(?<color>#[0-9a-fA-F]{3,8}\b)/,

            /(?<number>\b-?\d+(?:\.\d+)?(?:px|em|rem|%|vw|vh|deg|s|ms|fr)?\b)/,

            /(?<selector>\.[\w-]+|#[\w-]+|::?[\w-]+|\[[^\]]+\])/,

            /(?<punctuation>[\{\}\(\):;!,>+~])/

        ].map(r => r.source).join('|'), 'gi'),



        json: new RegExp([

            /(?<property>"(?:\\.|[^"\\])*"(?=\s*:))/,

            /(?<string>"(?:\\.|[^"\\])*")/,

            /(?<url>\bhttps?:\/\/[^\s"'<>`]+)/,

            /(?<number>\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/,

            /(?<boolean>\b(?:true|false|null)\b)/,

            /(?<punctuation>[\{\}\[\]\(\),:])/

        ].map(r => r.source).join('|'), 'gi')

    },



    extractCleanUrl(rawUrl) {

        let clean = rawUrl || '';

        let trailing = '';

        while (clean.length > 0) {

            const lastChar = clean[clean.length - 1];

            if (['.', ',', ';', ':', '!', '?', '>', ']', '}', '"', "'", '`'].includes(lastChar)) {

                trailing = lastChar + trailing;

                clean = clean.slice(0, -1);

            } else if (lastChar === ')') {

                const openCount = (clean.match(/\(/g) || []).length;

                const closeCount = (clean.match(/\)/g) || []).length;

                if (closeCount > openCount) {

                    trailing = lastChar + trailing;

                    clean = clean.slice(0, -1);

                } else {

                    break;

                }

            } else {

                break;

            }

        }

        return { cleanUrl: clean, trailing };

    },



    linkify(rawText) {

        if (!rawText) return '';

        const urlRegex = /\b(?:https?|ftp|file):\/\/[^\s"'<>`]+|(?:\/\/[\w.-]+\.[a-zA-Z]{2,}(?:\/[^\s"'<>`]*)?)/gi;

        let lastIdx = 0;

        let out = '';



        for (const match of rawText.matchAll(urlRegex)) {

            const matchIndex = match.index;

            if (matchIndex > lastIdx) {

                out += this.escapeHtml(rawText.slice(lastIdx, matchIndex));

            }

            const rawUrl = match[0];

            const { cleanUrl, trailing } = this.extractCleanUrl(rawUrl);



            let href = cleanUrl;

            if (href.startsWith('//')) {

                href = 'https:' + href;

            }



            out += `<a href="${this.escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="token url">${this.escapeHtml(cleanUrl)}</a>` + this.escapeHtml(trailing);

            lastIdx = matchIndex + rawUrl.length;

        }



        if (lastIdx < rawText.length) {

            out += this.escapeHtml(rawText.slice(lastIdx));

        }



        return out;

    },



    highlight(code, lang) {

        if (!code) return '';

        if (code.length > 15728640) return this.linkify(code);



        let effectiveLang = (lang || 'javascript').toLowerCase().trim();

        if (['js', 'ts', 'jsx', 'tsx', 'typescript', 'mjs', 'cjs'].includes(effectiveLang)) {

            effectiveLang = 'javascript';

        } else if (['htm', 'xhtml', 'xml', 'svg'].includes(effectiveLang)) {

            effectiveLang = 'html';

        } else if (['css', 'scss', 'less', 'sass'].includes(effectiveLang)) {

            effectiveLang = 'css';

        } else if (['json', 'map'].includes(effectiveLang)) {

            effectiveLang = 'json';

        }



        if (effectiveLang === 'html') return this.highlightHtml(code);

        return this._highlightRegex(code, effectiveLang);

    },



    highlightHtml(code) {

        if (!code) return '';

        const regex = /(<script[\s\S]*?>)([\s\S]*?)(<\/script>)|(<style[\s\S]*?>)([\s\S]*?)(<\/style>)/gi;

        let lastIndex = 0;

        let result = '';



        for (const match of code.matchAll(regex)) {

            result += this._highlightRegex(code.slice(lastIndex, match.index), 'html');



            if (match[1]) {

                result += this._highlightRegex(match[1], 'html')

                       + this._highlightRegex(match[2], 'javascript')

                       + this._highlightRegex(match[3], 'html');

            } else {

                result += this._highlightRegex(match[4], 'html')

                       + this._highlightRegex(match[5], 'css')

                       + this._highlightRegex(match[6], 'html');

            }



            lastIndex = match.index + match[0].length;

        }



        return result + this._highlightRegex(code.slice(lastIndex), 'html');

    },



    _highlightRegex(code, lang) {

        if (!code) return '';

        const regex = this.PATTERNS[lang];

        if (!regex) return this.linkify(code);



        let result = '';

        let lastIndex = 0;



        for (const match of code.matchAll(regex)) {

            if (match.index > lastIndex) {

                result += this.linkify(code.slice(lastIndex, match.index));

            }



            let type = null;

            if (match.groups) {

                for (const g in match.groups) {

                    if (match.groups[g] !== undefined) {

                        type = g;

                        break;

                    }

                }

            }



            const content = match[0];

            if (type) {

                const className = type.replace(/[A-Z]/g, m => '-' + m.toLowerCase());

                if (className === 'url') {

                    const { cleanUrl, trailing } = this.extractCleanUrl(content);

                    let href = cleanUrl.startsWith('//') ? 'https:' + cleanUrl : cleanUrl;

                    result += `<a href="${this.escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="token url">${this.escapeHtml(cleanUrl)}</a>` + this.escapeHtml(trailing);

                } else if (['comment', 'string', 'attr-value', 'attr-name'].includes(className)) {

                    result += `<span class="token ${className}">${this.linkify(content)}</span>`;

                } else {

                    result += `<span class="token ${className}">${this.escapeHtml(content)}</span>`;

                }

            } else {

                result += this.linkify(content);

            }



            lastIndex = match.index + content.length;

        }



        if (lastIndex < code.length) {

            result += this.linkify(code.slice(lastIndex));

        }



        return result;

    },



    escapeHtml(str) {

        return String(str ?? '')

            .replace(/&/g, '&amp;')

            .replace(/</g, '&lt;')

            .replace(/>/g, '&gt;')

            .replace(/"/g, '&quot;')

            .replace(/'/g, '&#39;');

    }

};



if (typeof globalThis !== 'undefined') globalThis.SyntaxHighlighter = SyntaxHighlighter;

if (typeof window !== 'undefined') window.SyntaxHighlighter = SyntaxHighlighter;

if (typeof module !== 'undefined' && module.exports) module.exports = SyntaxHighlighter;
