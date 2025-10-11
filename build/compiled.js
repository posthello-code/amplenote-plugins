(() => {
  // lib/plugin.js
  var plugin = {
    constants: {},
    // https://www.amplenote.com/help/developing_amplenote_plugins#noteOption
    taskOption: {
      "Bulk Reset Overdue Tasks": {
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
                    delete updates.startAt;
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
      }
    },
    insertText: {},
    replaceText: {}
  };
  var plugin_default = plugin;
})();
