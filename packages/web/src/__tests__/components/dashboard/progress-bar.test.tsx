// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ProgressBar } from "../../../components/dashboard/progress-bar";

describe("ProgressBar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders label and progress text", () => {
    render(
      <ProgressBar
        label="Requirements"
        current={8}
        total={10}
        percentage={80}
        color="blue"
      />
    );

    expect(screen.getByText("Requirements")).toBeInTheDocument();
    expect(screen.getByText("8/10 (80%)")).toBeInTheDocument();
  });

  it("renders 0% width when percentage is 0", () => {
    render(
      <ProgressBar
        label="Test"
        current={0}
        total={10}
        percentage={0}
        color="blue"
      />
    );

    const progressBar = screen.getByTestId("progress-bar-fill");
    expect(progressBar).toHaveStyle({ width: "0%" });
  });

  it("renders 50% width when percentage is 50", () => {
    render(
      <ProgressBar
        label="Test"
        current={5}
        total={10}
        percentage={50}
        color="blue"
      />
    );

    const progressBar = screen.getByTestId("progress-bar-fill");
    expect(progressBar).toHaveStyle({ width: "50%" });
  });

  it("renders 100% width when percentage is 100", () => {
    render(
      <ProgressBar
        label="Test"
        current={10}
        total={10}
        percentage={100}
        color="blue"
      />
    );

    const progressBar = screen.getByTestId("progress-bar-fill");
    expect(progressBar).toHaveStyle({ width: "100%" });
  });

  it("applies the correct color class", () => {
    render(
      <ProgressBar
        label="Test"
        current={5}
        total={10}
        percentage={50}
        color="green"
      />
    );

    const progressBar = screen.getByTestId("progress-bar-fill");
    expect(progressBar).toHaveClass("bg-green-500");
  });
});
