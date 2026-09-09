// =====================================
// FOCUS TRACKER 2.0
// BACKGROUND.JS
// =====================================

let activeTabId = null;
let activeHostname = null;
let lastUpdateTime = Date.now();


// =====================================
// GET WEBSITE HOSTNAME
// =====================================

function getHostname(url) {

    if (!url) {
        return null;
    }

    try {

        const parsedURL =
            new URL(url);

        const protocol =
            parsedURL.protocol;

        // Do not track Chrome internal pages
        if (
            protocol === "chrome:" ||
            protocol === "chrome-extension:" ||
            protocol === "edge:" ||
            protocol === "about:"
        ) {

            return null;
        }

        return parsedURL.hostname || null;

    } catch (error) {

        return null;
    }
}


// =====================================
// SAVE CURRENT WEBSITE TIME
// =====================================

async function saveCurrentWebsiteTime() {

    if (!activeHostname) {
        return;
    }

    const now =
        Date.now();

    const elapsed =
        Math.floor(
            (now - lastUpdateTime) / 1000
        );

    if (elapsed <= 0) {
        return;
    }

    const data =
        await chrome.storage.local.get(
            ["websiteUsage"]
        );

    const usage =
        data.websiteUsage || {};

    usage[activeHostname] =
        (Number(usage[activeHostname]) || 0)
        + elapsed;

    await chrome.storage.local.set({
        websiteUsage: usage
    });

    lastUpdateTime =
        now;
}


// =====================================
// CHANGE ACTIVE TAB
// =====================================

async function updateActiveTab(tabId) {

    await saveCurrentWebsiteTime();

    activeTabId =
        tabId;

    try {

        const tab =
            await chrome.tabs.get(tabId);

        activeHostname =
            getHostname(tab.url);

    } catch (error) {

        activeHostname =
            null;
    }

    lastUpdateTime =
        Date.now();
}


// =====================================
// ACTIVE TAB CHANGED
// =====================================

chrome.tabs.onActivated.addListener(
    async function(activeInfo) {

        await updateActiveTab(
            activeInfo.tabId
        );
    }
);


// =====================================
// TAB URL CHANGED
// =====================================

chrome.tabs.onUpdated.addListener(
    async function(
        tabId,
        changeInfo,
        tab
    ) {

        if (
            tabId !== activeTabId ||
            !changeInfo.url
        ) {
            return;
        }

        await saveCurrentWebsiteTime();

        activeHostname =
            getHostname(tab.url);

        lastUpdateTime =
            Date.now();
    }
);


// =====================================
// WINDOW FOCUS CHANGED
// =====================================

chrome.windows.onFocusChanged.addListener(
    async function(windowId) {

        await saveCurrentWebsiteTime();

        if (
            windowId ===
            chrome.windows.WINDOW_ID_NONE
        ) {

            activeHostname =
                null;

            activeTabId =
                null;

            lastUpdateTime =
                Date.now();

            return;
        }

        try {

            const tabs =
                await chrome.tabs.query({
                    active: true,
                    windowId: windowId
                });

            if (
                tabs.length > 0
            ) {

                activeTabId =
                    tabs[0].id;

                activeHostname =
                    getHostname(
                        tabs[0].url
                    );
            }

        } catch (error) {

            activeHostname =
                null;
        }

        lastUpdateTime =
            Date.now();
    }
);


// =====================================
// PERIODIC SAVE
// =====================================

chrome.alarms.create(
    "websiteTracker",
    {
        periodInMinutes: 1
    }
);


chrome.alarms.onAlarm.addListener(
    async function(alarm) {

        if (
            alarm.name ===
            "websiteTracker"
        ) {

            await saveCurrentWebsiteTime();

        }
    }
);


// =====================================
// INITIALIZE
// =====================================

async function initializeTracker() {

    try {

        const tabs =
            await chrome.tabs.query({
                active: true,
                lastFocusedWindow: true
            });

        if (
            tabs.length > 0
        ) {

            activeTabId =
                tabs[0].id;

            activeHostname =
                getHostname(
                    tabs[0].url
                );
        }

    } catch (error) {

        activeHostname =
            null;
    }

    lastUpdateTime =
        Date.now();
}


initializeTracker();


// =====================================
// SAVE WHEN SERVICE WORKER STOPS
// =====================================

self.addEventListener(
    "beforeunload",
    function() {

        saveCurrentWebsiteTime();
    }
);
