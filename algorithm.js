function readTextFile(file) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();

        reader.onload = () => {
            let data = reader.result;
            let lines = data.split('\n');
            let processes = [];
            for (let i = 1; i < lines.length; i++) {
                let [name, arrival, burst, priority, queue] = lines[i].split(' ');
                processes.push({ name, arrival: parseInt(arrival), burst: parseInt(burst), priority: parseInt(priority), queue: parseInt(queue) });
            }
            resolve(processes);
        };
    
        reader.onerror = () => {
            reject(reader.error);
        }
        reader.readAsText(file);
    });
}
// function fcfs(processes) {
//     return processes.sort((a, b) => a.arrival - b.arrival).map(p => ({ name: p.name, duration: p.burst }));
// }

function fcfs(processes) {
    processes.sort((a, b) => a.arrival - b.arrival);
    let completedProcesses = [];
    let time = 0;
    processes.forEach(p => {
        if (time < p.arrival) {
            completedProcesses.push({ name: 'IDLE', duration: p.arrival - time });
            time = p.arrival;
        }
        p.startTime = time;
        p.completionTime = time + p.burst;
        p.turnaroundTime = p.completionTime - p.arrival;
        p.waitingTime = p.turnaroundTime - p.burst;
        p.responseTime = p.startTime - p.arrival;
        time = p.completionTime;
        completedProcesses.push({ name: p.name, duration: p.burst });
    });
    return { processes, completedProcesses };
}
function sjfNonPreemptive(processes) {
    processes.sort((a, b) => a.arrival - b.arrival || a.burst - b.burst);
    let completedProcesses = [];
    let time = 0;
    let executedProcesses = [];

    while (processes.length > 0) {
        let available = processes.filter(p => p.arrival <= time);

        if (available.length > 0) {
            available.sort((a, b) => a.burst - b.burst);
            let next = available[0];

            // If the CPU is idle before processing
            if (time < next.arrival) {
                completedProcesses.push({ name: 'IDLE', duration: next.arrival - time });
                time = next.arrival;
            }

            // Process execution
            next.startTime = time;
            next.completionTime = time + next.burst;
            next.turnaroundTime = next.completionTime - next.arrival;
            next.waitingTime = next.turnaroundTime - next.burst;
            next.responseTime = next.startTime - next.arrival;

            completedProcesses.push({ name: next.name, duration: next.burst });
            executedProcesses.push(next);
            time += next.burst;

            // Remove the executed process correctly
            processes.splice(processes.indexOf(next), 1);
        } else {
            completedProcesses.push({ name: 'IDLE', duration: 1 });
            time++;
        }
    }

    return { completedProcesses, processes: executedProcesses };
}

function sjfPreemptive(processes) {
    let time = 0;
    let completed = 0;
    let n = processes.length;
    let lastProcess = null;
    let completedProcesses = [];

    // Initialize tracking values
    processes.forEach(p => {
        p.remaining = p.burst; 
        p.startTime = -1; 
        p.completionTime = 0;
    });

    while (completed < n) {
        let available = processes.filter(p => p.arrival <= time && p.remaining > 0);
        
        if (available.length > 0) {
            available.sort((a, b) => a.remaining - b.remaining);
            let next = available[0];

            
            if (next.startTime === -1) {
                next.startTime = time;
            }

            // Handle CPU idle time
            if (time < next.arrival) {
                if (!lastProcess || lastProcess.name !== 'IDLE') {
                    completedProcesses.push({ name: 'IDLE', duration: next.arrival - time });
                } else {
                    lastProcess.duration += next.arrival - time;
                }
                time = next.arrival;
            }

            
            if (lastProcess && lastProcess.name === next.name) {
                lastProcess.duration += 1; 
            } else {
                let newProcess = { name: next.name, duration: 1 };
                completedProcesses.push(newProcess);
                lastProcess = newProcess;
            }

            next.remaining--;
            time++;

            if (next.remaining === 0) {
                next.completionTime = time;
                completed++;
            }
        } else {
            if (!lastProcess || lastProcess.name !== 'IDLE') {
                lastProcess = { name: 'IDLE', duration: 1 };
                completedProcesses.push(lastProcess);
            } else {
                lastProcess.duration += 1;
            }
            time++;
        }
    }

    
    processes.forEach(p => {
        p.turnaroundTime = p.completionTime - p.arrival;
        p.waitingTime = p.turnaroundTime - p.burst;
        p.responseTime = p.startTime - p.arrival;
    });

    return { completedProcesses, processes };
}


