// =====================================
// FOCUS TRACKER 2.0 - POPUP.JS
// =====================================

// -----------------------------
// TIMER
// -----------------------------

let timerSeconds = 25 * 60;
let timerRunning = false;
let timerInterval = null;
let timerMode = "focus";

// -----------------------------
// TRACKING DATA
// -----------------------------

let focusTime = 0;
let breakTime = 0;
let sessions = 0;

// Daily goal
let timeLimit = 120;

// Tasks
let tasks = [];

// Website usage
let websiteUsage = {};


// =====================================
// GET ELEMENT
// =====================================

function getElement(id) {
    return document.getElementById(id);
}


// =====================================
// LOAD DATA
// =====================================

function loadData() {

    chrome.storage.local.get(
        [
            "focusTime",
            "breakTime",
            "sessions",
            "timeLimit",
            "tasks",
            "websiteUsage"
        ],
        function(data) {

            focusTime = Number(data.focusTime) || 0;
            breakTime = Number(data.breakTime) || 0;
            sessions = Number(data.sessions) || 0;

            timeLimit = Number(data.timeLimit) || 120;

            tasks = Array.isArray(data.tasks)
                ? data.tasks
                : [];

            websiteUsage =
                data.websiteUsage &&
                typeof data.websiteUsage === "object"
                    ? data.websiteUsage
                    : {};

            const limitInput = getElement("timeLimit");

            if (limitInput) {
                limitInput.value = timeLimit;
            }

            renderTasks();
            updateStats();
            updateWebsiteUsage();
        }
    );
}


// =====================================
// CURRENT WEBSITE
// =====================================

function updateCurrentWebsite() {

    const websiteElement = getElement("website");

    if (!websiteElement) {
        return;
    }

    chrome.tabs.query(
        {
            active: true,
            currentWindow: true
        },
        function(tabs) {

            if (!tabs || tabs.length === 0) {

                websiteElement.innerText =
                    "Unknown website";

                return;
            }

            const tab = tabs[0];

            if (!tab.url) {

                websiteElement.innerText =
                    "Unknown website";

                return;
            }

            try {

                const url = new URL(tab.url);

                let hostname = url.hostname;

                if (!hostname) {

                    hostname = "Unknown website";

                }

                websiteElement.innerText = hostname;

            } catch (error) {

                websiteElement.innerText =
                    "Unknown website";

            }
        }
    );
}


// =====================================
// TIMER DISPLAY
// =====================================

function updateTimer() {

    const timerElement = getElement("timer");
    const modeElement = getElement("mode");

    if (!timerElement) {
        return;
    }

    const minutes =
        Math.floor(timerSeconds / 60);

    const seconds =
        timerSeconds % 60;

    timerElement.innerText =
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0");

    if (modeElement) {

        if (timerMode === "focus") {

            modeElement.innerText =
                "Focus Session";

        } else {

            modeElement.innerText =
                "Break Session";

        }
    }
}


// =====================================
// START TIMER
// =====================================

function startTimer() {

    if (timerRunning) {
        return;
    }

    timerRunning = true;

    timerInterval = setInterval(
        function() {

            if (timerSeconds > 0) {

                timerSeconds--;

                if (timerMode === "focus") {

                    focusTime++;

                    chrome.storage.local.set({
                        focusTime: focusTime
                    });

                } else {

                    breakTime++;

                    chrome.storage.local.set({
                        breakTime: breakTime
                    });
                }

                updateTimer();
                updateStats();

            } else {

                completeTimer();

            }

        },
        1000
    );
}


// =====================================
// PAUSE TIMER
// =====================================

function pauseTimer() {

    timerRunning = false;

    if (timerInterval) {

        clearInterval(timerInterval);

        timerInterval = null;
    }
}


// =====================================
// RESET TIMER
// =====================================

function resetTimer() {

    pauseTimer();

    if (timerMode === "focus") {

        timerSeconds = 25 * 60;

    } else {

        timerSeconds = 5 * 60;

    }

    updateTimer();
}


