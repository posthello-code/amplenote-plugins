const plugin = {
  constants: {},
  // https://www.amplenote.com/help/developing_amplenote_plugins#noteOption
  taskOption: {
    "Bulk Reset Overdue Tasks": {
      run: async function (app, noteUUID) {
        try {
          // Get today's date at midnight for comparison
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayTimestamp = Math.floor(today.getTime() / 1000);

          // Get all task domains
          const taskDomains = await app.getTaskDomains();

          if (!taskDomains || taskDomains.length === 0) {
            await app.alert("No task domains found.");
            return;
          }

          // Get all tasks from all task domains and filter for overdue
          const overdueTasks = [];
          const tasksByDomain = {}; // Track tasks per domain

          for (const taskDomain of taskDomains) {
            const domainTasks = [];
            for await (const task of app.getTaskDomainTasks(taskDomain.uuid)) {
              const taskDate = task.startAt || task.endAt;
              if (taskDate && taskDate < todayTimestamp) {
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
              { label: "Reset All", icon: "check" },
            ],
          });

          // User chose "Reset All" (index 1)
          if (confirmed === 1) {
            let successCount = 0;
            let failCount = 0;

            // Remove calendar date from each overdue task
            for (const task of overdueTasks) {
              try {
                await app.updateTask(task.uuid, {
                  startAt: null,
                  endAt: null,
                  hideUntil: null,
                });
                successCount++;
              } catch (error) {
                console.error(`Failed to reset task ${task.uuid}:`, error);
                failCount++;
              }
            }

            const resultMessage =
              `Successfully reset ${successCount} task${
                successCount !== 1 ? "s" : ""
              }.` +
              (failCount > 0
                ? ` ${failCount} task${failCount !== 1 ? "s" : ""} failed.`
                : "");
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
