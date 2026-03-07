// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { WarningAlert } from "../../../components/dashboard/warning-alert";
import type { Warning } from "../../../lib/dashboard-data";

describe("WarningAlert", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders error severity with red background and rounded corners", () => {
    const warning: Warning = {
      type: "design_verification_error",
      message: "Critical issue detected",
      severity: "error",
      relatedId: "spec-000001",
    };

    render(<WarningAlert warning={warning} />);

    const alert = screen.getByTestId("warning-alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass("bg-red-50");
    expect(alert).toHaveClass("rounded-lg");
    expect(screen.getByText("Critical issue detected")).toBeInTheDocument();
  });

  it("renders warning severity with yellow background and rounded corners", () => {
    const warning: Warning = {
      type: "missing_specification",
      message: "Specification is missing",
      severity: "warning",
      relatedId: "req-000001",
    };

    render(<WarningAlert warning={warning} />);

    const alert = screen.getByTestId("warning-alert");
    expect(alert).toHaveClass("bg-yellow-50");
    expect(alert).toHaveClass("rounded-lg");
    expect(screen.getByText("Specification is missing")).toBeInTheDocument();
  });

  it("renders info severity with blue background and rounded corners", () => {
    const warning: Warning = {
      type: "unapproved_dependency",
      message: "Dependency not approved",
      severity: "info",
      relatedId: "req-000002",
    };

    render(<WarningAlert warning={warning} />);

    const alert = screen.getByTestId("warning-alert");
    expect(alert).toHaveClass("bg-blue-50");
    expect(alert).toHaveClass("rounded-lg");
    expect(screen.getByText("Dependency not approved")).toBeInTheDocument();
  });

  it("displays the related ID", () => {
    const warning: Warning = {
      type: "missing_specification",
      message: "Test message",
      severity: "warning",
      relatedId: "req-000123",
    };

    render(<WarningAlert warning={warning} />);

    expect(screen.getByText("req-000123")).toBeInTheDocument();
  });
});