// =====================================
// COMPLETE TIMER
// =====================================

function completeTimer() {

    pauseTimer();

    if (timerMode === "focus") {

        sessions++;

        chrome.storage.local.set({
            sessions: sessions
        });

        timerMode = "break";
        timerSeconds = 5 * 60;

    } else {

        timerMode = "focus";
        timerSeconds = 25 * 60;

    }

    updateTimer();
    updateStats();
}


// =====================================
// DAILY GOAL
// =====================================

function setDailyGoal() {

    const input =
        getElement("timeLimit");

    const message =
        getElement("goalSaved");

    if (!input) {
        return;
    }

    let value =
        parseInt(input.value, 10);

    if (isNaN(value) || value < 15) {

        value = 15;

        input.value = 15;
    }

    timeLimit = value;

    chrome.storage.local.set(
        {
            timeLimit: timeLimit
        },
        function() {

            if (message) {

                message.innerText =
                    "✓ Goal saved: " +
                    timeLimit +
                    " minutes";

            }

            updateStats();
        }
    );
}


// =====================================
// PRODUCTIVITY SCORE
// =====================================

function calculateScore() {

    const goalSeconds =
        timeLimit * 60;

    let score = 0;

    if (goalSeconds > 0) {

        score =
            (focusTime / goalSeconds) * 100;

    }

    // Task bonus
    const completedTasks =
        tasks.filter(
            function(task) {
                return task.completed === true;
            }
        ).length;

    score =
        score +
        (completedTasks * 5);

    if (score > 100) {
        score = 100;
    }

    if (score < 0) {
        score = 0;
    }

    return Math.round(score);
}


// =====================================
// UPDATE STATISTICS
// =====================================

function updateStats() {

    const score =
        calculateScore();

    const scoreElement =
        getElement("score");

    const progressBar =
        getElement("progressBar");

    const statusText =
        getElement("statusText");

    if (scoreElement) {

        scoreElement.innerText =
            score + "%";
    }

    if (progressBar) {

        progressBar.style.width =
            score + "%";
    }

    if (statusText) {

        if (focusTime >= timeLimit * 60) {

            statusText.innerText =
                "🎉 Daily Goal Completed";

        } else {

            const remaining =
                (timeLimit * 60) - focusTime;

            const minutesRemaining =
                Math.ceil(remaining / 60);

            statusText.innerText =
                "⏳ " +
                minutesRemaining +
                " min remaining";
        }
    }

    // Optional elements
    const statFocus =
        getElement("statFocus");

    const statBreak =
        getElement("statBreak");

    const statSessions =
        getElement("statSessions");

    const statTasks =
        getElement("statTasks");

    if (statFocus) {

        statFocus.innerText =
            formatTime(focusTime);
    }

    if (statBreak) {

        statBreak.innerText =
            formatTime(breakTime);
    }

    if (statSessions) {

        statSessions.innerText =
            sessions;
    }

    if (statTasks) {

        statTasks.innerText =
            tasks.length;
    }
}


// =====================================
// FORMAT TIME
// =====================================

function formatTime(seconds) {

    const minutes =
        Math.floor(seconds / 60);

    const remainingSeconds =
        seconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );
}


// =====================================
// WEBSITE USAGE
// =====================================

function updateWebsiteUsage() {

    const usageList =
        getElement("usageList");

    if (!usageList) {
        return;
    }

    if (
        !websiteUsage ||
        Object.keys(websiteUsage).length === 0
    ) {

        usageList.innerText =
            "No usage data yet.";

        return;
    }

    const websites =
        Object.entries(websiteUsage);

    websites.sort(
        function(a, b) {
            return b[1] - a[1];
        }
    );

    usageList.innerHTML = "";

    websites.forEach(
        function(item) {

            const website =
                item[0];

            const seconds =
                Number(item[1]) || 0;

            const minutes =
                Math.floor(seconds / 60);

            const row =
                document.createElement("div");

            row.className =
                "usage-item";

            row.innerText =
                website +
                " - " +
                minutes +
                " min";

            usageList.appendChild(row);
        }
    );
}


