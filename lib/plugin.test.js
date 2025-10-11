import { jest } from "@jest/globals";
import { mockPlugin, mockApp } from "./test-helpers.js";

// --------------------------------------------------------------------------------------
describe("Bulk Task Reset Plugin", () => {
  const plugin = mockPlugin();
  plugin.constants.isTestEnvironment = true;

  it("should handle no tasks with dates", async () => {
    const app = mockApp();
    app.filterTasks = jest.fn().mockResolvedValue([]);
    app.alert = jest.fn();

    await plugin.appOption["Bulk Reset Overdue Tasks"].run(app);

    expect(app.alert).toHaveBeenCalledWith(
      "No tasks with calendar dates found."
    );
  });

  it("should handle no overdue tasks", async () => {
    const app = mockApp();
    const futureDate = Math.floor(Date.now() / 1000) + 86400; // Tomorrow

    app.filterTasks = jest
      .fn()
      .mockResolvedValue([{ uuid: "task1", startAt: futureDate }]);
    app.alert = jest.fn();

    await plugin.appOption["Bulk Reset Overdue Tasks"].run(app);

    expect(app.alert).toHaveBeenCalledWith("No overdue tasks found.");
  });

  it("should reset overdue tasks when confirmed", async () => {
    const app = mockApp();
    const yesterday = Math.floor(Date.now() / 1000) - 86400;

    app.filterTasks = jest.fn().mockResolvedValue([
      { uuid: "task1", startAt: yesterday },
      { uuid: "task2", endAt: yesterday },
    ]);
    app.updateTask = jest.fn().mockResolvedValue(true);
    app.alert = jest
      .fn()
      .mockResolvedValueOnce(1) // User clicks "Reset All"
      .mockResolvedValueOnce(undefined); // Success message

    await plugin.appOption["Bulk Reset Overdue Tasks"].run(app);

    expect(app.updateTask).toHaveBeenCalledTimes(2);
    expect(app.updateTask).toHaveBeenCalledWith("task1", {
      startAt: null,
      endAt: null,
      hideUntil: null,
    });
    expect(app.alert).toHaveBeenLastCalledWith("Successfully reset 2 tasks.");
  });

  it("should not reset tasks when user cancels", async () => {
    const app = mockApp();
    const yesterday = Math.floor(Date.now() / 1000) - 86400;

    app.filterTasks = jest
      .fn()
      .mockResolvedValue([{ uuid: "task1", startAt: yesterday }]);
    app.updateTask = jest.fn();
    app.alert = jest.fn().mockResolvedValue(0); // User clicks "Cancel"

    await plugin.appOption["Bulk Reset Overdue Tasks"].run(app);

    expect(app.updateTask).not.toHaveBeenCalled();
  });
});
