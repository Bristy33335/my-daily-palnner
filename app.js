const taskNameInput = document.getElementById("taskName");
const durationInput = document.getElementById("duration");
const priorityInput = document.getElementById("priority");
const fixedTimeInput = document.getElementById("fixedTime");

const addTaskButton = document.getElementById("addTaskButton");
const clearButton = document.getElementById("clearButton");

const scheduleContainer = document.getElementById("schedule");
const warningContainer = document.getElementById("warning");

const fixedTimeContainer =
    document.getElementById("fixedTimeContainer");

let tasks = JSON.parse(
    localStorage.getItem("dailyPlannerTasks") || "[]"
);


// ------------------------------------
// TASK TYPE RADIO BUTTONS
// ------------------------------------

document
    .querySelectorAll('input[name="taskType"]')
    .forEach(radio => {

        radio.addEventListener("change", () => {

            const selected =
                document.querySelector(
                    'input[name="taskType"]:checked'
                ).value;

            if (selected === "fixed") {
                fixedTimeContainer.style.display = "block";
            } else {
                fixedTimeContainer.style.display = "none";
            }

        });

    });


// ------------------------------------
// SAVE TASKS
// ------------------------------------

function saveTasks() {

    localStorage.setItem(
        "dailyPlannerTasks",
        JSON.stringify(tasks)
    );

}


// ------------------------------------
// TIME HELPERS
// ------------------------------------

function timeToMinutes(time) {

    const [hours, minutes] = time.split(":").map(Number);

    return hours * 60 + minutes;

}


function minutesToTime(totalMinutes) {

    totalMinutes = totalMinutes % (24 * 60);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return (
        String(hours).padStart(2, "0")
        + ":" +
        String(minutes).padStart(2, "0")
    );

}


function formatTime(time) {

    let [hours, minutes] = time.split(":").map(Number);

    const suffix = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;

    if (hours === 0) {
        hours = 12;
    }

    return `${hours}:${String(minutes).padStart(2, "0")} ${suffix}`;

}


// ------------------------------------
// ADD TASK
// ------------------------------------

addTaskButton.addEventListener("click", () => {

    const name = taskNameInput.value.trim();

    const duration =
        parseInt(durationInput.value);

    const priority =
        parseInt(priorityInput.value);

    const type =
        document.querySelector(
            'input[name="taskType"]:checked'
        ).value;

    const fixedTime =
        fixedTimeInput.value;


    if (!name) {

        alert("Please enter a task name.");

        return;

    }


    if (!duration || duration <= 0) {

        alert("Please enter a valid duration.");

        return;

    }


    if (type === "fixed" && !fixedTime) {

        alert("Please select a fixed start time.");

        return;

    }


    const task = {

        id: Date.now(),

        name: name,

        duration: duration,

        priority: priority,

        type: type,

        fixedTime:
            type === "fixed"
                ? fixedTime
                : null

    };


    tasks.push(task);

    saveTasks();

    renderSchedule();

    taskNameInput.value = "";

    durationInput.value = "";

    fixedTimeInput.value = "";

});


// ------------------------------------
// DELETE TASK
// ------------------------------------

function deleteTask(id) {

    tasks = tasks.filter(task => task.id !== id);

    saveTasks();

    renderSchedule();

}


// ------------------------------------
// FIND FREE SLOT
// ------------------------------------

function findFreeSlot(
    duration,
    occupiedSlots
) {

    const sortedSlots =
        [...occupiedSlots].sort(
            (a, b) => a.start - b.start
        );


    let currentTime = 0;


    for (const slot of sortedSlots) {

        if (
            slot.start - currentTime
            >= duration
        ) {

            return currentTime;

        }

        if (slot.end > currentTime) {

            currentTime = slot.end;

        }

    }


    if (
        1440 - currentTime
        >= duration
    ) {

        return currentTime;

    }


    return null;

}


// ------------------------------------
// CREATE DAILY SCHEDULE
// ------------------------------------

