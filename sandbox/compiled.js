(() => {
  // lib/plugin.js
  var plugin = {
    constants: {},
    taskOption: {
      "Clear Overdue Tasks": {
        run: async function(app, noteUUID) {
          try {
            const oneHourAgo = Math.floor(Date.now() / 1e3) - 3600;
            const taskDomains = await app.getTaskDomains();
            if (!taskDomains || taskDomains.length === 0) {
              await app.alert("No task domains found.");
              return;
            }
            const overdueTasks = [];
            const tasksByDomain = {};
            for (const taskDomain of taskDomains) {
              const domainTasks = [];
              for await (const task of app.getTaskDomainTasks(taskDomain.uuid)) {
                const taskDate = task.startAt || task.endAt;
                if (taskDate && taskDate < oneHourAgo) {
                  overdueTasks.push(task);
                  domainTasks.push(task);
                }
              }
              if (domainTasks.length > 0) {
                tasksByDomain[taskDomain.name] = domainTasks;
              }
            }
            if (overdueTasks.length === 0) {
              await app.alert("No overdue tasks found.");
              return;
            }
            const domainBreakdown = Object.entries(tasksByDomain).map(([domainName, tasks]) => {
              const taskList = tasks.map((task) => {
                const content = task.content || "Untitled task";
                const truncated = content.length > 60 ? content.substring(0, 57) + "..." : content;
                return `    - ${truncated}`;
              }).join("\n");
              return `  ${domainName} (${tasks.length}):
${taskList}`;
            }).join("\n\n");
            const confirmMessage = `Found ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}:

${domainBreakdown}

Remove from calendar?`;
            const confirmed = await app.alert(confirmMessage, {
              actions: [
                { label: "Cancel", icon: "cancel" },
                { label: "Remove from  calendar", icon: "check" }
              ]
            });
            if (confirmed === 1) {
              let successCount = 0;
              let failCount = 0;
              const errors = [];
              for (const task of overdueTasks) {
                try {
                  const updates = {};
                  console.log(`Processing task ${task.uuid}:`);
                  console.log(`  startAt: ${task.startAt}`);
                  console.log(`  endAt: ${task.endAt}`);
                  console.log(`  hideUntil: ${task.hideUntil}`);
                  if (task.startAt !== null && task.startAt !== void 0) {
                    updates.startAt = null;
                  }
                  if (task.endAt !== null && task.endAt !== void 0) {
                    delete updates.endAt;
                  }
                  if (task.hideUntil !== null && task.hideUntil !== void 0) {
                    delete updates.hideUntil;
                  }
                  console.log(`  Updates to apply:`, updates);
                  if (Object.keys(updates).length > 0) {
                    await app.updateTask(task.uuid, updates);
                    console.log(`  \u2713 Successfully updated task ${task.uuid}`);
                    successCount++;
                  } else {
                    console.log(
                      `  \u26A0 Task ${task.uuid} has no calendar dates to remove`
                    );
                    successCount++;
                  }
                } catch (error) {
                  const errorMsg = `Task "${task.content || task.uuid}": ${error.message}`;
                  console.error(`Failed to reset task ${task.uuid}:`, error);
                  console.error(`Task data:`, JSON.stringify(task));
                  errors.push(errorMsg);
                  failCount++;
                }
              }
              let resultMessage = `Successfully reset ${successCount} task${successCount !== 1 ? "s" : ""}.`;
              if (failCount > 0) {
                resultMessage += `

${failCount} task${failCount !== 1 ? "s" : ""} failed:
`;
                resultMessage += errors.map((e) => `\u2022 ${e}`).join("\n");
              }
              await app.alert(resultMessage);
            }
          } catch (error) {
            console.error("Error in Bulk Reset Overdue Tasks:", error);
            await app.alert(`Error: ${error.message}`);
          }
        }
      },
      "Hide Lower Priority Tasks": {
        run: async function(app, noteUUID) {
          try {
            console.log("noteUUID:", noteUUID);
            const taskDomains = await app.getTaskDomains();
            console.log("taskDomains:", taskDomains);
            if (!taskDomains || taskDomains.length === 0) {
              await app.alert(
                "No task domains found. taskDomains: " + JSON.stringify(taskDomains)
              );
              return;
            }
            const domainNames = taskDomains.map((d) => d.name);
            const selectedDomainIndex = await app.alert("Select a task domain:", {
              actions: domainNames.map((name, index) => ({
                label: name,
                icon: "info"
              }))
            });
            if (selectedDomainIndex === void 0 || selectedDomainIndex === -1) {
              return;
            }
            const selectedDomain = taskDomains[selectedDomainIndex];
            const domainTasks = await app.getTaskDomainTasks(selectedDomain.uuid);
            if (!domainTasks || domainTasks.length === 0) {
              await app.alert(`No tasks found in ${selectedDomain.name}.`);
              return;
            }
            const sortedTasks = [...domainTasks].sort(
              (a, b) => (b.score || 0) - (a.score || 0)
            );
            const topTasks = sortedTasks.slice(0, 20);
            const tasksToHide = sortedTasks.slice(20);
            alert("tasksToHide", tasksToHide);
            alert("topTasks", topTasks);
            if (tasksToHide.length === 0) {
              await app.alert(
                `Domain has ${topTasks.length} tasks. No tasks to hide.`
              );
              return;
            }
            const now = /* @__PURE__ */ new Date();
            const currentHour = now.getHours();
            let hideUntil;
            if (currentHour < 12) {
              hideUntil = new Date(now);
              hideUntil.setHours(14, 0, 0, 0);
            } else if (currentHour < 18) {
              hideUntil = new Date(now);
              hideUntil.setHours(18, 0, 0, 0);
            } else {
              hideUntil = new Date(now);
              hideUntil.setDate(hideUntil.getDate() + 1);
              hideUntil.setHours(9, 0, 0, 0);
            }
            const hideUntilTimestamp = Math.floor(hideUntil.getTime() / 1e3);
            const confirmMessage = `Keeping top 20 tasks by score.
Hiding ${tasksToHide.length} lower priority task${tasksToHide.length !== 1 ? "s" : ""} until ${hideUntil.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            })}?`;
            const confirmed = await app.alert(confirmMessage, {
              actions: [
                { label: "Cancel", icon: "cancel" },
                { label: "Hide Tasks", icon: "check" }
              ]
            });
            if (confirmed === 1) {
              let successCount = 0;
              let failCount = 0;
              const errors = [];
              for (const task of tasksToHide) {
                try {
                  await app.updateTask(task.uuid, {
                    hideUntil: hideUntilTimestamp
                  });
                  successCount++;
                } catch (error) {
                  const errorMsg = `Task "${task.content || task.uuid}": ${error.message}`;
                  console.error(`Failed to hide task ${task.uuid}:`, error);
                  errors.push(errorMsg);
                  failCount++;
                }
              }
              let resultMessage = `Successfully hid ${successCount} task${successCount !== 1 ? "s" : ""}.`;
              if (failCount > 0) {
                resultMessage += `

${failCount} task${failCount !== 1 ? "s" : ""} failed:
`;
                resultMessage += errors.map((e) => `\u2022 ${e}`).join("\n");
              }
              await app.alert(resultMessage);
            }
          } catch (error) {
            console.error("Error in Hide Lower Priority Tasks:", error);
            await app.alert(`Error: ${error.message}`);
          }
        }
      }
    },
    insertText: {},
    replaceText: {}
  };
  var plugin_default = plugin;
})();