// =====================================
// TASKS
// =====================================

function addTask() {

    const input =
        getElement("taskInput");

    if (!input) {
        return;
    }

    const text =
        input.value.trim();

    if (text === "") {
        return;
    }

    tasks.push({
        id: Date.now(),
        text: text,
        completed: false
    });

    input.value = "";

    saveTasks();
    renderTasks();
    updateStats();
}


// =====================================
// SAVE TASKS
// =====================================

function saveTasks() {

    chrome.storage.local.set({
        tasks: tasks
    });
}


// =====================================
// RENDER TASKS
// =====================================

function renderTasks() {

    const taskList =
        getElement("taskList");

    if (!taskList) {
        return;
    }

    taskList.innerHTML = "";

    tasks.forEach(
        function(task) {

            const li =
                document.createElement("li");

            const checkbox =
                document.createElement("input");

            checkbox.type =
                "checkbox";

            checkbox.checked =
                task.completed;

            checkbox.addEventListener(
                "change",
                function() {

                    task.completed =
                        checkbox.checked;

                    saveTasks();
                    updateStats();
                    renderTasks();
                }
            );

            const span =
                document.createElement("span");

            span.innerText =
                task.text;

            if (task.completed) {

                span.style.textDecoration =
                    "line-through";
            }

            const deleteButton =
                document.createElement("button");

            deleteButton.innerText =
                "Delete";

            deleteButton.addEventListener(
                "click",
                function() {

                    tasks =
                        tasks.filter(
                            function(t) {
                                return t.id !== task.id;
                            }
                        );

                    saveTasks();
                    renderTasks();
                    updateStats();
                }
            );

            li.appendChild(checkbox);
            li.appendChild(span);
            li.appendChild(deleteButton);

            taskList.appendChild(li);
        }
    );
}


// =====================================
// BUTTON EVENTS
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const startBtn =
            getElement("startBtn");

        const pauseBtn =
            getElement("pauseBtn");

        const resetBtn =
            getElement("resetBtn");

        const saveLimit =
            getElement("saveLimit");

        const addTaskButton =
            getElement("addTask");

        if (startBtn) {

            startBtn.addEventListener(
                "click",
                startTimer
            );
        }

        if (pauseBtn) {

            pauseBtn.addEventListener(
                "click",
                pauseTimer
            );
        }

        if (resetBtn) {

            resetBtn.addEventListener(
                "click",
                resetTimer
            );
        }

        if (saveLimit) {

            saveLimit.addEventListener(
                "click",
                setDailyGoal
            );
        }

        if (addTaskButton) {

            addTaskButton.addEventListener(
                "click",
                addTask
            );
        }

        const taskInput =
            getElement("taskInput");

        if (taskInput) {

            taskInput.addEventListener(
                "keydown",
                function(event) {

                    if (event.key === "Enter") {

                        addTask();
                    }
                }
            );
        }

        loadData();
        updateCurrentWebsite();
        updateTimer();

        // Refresh website
        // every 2 seconds while popup is open
        setInterval(
            updateCurrentWebsite,
            2000
        );
    }
);


// =====================================
// STORAGE LISTENER
// =====================================

chrome.storage.onChanged.addListener(
    function(changes, areaName) {

        if (areaName !== "local") {
            return;
        }

        if (changes.websiteUsage) {

            websiteUsage =
                changes.websiteUsage.newValue || {};

            updateWebsiteUsage();
        }

        if (changes.focusTime) {

            focusTime =
                Number(changes.focusTime.newValue) || 0;

            updateStats();
        }

        if (changes.breakTime) {

            breakTime =
                Number(changes.breakTime.newValue) || 0;

            updateStats();
        }

        if (changes.sessions) {

            sessions =
                Number(changes.sessions.newValue) || 0;

            updateStats();
        }
    }
);
