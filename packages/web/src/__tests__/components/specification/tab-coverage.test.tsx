// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { TabCoverage } from "../../../components/specification/tab-coverage";

describe("TabCoverage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders table with correct number of rows when successCriteria is provided", () => {
    const criteria = [
      "User can login with email and password",
      "System validates input fields",
      "Error messages are displayed on failure",
    ];

    render(<TabCoverage successCriteria={criteria} />);

    // Check for table headers
    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("Criteria")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();

    // Check for all criteria rows
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("User can login with email and password")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("System validates input fields")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Error messages are displayed on failure")).toBeInTheDocument();
  });

  it("shows empty state when successCriteria is null", () => {
    render(<TabCoverage successCriteria={null} />);

    expect(screen.getByText("No success criteria available")).toBeInTheDocument();
    expect(screen.queryByText("#")).not.toBeInTheDocument();
  });

  it("shows empty state when successCriteria is empty array", () => {
    render(<TabCoverage successCriteria={[]} />);

    expect(screen.getByText("No success criteria available")).toBeInTheDocument();
    expect(screen.queryByText("#")).not.toBeInTheDocument();
  });

  it("each criterion shows Unchecked status", () => {
    const criteria = ["Criterion 1", "Criterion 2"];

    render(<TabCoverage successCriteria={criteria} />);

    const uncheckedStatuses = screen.getAllByText("Unchecked");
    expect(uncheckedStatuses).toHaveLength(2);
  });

  it("renders striped table rows with even rows having gray background", () => {
    const criteria = ["First", "Second", "Third"];

    const { container } = render(<TabCoverage successCriteria={criteria} />);

    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(3);

    // Check that even rows (index 1) have bg-gray-50
    expect(rows[1].className).toContain("bg-gray-50");
  });
});
