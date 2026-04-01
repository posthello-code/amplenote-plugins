import { jest } from "@jest/globals";
import { mockPlugin, mockApp } from "./test-helpers.js";

describe("Bulk Task Reset Plugin", () => {
  const plugin = mockPlugin();
  plugin.constants.isTestEnvironment = true;

  it("should handle no task domains", async () => {
    const app = mockApp();
    app.getTaskDomains = jest.fn().mockResolvedValue([]);
    app.alert = jest.fn();

    await plugin.taskOption["Clear Overdue Tasks"].run(app, "test-note-uuid");

    expect(app.alert).toHaveBeenCalledWith("No task domains found.");
  });

  it("should handle no overdue tasks (less than 1 hour old)", async () => {
    const app = mockApp();
    const thirtyMinutesAgo = Math.floor(Date.now() / 1000) - 1800; // 30 minutes ago

    app.getTaskDomains = jest
      .fn()
      .mockResolvedValue([{ uuid: "domain1", name: "My Tasks" }]);

    // Mock async iterator for getTaskDomainTasks
    app.getTaskDomainTasks = jest.fn().mockReturnValue(
      (async function* () {
        yield { uuid: "task1", startAt: thirtyMinutesAgo };
      })(),
    );

    app.alert = jest.fn();

    await plugin.taskOption["Clear Overdue Tasks"].run(app, "test-note-uuid");

    expect(app.alert).toHaveBeenCalledWith("No overdue tasks found.");
  });

  it("should reset overdue tasks when confirmed", async () => {
    const app = mockApp();
    const yesterday = Math.floor(Date.now() / 1000) - 86400;

    app.getTaskDomains = jest
      .fn()
      .mockResolvedValue([{ uuid: "domain1", name: "My Tasks" }]);

    // Mock async iterator for getTaskDomainTasks
    app.getTaskDomainTasks = jest.fn().mockReturnValue(
      (async function* () {
        yield { uuid: "task1", startAt: yesterday, content: "Buy groceries" };
        yield { uuid: "task2", endAt: yesterday, content: "Call dentist" };
      })(),
    );

    app.updateTask = jest.fn().mockResolvedValue(true);
    app.alert = jest
      .fn()
      .mockResolvedValueOnce(1) // User clicks "Reset All"
      .mockResolvedValueOnce(undefined); // Success message

    await plugin.taskOption["Clear Overdue Tasks"].run(app, "test-note-uuid");

    // Check that confirmation message includes domain name, count, and task names
    expect(app.alert).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("Found 2 overdue tasks"),
      expect.any(Object),
    );
    expect(app.alert).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("My Tasks (2)"),
      expect.any(Object),
    );
    expect(app.alert).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("Buy groceries"),
      expect.any(Object),
    );
    expect(app.alert).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("Call dentist"),
      expect.any(Object),
    );

    expect(app.updateTask).toHaveBeenCalledTimes(1);

    expect(app.alert).toHaveBeenLastCalledWith("Successfully reset 2 tasks.");
  });

  it("should not reset tasks when user cancels", async () => {
    const app = mockApp();
    const yesterday = Math.floor(Date.now() / 1000) - 86400;

    app.getTaskDomains = jest
      .fn()
      .mockResolvedValue([{ uuid: "domain1", name: "My Tasks" }]);

    // Mock async iterator for getTaskDomainTasks
    app.getTaskDomainTasks = jest.fn().mockReturnValue(
      (async function* () {
        yield { uuid: "task1", startAt: yesterday };
      })(),
    );

    app.updateTask = jest.fn();
    app.alert = jest.fn().mockResolvedValue(0); // User clicks "Cancel"

    await plugin.taskOption["Clear Overdue Tasks"].run(app, "test-note-uuid");

    expect(app.updateTask).not.toHaveBeenCalled();
  });
});
