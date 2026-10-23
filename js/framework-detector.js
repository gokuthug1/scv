/**
 * js/framework-detector.js
 * Framework and Library Detection Engine for Source Code Viewer.
 * Detects client-side frameworks and libraries and pairs them with accessible SVG icons.
 */

const FrameworkDetector = {
    FRAMEWORKS: [
        {
            name: 'React',
            color: '#61dafb',
            iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="2"></circle><ellipse cx="12" cy="12" rx="10" ry="4"></ellipse><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"></ellipse><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"></ellipse></svg>',
            pattern: /(?:react-dom\.production|react\.production\.min\.js|React\.createElement|_jsxDevClass)/i
        },
        {
            name: 'Vue',
            color: '#42b883',
            iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="2 3 12 20 22 3"></polyline><polyline points="6 3 12 13 18 3"></polyline></svg>',
            pattern: /(?:vue\.runtime\.global|createApp\(|__VUE__)/i
        },
        {
            name: 'Angular',
            color: '#dd0031',
            iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 21 5 19 18 12 22 5 18 3 5 12 2"></polygon><polyline points="12 6 8 16 16 16 12 6"></polyline></svg>',
            pattern: /(?:ng-version=|@angular\/core\/fesm)/i
        },
        {
            name: 'Svelte',
            color: '#ff3e00',
            iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2c3 3 7 4 7 9a7 7 0 1 1-14 0c0-5 4-6 7-9z"></path></svg>',
            pattern: /(?:svelte\/internal|__svelte)/i
        },
        {
            name: 'Next.js',
            color: '#ffffff',
            iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 22 20 2 20 12 2"></polygon></svg>',
            pattern: /(?:__NEXT_DATA__|_next\/static\/chunks)/i
        },
        {
            name: 'Nuxt',
            color: '#00dc82',
            iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 18 7-12 7 12H2zm8-5 5-9 7 14h-6"></path></svg>',
            pattern: /(?:__NUXT__|_nuxt\/)/i
        },
        {
            name: 'Tailwind CSS',
            color: '#38bdf8',
            iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 12c2-4 5-4 7-2s4 2 6-2"></path><path d="M3 18c2-4 5-4 7-2s4 2 6-2"></path></svg>',
            pattern: /(?:tailwindcss\.com|tw-bg-|tw-flex)/i
        },
        {
            name: 'Bootstrap',
            color: '#7952b3',
            iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M9 8h4a2 2 0 0 1 0 4H9V8zm0 4h4.5a2 2 0 0 1 0 4H9v-4z"></path></svg>',
            pattern: /(?:bootstrap\.min\.(?:css|js)|cdn\.jsdelivr\.net\/npm\/bootstrap)/i
        },
        {
            name: 'jQuery',
            color: '#0769ad',
            iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v10m-3-3l3 3 3-3"></path></svg>',
            pattern: /(?:jquery-\d+\.\d+\.\d+\.min\.js|jQuery\s*v\d+)/i
        },
        {
            name: 'Vite',
            color: '#646cff',
            iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
            pattern: /(?:@vite\/client)/i
        },
        {
            name: 'Webpack',
            color: '#8dd6f9',
            iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"></rect><polyline points="3 9 12 14 21 9"></polyline><line x1="12" y1="14" x2="12" y2="21"></line></svg>',
            pattern: /(?:webpackJsonp|__webpack_require__)/i
        }
    ],

    detectFile(item) {
        if (!item) return [];
        const detected = [];
        const targetStr = (item.fullUrl || '') + ' ' + (typeof item.content === 'string' ? item.content.slice(0, 25000) : '');

        this.FRAMEWORKS.forEach(fw => {
            if (fw.pattern.test(targetStr)) {
                detected.push(fw);
            }
        });

        return detected;
    },

    detectPage(allData) {
        if (!Array.isArray(allData)) return [];
        const map = new Map();

        allData.forEach(item => {
            const fileBadges = this.detectFile(item);
            fileBadges.forEach(b => map.set(b.name, b));
        });

        return Array.from(map.values());
    }
};

if (typeof globalThis !== 'undefined') globalThis.FrameworkDetector = FrameworkDetector;
if (typeof window !== 'undefined') window.FrameworkDetector = FrameworkDetector;