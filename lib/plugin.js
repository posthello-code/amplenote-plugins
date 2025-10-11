const plugin = {
  constants: {},
  // https://www.amplenote.com/help/developing_amplenote_plugins#noteOption
  taskOption: {
    "Bulk Actions - Clear Overdue Tasks": {
      run: async function (app, noteUUID) {
        try {
          // Get current time minus 1 hour
          const oneHourAgo = Math.floor(Date.now() / 1000) - 3600; // 3600 seconds = 1 hour

          // Get all task domains
          const taskDomains = await app.getTaskDomains();

          if (!taskDomains || taskDomains.length === 0) {
            await app.alert("No task domains found.");
            return;
          }

          // Get all tasks from all task domains and filter for overdue by more than 1 hour
          const overdueTasks = [];
          const tasksByDomain = {}; // Track tasks per domain

          for (const taskDomain of taskDomains) {
            const domainTasks = [];
            for await (const task of app.getTaskDomainTasks(taskDomain.uuid)) {
              const taskDate = task.startAt || task.endAt;
              // Task is overdue if it's older than 1 hour ago
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

          // Build domain breakdown message with task names
          const domainBreakdown = Object.entries(tasksByDomain)
            .map(([domainName, tasks]) => {
              const taskList = tasks
                .map((task) => {
                  // Get task content without markdown formatting
                  const content = task.content || "Untitled task";
                  // Truncate long task names
                  const truncated =
                    content.length > 60
                      ? content.substring(0, 57) + "..."
                      : content;
                  return `    - ${truncated}`;
                })
                .join("\n");
              return `  ${domainName} (${tasks.length}):\n${taskList}`;
            })
            .join("\n\n");

          // Confirm with user
          const confirmMessage = `Found ${overdueTasks.length} overdue task${
            overdueTasks.length > 1 ? "s" : ""
          }:\n\n${domainBreakdown}\n\nRemove from calendar?`;
          const confirmed = await app.alert(confirmMessage, {
            actions: [
              { label: "Cancel", icon: "cancel" },
              { label: "Remove from  calendar", icon: "check" },
            ],
          });

          // User chose "Reset All" (index 1)
          if (confirmed === 1) {
            let successCount = 0;
            let failCount = 0;
            const errors = [];

            // Remove calendar date from each overdue task
            for (const task of overdueTasks) {
              try {
                // Remove all calendar-related fields to take task off calendar
                const updates = {};

                // Log what we're about to do
                console.log(`Processing task ${task.uuid}:`);
                console.log(`  startAt: ${task.startAt}`);
                console.log(`  endAt: ${task.endAt}`);
                console.log(`  hideUntil: ${task.hideUntil}`);

                // Only set fields to null if they exist on the task
                if (task.startAt !== null && task.startAt !== undefined) {
                  updates.startAt = null;
                }
                if (task.endAt !== null && task.endAt !== undefined) {
                  delete updates.endAt;
                }
                if (task.hideUntil !== null && task.hideUntil !== undefined) {
                  delete updates.hideUntil;
                }

                console.log(`  Updates to apply:`, updates);

                if (Object.keys(updates).length > 0) {
                  await app.updateTask(task.uuid, updates);
                  console.log(`  ✓ Successfully updated task ${task.uuid}`);
                  successCount++;
                } else {
                  console.log(
                    `  ⚠ Task ${task.uuid} has no calendar dates to remove`
                  );
                  successCount++;
                }
              } catch (error) {
                const errorMsg = `Task "${task.content || task.uuid}": ${
                  error.message
                }`;
                console.error(`Failed to reset task ${task.uuid}:`, error);
                console.error(`Task data:`, JSON.stringify(task));
                errors.push(errorMsg);
                failCount++;
              }
            }

            let resultMessage = `Successfully reset ${successCount} task${
              successCount !== 1 ? "s" : ""
            }.`;

            if (failCount > 0) {
              resultMessage += `\n\n${failCount} task${
                failCount !== 1 ? "s" : ""
              } failed:\n`;
              resultMessage += errors.map((e) => `• ${e}`).join("\n");
            }

            await app.alert(resultMessage);
          }
        } catch (error) {
          console.error("Error in Bulk Reset Overdue Tasks:", error);
          await app.alert(`Error: ${error.message}`);
        }
      },
    },
  },

  insertText: {},

  replaceText: {},
};
export default plugin;
