// =====================================
// FOCUS TRACKER 2.0 - POPUP.JS
// =====================================

// TIMER
let focusDuration = 25;
let breakDuration = 5;
let timerSeconds = focusDuration * 60;
let timerRunning = false;
let timerInterval = null;
let timerMode = "focus";

// TRACKING DATA
let focusTime = 0;
let breakTime = 0;
let sessions = 0;
let timeLimit = 120;
let tasks = [];
let websiteUsage = {};

// GET ELEMENT
function getElement(id) {
    return document.getElementById(id);
}

// LOAD DATA
function loadData() {
    chrome.storage.local.get(
        [
            "focusTime",
            "breakTime",
            "sessions",
            "timeLimit",
            "focusDuration",
            "breakDuration",
            "tasks",
            "websiteUsage"
        ],
        function (data) {
            focusTime = Number(data.focusTime) || 0;
            breakTime = Number(data.breakTime) || 0;
            sessions = Number(data.sessions) || 0;
            timeLimit = Number(data.timeLimit) || 120;
            focusDuration = Number(data.focusDuration) || 25;
            breakDuration = Number(data.breakDuration) || 5;

            tasks = Array.isArray(data.tasks) ? data.tasks : [];

            websiteUsage =
                data.websiteUsage &&
                typeof data.websiteUsage === "object"
                    ? data.websiteUsage
                    : {};

            const limitInput = getElement("timeLimit");
            const focusInput = getElement("focusDurationInput");
            const breakInput = getElement("breakDurationInput");

            if (limitInput) {
                limitInput.value = timeLimit;
            }

            if (focusInput) {
                focusInput.value = focusDuration;
            }

            if (breakInput) {
                breakInput.value = breakDuration;
            }

            // IMPORTANT: Load the saved duration into the timer.
            timerSeconds =
                (timerMode === "focus" ? focusDuration : breakDuration) * 60;

            updateTimer();
            renderTasks();
            updateStats();
            updateWebsiteUsage();
        }
    );
}

// CURRENT WEBSITE
function updateCurrentWebsite() {
    const websiteElement = getElement("website");

    if (!websiteElement) return;

    chrome.tabs.query(
        { active: true, currentWindow: true },
        function (tabs) {
            if (!tabs || !tabs.length || !tabs[0].url) {
                websiteElement.innerText = "Unknown website";
                return;
            }

            try {
                const url = new URL(tabs[0].url);
                websiteElement.innerText =
                    url.hostname || "Unknown website";
            } catch (error) {
                websiteElement.innerText = "Unknown website";
            }
        }
    );
}

// TIMER DISPLAY
function updateTimer() {
    const timerElement = getElement("timer");
    const modeElement = getElement("mode");

    if (timerElement) {
        const minutes = Math.floor(timerSeconds / 60);
        const seconds = timerSeconds % 60;

        timerElement.innerText =
            String(minutes).padStart(2, "0") +
            ":" +
            String(seconds).padStart(2, "0");
    }

    if (modeElement) {
        modeElement.innerText =
            timerMode === "focus"
                ? "Focus Session"
                : "Break Session";
    }
}

// START TIMER
function startTimer() {
    if (timerRunning) return;

    timerRunning = true;

    timerInterval = setInterval(function () {
        if (timerSeconds > 0) {
            timerSeconds--;

            if (timerMode === "focus") {
                focusTime++;
                chrome.storage.local.set({ focusTime: focusTime });
            } else {
                breakTime++;
                chrome.storage.local.set({ breakTime: breakTime });
            }

            updateTimer();
            updateStats();
        } else {
            completeTimer();
        }
    }, 1000);
}

