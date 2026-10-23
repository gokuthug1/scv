// Helper to update tab action state (badge and title) for restricted pages

const ignoreError = () => { void chrome.runtime.lastError; };



const updateTabIndicator = (tab) => {

    if (!tab || !tab.id || !tab.url) return;



    const restrictedPrefixes = [

        'chrome://',

        'edge://',

        'chrome-extension://',

        'https://chrome.google.com/webstore',

        'https://chromewebstore.google.com',

        'view-source:',

        'chrome://extensions'

    ];



    const isRestricted = restrictedPrefixes.some(prefix =>

        tab.url.startsWith(prefix)

    ) || (tab.url.startsWith('about:') && tab.url !== 'about:blank');



    if (isRestricted) {

        chrome.action.setBadgeText({

            text: "N/A",

            tabId: tab.id

        }, ignoreError);



        chrome.action.setBadgeBackgroundColor({

            color: "#7f7f7f",

            tabId: tab.id

        }, ignoreError);



        chrome.action.setTitle({

            title: "Restricted Page - Source Code Viewer cannot read this page",

            tabId: tab.id

        }, ignoreError);

    } else {

        chrome.action.setBadgeText({

            text: "",

            tabId: tab.id

        }, ignoreError);



        chrome.action.setTitle({

            title: "Source Code Viewer",

            tabId: tab.id

        }, ignoreError);

    }

};



// Serialized context menu updater to prevent duplicate ID race conditions on startup

let menuUpdateInProgress = false;

let pendingMenuState = null;



const updateContextMenus = (enable) => {

    if (menuUpdateInProgress) {

        pendingMenuState = enable;

        return;

    }

    menuUpdateInProgress = true;



    chrome.contextMenus.removeAll(() => {

        ignoreError();

        if (enable) {

            chrome.contextMenus.create({

                id: "view-source-code",

                title: "Open Source Code Viewer",

                contexts: ["page", "action"]

            }, ignoreError);



            chrome.contextMenus.create({

                id: "open-side-panel",

                title: "Open in Side Panel",

                contexts: ["page", "action"]

            }, ignoreError);



            chrome.contextMenus.create({

                id: "open-settings",

                title: "Settings",

                contexts: ["page", "action"]

            }, ignoreError);

        }



        menuUpdateInProgress = false;

        if (pendingMenuState !== null) {

            const nextState = pendingMenuState;

            pendingMenuState = null;

            updateContextMenus(nextState);

        }

    });

};



// Centralized popup-window opening logic

const openPopupAsWindow = async (tab) => {

    if (!tab?.id) return;



    const preferredWidth = 720;

    const preferredHeight = 590;

    const instanceId = typeof crypto?.randomUUID === 'function'

        ? crypto.randomUUID()

        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;



    try {

        const currentWin = await chrome.windows.getCurrent();

        const availableWidth = Math.max(520, currentWin.width || preferredWidth);

        const availableHeight = Math.max(420, currentWin.height || preferredHeight);

        const width = Math.min(preferredWidth, availableWidth);

        const height = Math.min(preferredHeight, availableHeight);



        const left = Math.round(

            ((currentWin.width || width) - width) / 2 +

            (currentWin.left || 0)

        );



        const top = Math.round(

            ((currentWin.height || height) - height) / 2 +

            (currentWin.top || 0)

        );



        await chrome.windows.create({

            url: `popup.html?tabId=${tab.id}&instance=${encodeURIComponent(instanceId)}`,

            type: "popup",

            width,

            height,

            left,

            top,

            focused: true

        });

    } catch (err) {

        console.error("Failed to open popup window:", err);

    }

};



// Initialize extension state

const initPopupState = () => {

    chrome.storage.sync.get(

        {

            windowMode: false,

            enableContextMenu: true

        },

        (items) => {

            chrome.action.setPopup({

                popup: items.windowMode ? "" : "popup.html"

            }, ignoreError);



            updateContextMenus(items.enableContextMenu);



            chrome.tabs.query({}, (tabs) => {

                if (chrome.runtime.lastError || !tabs) return;

                tabs.forEach(updateTabIndicator);

            });

        }

    );

};



// Installation/startup

chrome.runtime.onInstalled.addListener(initPopupState);

chrome.runtime.onStartup.addListener(initPopupState);



// Update badge/title when tabs change

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

    if (tab && (changeInfo.status === "complete" || changeInfo.url)) {

        updateTabIndicator(tab);

    }

});



// Update badge/title when active tab changes

chrome.tabs.onActivated.addListener((activeInfo) => {

    chrome.tabs.get(activeInfo.tabId, (tab) => {

        if (chrome.runtime.lastError || !tab) return;

        updateTabIndicator(tab);

    });

});



// Context menu handler

chrome.contextMenus.onClicked.addListener((info, tab) => {

    if (info.menuItemId === "view-source-code") {

        openPopupAsWindow(tab);

    } else if (info.menuItemId === "open-side-panel") {

        if (tab?.id && chrome.sidePanel) {

            chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});

        }

    } else if (info.menuItemId === "open-settings") {

        chrome.runtime.openOptionsPage();

    }

});



// Action button click handler (fires when popup is set to "")

chrome.action.onClicked.addListener(openPopupAsWindow);



// Sync settings dynamically

chrome.storage.onChanged.addListener((changes, area) => {

    if (area !== "sync") return;



    if (changes.windowMode) {

        chrome.action.setPopup({

            popup: changes.windowMode.newValue ? "" : "popup.html"

        }, ignoreError);

    }



    if (changes.enableContextMenu) {

        updateContextMenus(changes.enableContextMenu.newValue);

    }

});