function createSchedule() {

    const fixedTasks =
        tasks.filter(
            task => task.type === "fixed"
        );


    const flexibleTasks =
        tasks.filter(
            task => task.type === "flexible"
        );


    const schedule = [];

    const occupiedSlots = [];

    const warnings = [];


    // --------------------------------
    // PLACE FIXED TASKS
    // --------------------------------

    fixedTasks.forEach(task => {

        const start =
            timeToMinutes(task.fixedTime);

        const end =
            start + task.duration;


        const conflict =
            occupiedSlots.some(slot =>
                start < slot.end &&
                end > slot.start
            );


        if (conflict) {

            warnings.push(
                `Fixed task "${task.name}" conflicts with another fixed task.`
            );

        }


        occupiedSlots.push({

            start: start,

            end: end

        });


        schedule.push({

            ...task,

            start: start,

            end: end

        });

    });


    // --------------------------------
    // SORT FLEXIBLE TASKS
    // --------------------------------

    flexibleTasks.sort((a, b) => {

        if (b.priority !== a.priority) {

            return b.priority - a.priority;

        }

        return b.duration - a.duration;

    });


    // --------------------------------
    // PLACE FLEXIBLE TASKS
    // --------------------------------

    flexibleTasks.forEach(task => {

        const start =
            findFreeSlot(
                task.duration,
                occupiedSlots
            );


        if (start === null) {

            warnings.push(
                `"${task.name}" could not fit into the day.`
            );

            return;

        }


        const end =
            start + task.duration;


        occupiedSlots.push({

            start: start,

            end: end

        });


        schedule.push({

            ...task,

            start: start,

            end: end

        });

    });


    // --------------------------------
    // SORT FINAL SCHEDULE
    // --------------------------------

    schedule.sort(
        (a, b) => a.start - b.start
    );


    return {
        schedule,
        warnings
    };

}


// ------------------------------------
// DISPLAY SCHEDULE
// ------------------------------------

function renderSchedule() {

    const result =
        createSchedule();


    scheduleContainer.innerHTML = "";

    warningContainer.innerHTML = "";


    // WARNINGS

    if (result.warnings.length > 0) {

        const warningBox =
            document.createElement("div");

        warningBox.className = "warning";

        warningBox.innerHTML =
            result.warnings
                .map(warning => `<div>⚠️ ${warning}</div>`)
                .join("");

        warningContainer.appendChild(
            warningBox
        );

    }


    // EMPTY STATE

    if (result.schedule.length === 0) {

        scheduleContainer.innerHTML = `
            <div class="empty">
                No tasks yet.<br>
                Add your first task above.
            </div>
        `;

        return;

    }


    // DISPLAY TASKS

    result.schedule.forEach(task => {

        const item =
            document.createElement("div");

        item.className = "schedule-item";


        const startTime =
            minutesToTime(task.start);

        const endTime =
            minutesToTime(task.end);


        const badge =
            task.type === "fixed"

                ? `<span class="fixed-badge">Fixed</span>`

                : `<span class="flexible-badge">Flexible</span>`;


        const priorityText =

            task.priority === 3
                ? "High priority"

            : task.priority === 2
                ? "Medium priority"

            : "Low priority";


        item.innerHTML = `

            <div class="time">

                ${formatTime(startTime)}
                <br>
                ↓
                <br>
                ${formatTime(endTime)}

            </div>


            <div class="task-info">

                <div class="task-name">

                    ${escapeHTML(task.name)}

                    ${badge}

                </div>


                <div class="task-details">

                    ${task.duration} minutes
                    •
                    ${priorityText}

                </div>

            </div>


            <button
                class="delete-button"
                onclick="deleteTask(${task.id})"
            >
                🗑 Delete
            </button>

        `;


        scheduleContainer.appendChild(item);

    });

}


// ------------------------------------
// SECURITY / TEXT ESCAPING
// ------------------------------------

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}


// ------------------------------------
// CLEAR EVERYTHING
// ------------------------------------

clearButton.addEventListener(
    "click",
    () => {

        if (tasks.length === 0) {
            return;
        }


        const confirmed =
            confirm(
                "Delete all tasks?"
            );


        if (!confirmed) {
            return;
        }


        tasks = [];

        saveTasks();

        renderSchedule();

    }
);


// ------------------------------------
// SERVICE WORKER
// ------------------------------------

if ("serviceWorker" in navigator) {

    window.addEventListener(
        "load",
        () => {

            navigator.serviceWorker
                .register("./sw.js")
                .then(() => {

                    console.log(
                        "Service worker registered."
                    );

                })
                .catch(error => {

                    console.log(
                        "Service worker registration failed:",
                        error
                    );

                });

        }
    );

}


// ------------------------------------
// INITIAL DISPLAY
// ------------------------------------

renderSchedule();