// PAUSE TIMER
function pauseTimer() {
    timerRunning = false;

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// RESET TIMER
function resetTimer() {
    pauseTimer();

    timerSeconds =
        (timerMode === "focus" ? focusDuration : breakDuration) * 60;

    updateTimer();
}

// COMPLETE TIMER
function completeTimer() {
    pauseTimer();

    if (timerMode === "focus") {
        sessions++;
        chrome.storage.local.set({ sessions: sessions });

        timerMode = "break";
        timerSeconds = breakDuration * 60;
    } else {
        timerMode = "focus";
        timerSeconds = focusDuration * 60;
    }

    updateTimer();
    updateStats();
}

// CUSTOM TIMER DURATIONS
function createDurationControls() {
    const timerSection = document.querySelector(".timer-section");

    if (!timerSection || getElement("durationSettings")) return;

    const settings = document.createElement("div");
    settings.id = "durationSettings";
    settings.style.marginTop = "12px";
    settings.style.padding = "10px";
    settings.style.borderRadius = "8px";
    settings.style.background = "rgba(127, 127, 127, 0.12)";

    const heading = document.createElement("h3");
    heading.innerText = "⏱ Timer Durations";
    heading.style.margin = "0 0 8px";
    settings.appendChild(heading);

    const focusLabel = document.createElement("label");
    focusLabel.htmlFor = "focusDurationInput";
    focusLabel.innerText = "Focus (minutes) ";

    const focusInput = document.createElement("input");
    focusInput.type = "number";
    focusInput.id = "focusDurationInput";
    focusInput.min = "1";
    focusInput.max = "180";
    focusInput.value = String(focusDuration);
    focusInput.style.width = "60px";
    focusInput.style.margin = "4px 8px 8px 0";

    focusLabel.appendChild(focusInput);
    settings.appendChild(focusLabel);

    const breakLabel = document.createElement("label");
    breakLabel.htmlFor = "breakDurationInput";
    breakLabel.innerText = "Break (minutes) ";

    const breakInput = document.createElement("input");
    breakInput.type = "number";
    breakInput.id = "breakDurationInput";
    breakInput.min = "1";
    breakInput.max = "60";
    breakInput.value = String(breakDuration);
    breakInput.style.width = "60px";
    breakInput.style.margin = "4px 0 8px";

    breakLabel.appendChild(breakInput);
    settings.appendChild(breakLabel);

    const saveButton = document.createElement("button");
    saveButton.id = "saveDurations";
    saveButton.innerText = "Save Durations";
    saveButton.style.display = "block";
    saveButton.style.marginTop = "6px";
    settings.appendChild(saveButton);

    const savedMessage = document.createElement("p");
    savedMessage.id = "durationsSaved";
    savedMessage.style.margin = "6px 0 0";
    settings.appendChild(savedMessage);

    timerSection.appendChild(settings);
    saveButton.addEventListener("click", saveTimerDurations);
}

// SAVE TIMER DURATIONS
function saveTimerDurations() {
    const focusInput = getElement("focusDurationInput");
    const breakInput = getElement("breakDurationInput");
    const message = getElement("durationsSaved");

    if (!focusInput || !breakInput) return;

    let newFocusDuration = parseInt(focusInput.value, 10);
    let newBreakDuration = parseInt(breakInput.value, 10);

    if (!Number.isFinite(newFocusDuration)) newFocusDuration = 25;
    if (!Number.isFinite(newBreakDuration)) newBreakDuration = 5;

    newFocusDuration = Math.min(180, Math.max(1, newFocusDuration));
    newBreakDuration = Math.min(60, Math.max(1, newBreakDuration));

    focusInput.value = newFocusDuration;
    breakInput.value = newBreakDuration;

    focusDuration = newFocusDuration;
    breakDuration = newBreakDuration;

    chrome.storage.local.set(
        {
            focusDuration: focusDuration,
            breakDuration: breakDuration
        },
        function () {
            if (message) {
                message.innerText = "✓ Timer durations saved";
            }

            if (!timerRunning) {
                timerSeconds =
                    (timerMode === "focus" ? focusDuration : breakDuration) * 60;
                updateTimer();
            }
        }
    );
}

// DAILY GOAL
function setDailyGoal() {
    const input = getElement("timeLimit");
    const message = getElement("goalSaved");

    if (!input) return;

    let value = parseInt(input.value, 10);

    if (isNaN(value) || value < 15) {
        value = 15;
        input.value = 15;
    }

    timeLimit = value;

    chrome.storage.local.set({ timeLimit: timeLimit }, function () {
        if (message) {
            message.innerText = "✓ Goal saved: " + timeLimit + " minutes";
        }

        updateStats();
    });
}

// PRODUCTIVITY SCORE
function calculateScore() {
    const goalSeconds = timeLimit * 60;
    let score = 0;

    if (goalSeconds > 0) {
        score = (focusTime / goalSeconds) * 100;
    }

    const completedTasks = tasks.filter(function (task) {
        return task.completed === true;
    }).length;

    score += completedTasks * 5;

    return Math.round(Math.min(100, Math.max(0, score)));
}

// UPDATE STATISTICS
function updateStats() {
    const score = calculateScore();
    const scoreElement = getElement("score");
    const progressBar = getElement("progressBar");
    const statusText = getElement("statusText");

    if (scoreElement) scoreElement.innerText = score + "%";
    if (progressBar) progressBar.style.width = score + "%";

    if (statusText) {
        if (focusTime >= timeLimit * 60) {
            statusText.innerText = "🎉 Daily Goal Completed";
        } else {
            const remaining = timeLimit * 60 - focusTime;
            const minutesRemaining = Math.ceil(remaining / 60);
            statusText.innerText =
                "⏳ " + minutesRemaining + " min remaining";
        }
    }

    const statFocus = getElement("statFocus");
    const statBreak = getElement("statBreak");
    const statSessions = getElement("statSessions");
    const statTasks = getElement("statTasks");

    if (statFocus) statFocus.innerText = formatTime(focusTime);
    if (statBreak) statBreak.innerText = formatTime(breakTime);
    if (statSessions) statSessions.innerText = sessions;
    if (statTasks) statTasks.innerText = tasks.length;
}

// FORMAT TIME
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );
}

