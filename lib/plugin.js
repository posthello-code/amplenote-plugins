const plugin = {
  constants: {},
  // https://www.amplenote.com/help/developing_amplenote_plugins#appOption
  appOption: {
    "Bulk Reset Overdue Tasks": {
      run: async function (app) {
        try {
          // Get today's date at midnight for comparison
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayTimestamp = Math.floor(today.getTime() / 1000);

          // Find all tasks with calendar dates
          const tasksWithDates = await app.filterTasks({
            score: { min: 0 }, // Get all scored tasks (tasks with calendar dates have scores)
          });

          if (!tasksWithDates || tasksWithDates.length === 0) {
            await app.alert("No tasks with calendar dates found.");
            return;
          }

          // Filter for overdue tasks (tasks with dates before today)
          const overdueTasks = [];
          for (const task of tasksWithDates) {
            const taskDate = task.startAt || task.endAt;
            if (taskDate && taskDate < todayTimestamp) {
              overdueTasks.push(task);
            }
          }

          if (overdueTasks.length === 0) {
            await app.alert("No overdue tasks found.");
            return;
          }

          // Confirm with user
          const confirmMessage = `Found ${overdueTasks.length} overdue task${
            overdueTasks.length > 1 ? "s" : ""
          }. Remove from calendar?`;
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

  noteOption: {},

  replaceText: {},
};
export default plugin;
