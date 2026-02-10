import { describe, it, expect } from "vitest";
import { calculateProgress } from "./progress-calculator.js";
import type { ImplementationIssue } from "@reqord/shared";

describe("calculateProgress", () => {
  it("空の配列の場合、total=0, completed=0, percentage=0を返す", () => {
    const issues: ImplementationIssue[] = [];
    const result = calculateProgress(issues);

    expect(result).toEqual({
      total: 0,
      completed: 0,
      percentage: 0,
    });
  });

  it("すべてopenの場合、completed=0, percentage=0を返す", () => {
    const issues: ImplementationIssue[] = [
      {
        number: 1,
        title: "Task 1",
        url: "https://github.com/owner/repo/issues/1",
        priority: "P1",
        status: "open",
      },
      {
        number: 2,
        title: "Task 2",
        url: "https://github.com/owner/repo/issues/2",
        priority: "P2",
        status: "open",
      },
      {
        number: 3,
        title: "Task 3",
        url: "https://github.com/owner/repo/issues/3",
        priority: "P3",
        status: "open",
      },
    ];
    const result = calculateProgress(issues);

    expect(result).toEqual({
      total: 3,
      completed: 0,
      percentage: 0,
    });
  });

  it("すべてclosedの場合、completed=total, percentage=100を返す", () => {
    const issues: ImplementationIssue[] = [
      {
        number: 1,
        title: "Task 1",
        url: "https://github.com/owner/repo/issues/1",
        priority: "P1",
        status: "closed",
      },
      {
        number: 2,
        title: "Task 2",
        url: "https://github.com/owner/repo/issues/2",
        priority: "P2",
        status: "closed",
      },
      {
        number: 3,
        title: "Task 3",
        url: "https://github.com/owner/repo/issues/3",
        priority: "P3",
        status: "closed",
      },
    ];
    const result = calculateProgress(issues);

    expect(result).toEqual({
      total: 3,
      completed: 3,
      percentage: 100,
    });
  });

  it("1件closed、2件openの場合、completed=1, percentage=33を返す", () => {
    const issues: ImplementationIssue[] = [
      {
        number: 1,
        title: "Task 1",
        url: "https://github.com/owner/repo/issues/1",
        priority: "P1",
        status: "closed",
      },
      {
        number: 2,
        title: "Task 2",
        url: "https://github.com/owner/repo/issues/2",
        priority: "P2",
        status: "open",
      },
      {
        number: 3,
        title: "Task 3",
        url: "https://github.com/owner/repo/issues/3",
        priority: "P3",
        status: "open",
      },
    ];
    const result = calculateProgress(issues);

    expect(result).toEqual({
      total: 3,
      completed: 1,
      percentage: 33,
    });
  });

  it("2件closed、1件openの場合、completed=2, percentage=67を返す", () => {
    const issues: ImplementationIssue[] = [
      {
        number: 1,
        title: "Task 1",
        url: "https://github.com/owner/repo/issues/1",
        priority: "P1",
        status: "closed",
      },
      {
        number: 2,
        title: "Task 2",
        url: "https://github.com/owner/repo/issues/2",
        priority: "P2",
        status: "closed",
      },
      {
        number: 3,
        title: "Task 3",
        url: "https://github.com/owner/repo/issues/3",
        priority: "P3",
        status: "open",
      },
    ];
    const result = calculateProgress(issues);

    expect(result).toEqual({
      total: 3,
      completed: 2,
      percentage: 67,
    });
  });

  it("単一のclosedの場合、completed=1, percentage=100を返す", () => {
    const issues: ImplementationIssue[] = [
      {
        number: 1,
        title: "Task 1",
        url: "https://github.com/owner/repo/issues/1",
        priority: "P1",
        status: "closed",
      },
    ];
    const result = calculateProgress(issues);

    expect(result).toEqual({
      total: 1,
      completed: 1,
      percentage: 100,
    });
  });

  it("in_progressはcompletedとしてカウントされない", () => {
    const issues: ImplementationIssue[] = [
      {
        number: 1,
        title: "Task 1",
        url: "https://github.com/owner/repo/issues/1",
        priority: "P1",
        status: "closed",
      },
      {
        number: 2,
        title: "Task 2",
        url: "https://github.com/owner/repo/issues/2",
        priority: "P2",
        status: "in_progress",
      },
      {
        number: 3,
        title: "Task 3",
        url: "https://github.com/owner/repo/issues/3",
        priority: "P3",
        status: "open",
      },
    ];
    const result = calculateProgress(issues);

    expect(result).toEqual({
      total: 3,
      completed: 1,
      percentage: 33,
    });
  });
});