// WEBSITE USAGE
function updateWebsiteUsage() {
    const usageList = getElement("usageList");

    if (!usageList) return;

    if (!websiteUsage || Object.keys(websiteUsage).length === 0) {
        usageList.innerText = "No usage data yet.";
        return;
    }

    const websites = Object.entries(websiteUsage);
    websites.sort(function (a, b) {
        return b[1] - a[1];
    });

    usageList.innerHTML = "";

    websites.forEach(function (item) {
        const website = item[0];
        const seconds = Number(item[1]) || 0;
        const minutes = Math.floor(seconds / 60);

        const row = document.createElement("div");
        row.className = "usage-item";
        row.innerText = website + " - " + minutes + " min";
        usageList.appendChild(row);
    });
}

// TASKS
function addTask() {
    const input = getElement("taskInput");

    if (!input) return;

    const text = input.value.trim();
    if (text === "") return;

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

// SAVE TASKS
function saveTasks() {
    chrome.storage.local.set({ tasks: tasks });
}

// RENDER TASKS
function renderTasks() {
    const taskList = getElement("taskList");

    if (!taskList) return;

    taskList.innerHTML = "";

    tasks.forEach(function (task) {
        const li = document.createElement("li");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.completed;

        checkbox.addEventListener("change", function () {
            task.completed = checkbox.checked;
            saveTasks();
            updateStats();
            renderTasks();
        });

        const span = document.createElement("span");
        span.innerText = task.text;

        if (task.completed) {
            span.style.textDecoration = "line-through";
        }

        const deleteButton = document.createElement("button");
        deleteButton.innerText = "Delete";

        deleteButton.addEventListener("click", function () {
            tasks = tasks.filter(function (t) {
                return t.id !== task.id;
            });

            saveTasks();
            renderTasks();
            updateStats();
        });

        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(deleteButton);
        taskList.appendChild(li);
    });
}

// BUTTON EVENTS
document.addEventListener("DOMContentLoaded", function () {
    const startBtn = getElement("startBtn");
    const pauseBtn = getElement("pauseBtn");
    const resetBtn = getElement("resetBtn");
    const saveLimit = getElement("saveLimit");
    const addTaskButton = getElement("addTask");

    if (startBtn) startBtn.addEventListener("click", startTimer);
    if (pauseBtn) pauseBtn.addEventListener("click", pauseTimer);
    if (resetBtn) resetBtn.addEventListener("click", resetTimer);
    if (saveLimit) saveLimit.addEventListener("click", setDailyGoal);
    if (addTaskButton) addTaskButton.addEventListener("click", addTask);

    const taskInput = getElement("taskInput");

    if (taskInput) {
        taskInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter") addTask();
        });
    }

    createDurationControls();
    loadData();
    updateCurrentWebsite();
    updateTimer();

    setInterval(updateCurrentWebsite, 2000);
});

// STORAGE LISTENER
chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== "local") return;

    if (changes.websiteUsage) {
        websiteUsage = changes.websiteUsage.newValue || {};
        updateWebsiteUsage();
    }

    if (changes.focusTime) {
        focusTime = Number(changes.focusTime.newValue) || 0;
        updateStats();
    }

    if (changes.breakTime) {
        breakTime = Number(changes.breakTime.newValue) || 0;
        updateStats();
    }

    if (changes.sessions) {
        sessions = Number(changes.sessions.newValue) || 0;
        updateStats();
    }
});