function priorityScheduling(processes) {
    let time = 0;
    let completed = [];
    let queue = [...processes];
    let ganttChart = [];

    while (queue.length > 0) {
        let available = queue.filter(p => p.arrival <= time);
        
        if (available.length === 0) {
            ganttChart.push({ name: 'IDLE', duration: 1 });
            time++;
            continue;
        }

        available.sort((a, b) => a.priority - b.priority);
        let p = available[0];
        if (time < p.arrival) {
            ganttChart.push({ name: 'IDLE', duration: p.arrival - time });
            time = p.arrival;
        }

        p.startTime = time;
        p.completionTime = time + p.burst;
        p.turnaroundTime = p.completionTime - p.arrival;
        p.waitingTime = p.turnaroundTime - p.burst;
        p.responseTime = p.startTime - p.arrival;
        
        ganttChart.push({ name: p.name, duration: p.burst });
        time = p.completionTime;
        completed.push(p);
        queue = queue.filter(proc => proc.name !== p.name);
    }

    return { processes: completed, completedProcesses: ganttChart };
}


function prioritySchedulingPreemptive(processes) {
    let time = 0;
    let completed = [];
    let queue = processes.map(p => ({ ...p, remaining: p.burst, responseTime: -1 }));
    let ganttChart = [];
    let n = processes.length;
    let completedCount = 0;
    let lastProcessName = null;

    while (completedCount < n) {
        // Lấy các tiến trình đã đến và chưa hoàn thành
        let available = queue.filter(p => p.arrival <= time && p.remaining > 0);

        if (available.length > 0) {
            // Ưu tiên theo priority, nếu bằng thì xét arrival
            available.sort((a, b) => a.priority === b.priority ? a.arrival - b.arrival : a.priority - b.priority);
            let current = available[0];

            // Lưu response time lần đầu tiên tiến trình chạy
            if (current.responseTime === -1) {
                current.responseTime = time - current.arrival;
            }

            // Ghi vào Gantt Chart nếu process thay đổi
            if (lastProcessName !== current.name) {
                ganttChart.push({ name: current.name, start: time });
                lastProcessName = current.name;
            }

            // Tiến hành chạy 1 đơn vị thời gian
            current.remaining--;
            time++;

            // Nếu hoàn thành
            if (current.remaining === 0) {
                current.completionTime = time;
                current.turnaroundTime = current.completionTime - current.arrival;
                current.waitingTime = current.turnaroundTime - current.burst;
                completed.push(current);
                completedCount++;
            }
        } else {
            // Không có tiến trình sẵn sàng -> CPU IDLE
            if (lastProcessName !== "IDLE") {
                ganttChart.push({ name: "IDLE", start: time });
                lastProcessName = "IDLE";
            }
            time++;
        }
    }

    // Tính duration cho Gantt Chart
    ganttChart = ganttChart.map((entry, index) => {
        let end = index < ganttChart.length - 1 ? ganttChart[index + 1].start : time;
        return { name: entry.name, start: entry.start, duration: end - entry.start };
    });

    return { processes: completed, completedProcesses: ganttChart};
}



// function roundRobin(processes, quantum) {
//     let queue = [...processes.map(p => ({ ...p, remaining: p.burst, startTime: -1 }))];
//     let completed = [];
//     let time = 0;
//     let executionOrder = [];

//     while (queue.length > 0) {
//         let current = queue.shift();

//         if (time < current.arrival) {
//             executionOrder.push({ name: 'IDLE', duration: current.arrival - time });
//             time = current.arrival;
//         }

//         if (current.startTime === -1) {
//             current.startTime = time;
//         }

//         let execTime = Math.min(current.remaining, quantum);
//         executionOrder.push({ name: current.name, duration: execTime });
//         current.remaining -= execTime;
//         time += execTime;

//         if (current.remaining > 0) {
//             queue.push(current);
//         } else {
//             current.completionTime = time;
//             current.turnaroundTime = current.completionTime - current.arrival;
//             current.waitingTime = current.turnaroundTime - current.burst;
//             current.responseTime = current.startTime - current.arrival;
//             completed.push(current);
//         }
//     }

