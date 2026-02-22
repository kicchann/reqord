import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/file-system", () => ({
  readYAML: vi.fn(),
  joinPath: vi.fn((...parts: string[]) => parts.join("/")),
}));

vi.mock("../../lib/reqord-root", () => ({
  getIssuesDir: vi.fn(() => "/test/.reqord/issues"),
}));

import { LocalFeedbackRepository } from "../../lib/local-feedback-repository";
import { readYAML } from "../../lib/file-system";

const mockReadYAML = vi.mocked(readYAML);

describe("LocalFeedbackRepository", () => {
  let repo: LocalFeedbackRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new LocalFeedbackRepository();
  });

  it("feedbacks.yaml存在時にFeedbackEntry配列を返す", async () => {
    mockReadYAML.mockResolvedValue({
      feedbacks: [
        {
          githubIssue: 42,
          type: "bug",
          severity: "high",
          linkedTo: {
            requirements: ["req-000001"],
            createdRequirements: [],
            specifications: [],
            createdSpecifications: [],
          },
          syncedAt: "2026-01-01T00:00:00Z",
          status: "open",
        },
      ],
    });

    const result = await repo.findAll();

    expect(result).toHaveLength(1);
    expect(result[0].githubIssue).toBe(42);
    expect(result[0].type).toBe("bug");
  });

  it("feedbacks.yaml不在時に空配列を返す", async () => {
    mockReadYAML.mockRejectedValue(new Error("ENOENT"));

    const result = await repo.findAll();

    expect(result).toEqual([]);
  });

  it("不正なYAML時に空配列を返す", async () => {
    mockReadYAML.mockResolvedValue({ invalid: "data" });

    const result = await repo.findAll();

    expect(result).toEqual([]);
  });

  it("feedbacks配列が空の場合に空配列を返す", async () => {
    mockReadYAML.mockResolvedValue({ feedbacks: [] });

    const result = await repo.findAll();

    expect(result).toEqual([]);
  });
});