//     return { completedProcesses: executionOrder, processes: completed };
// }
function multilevelQueue(queues) {
    let time = 0;
    let completed = [];
    let executionOrder = [];

    for (let i = 0; i < queues.length; i++) {
        let queue = queues[i];
        queue.sort((a, b) => a.arrival - b.arrival); // Sort by arrival time
        while (queue.length > 0) {
            let process = queue.shift();
            if (time < process.arrival) {
                time = process.arrival;
            }
            if (process.responseTime === -1) process.responseTime = time - process.arrival;
            executionOrder.push({ name: process.name, duration: process.burst });

            time += process.burst;
            process.completionTime = time;
            process.turnaroundTime = process.completionTime - process.arrival;
            process.waitingTime = process.turnaroundTime - process.burst;
            process.responseTime = process.startTime - process.arrival;
            completed.push(process);
        }
    }
    return {  completedProcesses: executionOrder, processes: completed };
}
function multilevelFeedbackQueue(queues, quantum) {
    let time = 0;
    let completed = [];
    let executionOrder = [];

   
    return { completedProcesses: executionOrder, processes: completed };
}
// async function drawGanttChart(schedule, ctx, canvas) {
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//     let x = 50;
//     const barHeight = 50;
//     let time = 0;
//     for (const [index, task] of schedule.entries()) {
//         ctx.fillStyle = `hsl(${(index * 60) % 360}, 70%, 50%)`;
//         ctx.fillRect(x, 75, task.duration * 20, barHeight);
//         ctx.strokeRect(x, 75, task.duration * 20, barHeight);
//         ctx.fillStyle = "black";
//         ctx.fillText(task.name, x + 5, 100);
//         ctx.fillText(time, x, 140);
//         time += task.duration;
//         x += task.duration * 20;
//         await new Promise(resolve => setTimeout(resolve, index*200));
//     }
//     ctx.fillText(time, x, 140);
    
// }

function drawGanttChart(schedule, ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let x = 50;
    const barHeight = 50;
    let time = 0;
    for (const [index, task] of schedule.entries()) {
        if (task.name === "IDLE") {
            ctx.fillStyle = "gray"; // Color for idle time
        } else {
            ctx.fillStyle = `hsl(${(index * 60) % 360}, 70%, 50%)`;
        }
        ctx.fillRect(x, 75, 2 * 20, barHeight);
        ctx.strokeRect(x, 75, 2 * 20, barHeight);
        ctx.fillStyle = "black";
        ctx.fillText(task.name, x + 5, 100);
        ctx.fillText(time, x, 140);
        time += task.duration;
        x += 2 * 20;
    }
    ctx.fillText(time, x, 140);
}

function roundRobin(processes, quantum) {
    let queue = [...processes.map(p => ({ ...p, remaining: p.burst, startTime: -1 }))];
    let executionOrder = [];
    let completed = [];
    let time = 0;

    while (queue.length > 0) {
        let processExecuted = false;
        queue.sort((a, b) => a.arrival - b.arrival); // Sort by arrival time
        for (let i = 0; i < queue.length; i++) {
            let current = queue[i];

            if (current.arrival > time) continue; // Skip if process hasn't arrived yet

            processExecuted = true;
            if (current.startTime === -1) {
                current.startTime = time;
            }

            let execTime = Math.min(current.remaining, quantum);
            executionOrder.push({ name: current.name, duration: execTime });
            current.remaining -= execTime;
            time += execTime;

            if (current.remaining === 0) {
                current.completionTime = time;
                current.turnaroundTime = current.completionTime - current.arrival;
                current.waitingTime = current.turnaroundTime - current.burst;
                current.responseTime = current.startTime - current.arrival;
                completed.push(current);
                queue.splice(i, 1);
                i--;
            }
        }

        // If no process executed in this round, add an IDLE slot for waiting time
        if (!processExecuted && completed.length !== processes.length) {
            let nextArrival = Math.min(...queue.map(p => p.arrival));
            executionOrder.push({ name: 'IDLE', duration: nextArrival - time });
            time = nextArrival;
        }
    }

    return { completedProcesses: executionOrder, processes: completed };
}
export { readTextFile, fcfs, sjfNonPreemptive, sjfPreemptive, priorityScheduling,prioritySchedulingPreemptive, roundRobin,multilevelFeedbackQueue, multilevelQueue, drawGanttChart };
