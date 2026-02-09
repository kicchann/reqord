import { describe, it, expect } from "vitest";
import {
  parseReqordComment,
  buildReqordComment,
  upsertReqordComment,
} from "./reqord-comment.js";
import type { ReqordFeedbackComment } from "./reqord-comment.js";

// --- parseReqordComment (output-based) ---

describe("parseReqordComment", () => {
  it("HTMLコメントからメタデータを抽出する", () => {
    const body = `Some issue text
<!-- reqord:feedback {"type":"bug","linkedTo":{"requirements":["req-000001"],"createdRequirements":[],"specifications":[]}} -->
More text`;

    const result = parseReqordComment(body);

    expect(result).toEqual({
      type: "bug",
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
      },
    });
  });

  it("severity付きのコメントをパースする", () => {
    const body = `<!-- reqord:feedback {"type":"improvement","severity":"high","linkedTo":{"requirements":["req-000006"],"createdRequirements":[],"specifications":["spec-000001"]}} -->`;

    const result = parseReqordComment(body);

    expect(result).toEqual({
      type: "improvement",
      severity: "high",
      linkedTo: {
        requirements: ["req-000006"],
        createdRequirements: [],
        specifications: ["spec-000001"],
      },
    });
  });

  it("コメントがない場合はnullを返す", () => {
    const body = "This is a normal issue body without any reqord comment.";

    const result = parseReqordComment(body);

    expect(result).toBeNull();
  });

  it("空文字列に対してnullを返す", () => {
    const result = parseReqordComment("");

    expect(result).toBeNull();
  });

  it("複数行にまたがるHTMLコメントをパースする", () => {
    const body = `Issue text
<!-- reqord:feedback
{
  "type": "requirement-gap",
  "linkedTo": {
    "requirements": ["req-000005"],
    "createdRequirements": [],
    "specifications": ["spec-000005"]
  }
}
-->
More text`;

    const result = parseReqordComment(body);

    expect(result).toEqual({
      type: "requirement-gap",
      linkedTo: {
        requirements: ["req-000005"],
        createdRequirements: [],
        specifications: ["spec-000005"],
      },
    });
  });

  it("typeがないコメントをパースする", () => {
    const body = `<!-- reqord:feedback {"linkedTo":{"requirements":["req-000001"],"createdRequirements":[],"specifications":[]}} -->`;

    const result = parseReqordComment(body);

    expect(result).toEqual({
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
      },
    });
  });

  it("不正なJSONの場合はnullを返す", () => {
    const body = `<!-- reqord:feedback {invalid json} -->`;

    const result = parseReqordComment(body);

    expect(result).toBeNull();
  });

  it("通常のHTMLコメントは無視する", () => {
    const body = `<!-- This is a normal comment -->
Some text
<!-- Another comment -->`;

    const result = parseReqordComment(body);

    expect(result).toBeNull();
  });
});

// --- buildReqordComment (output-based) ---

describe("buildReqordComment", () => {
  it("メタデータからHTMLコメントを構築する", () => {
    const metadata: ReqordFeedbackComment = {
      type: "bug",
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
      },
    };

    const result = buildReqordComment(metadata);

    expect(result).toContain("<!-- reqord:feedback");
    expect(result).toContain("-->");
    // パースし直して同じ結果が得られることを検証
    const parsed = parseReqordComment(result);
    expect(parsed).toEqual(metadata);
  });

  it("severity付きのコメントを構築する", () => {
    const metadata: ReqordFeedbackComment = {
      type: "improvement",
      severity: "high",
      linkedTo: {
        requirements: ["req-000006"],
        createdRequirements: [],
        specifications: ["spec-000001"],
      },
    };

    const result = buildReqordComment(metadata);
    const parsed = parseReqordComment(result);

    expect(parsed).toEqual(metadata);
  });

  it("typeがないメタデータからコメントを構築する", () => {
    const metadata: ReqordFeedbackComment = {
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
      },
    };

    const result = buildReqordComment(metadata);
    const parsed = parseReqordComment(result);

    expect(parsed).toEqual(metadata);
  });

  it("空のlinkedToからコメントを構築する", () => {
    const metadata: ReqordFeedbackComment = {
      type: "bug",
      linkedTo: {
        requirements: [],
        createdRequirements: [],
        specifications: [],
      },
    };

    const result = buildReqordComment(metadata);
    const parsed = parseReqordComment(result);

    expect(parsed).toEqual(metadata);
  });
});

// --- upsertReqordComment (output-based) ---

describe("upsertReqordComment", () => {
  it("コメントがないbodyに新規挿入する", () => {
    const body = "Issue body content";
    const metadata: ReqordFeedbackComment = {
      type: "bug",
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
      },
    };

    const result = upsertReqordComment(body, metadata);

    expect(result).toContain("Issue body content");
    expect(result).toContain("<!-- reqord:feedback");
    const parsed = parseReqordComment(result);
    expect(parsed).toEqual(metadata);
  });

  it("既存コメントを更新する", () => {
    const body = `Issue body
<!-- reqord:feedback {"type":"bug","linkedTo":{"requirements":[],"createdRequirements":[],"specifications":[]}} -->
More text`;
    const metadata: ReqordFeedbackComment = {
      type: "improvement",
      severity: "high",
      linkedTo: {
        requirements: ["req-000006"],
        createdRequirements: [],
        specifications: [],
      },
    };

    const result = upsertReqordComment(body, metadata);

    expect(result).toContain("Issue body");
    expect(result).toContain("More text");
    const parsed = parseReqordComment(result);
    expect(parsed).toEqual(metadata);
    // 古いコメントが残っていないこと
    expect(result).not.toContain('"type":"bug"');
  });

  it("空のbodyに挿入する", () => {
    const metadata: ReqordFeedbackComment = {
      type: "bug",
      linkedTo: {
        requirements: [],
        createdRequirements: [],
        specifications: [],
      },
    };

    const result = upsertReqordComment("", metadata);

    const parsed = parseReqordComment(result);
    expect(parsed).toEqual(metadata);
  });

  it("複数行コメントを単一行コメントに更新する", () => {
    const body = `Issue body
<!-- reqord:feedback
{
  "type": "bug",
  "linkedTo": {
    "requirements": [],
    "createdRequirements": [],
    "specifications": []
  }
}
-->
More text`;
    const metadata: ReqordFeedbackComment = {
      type: "improvement",
      linkedTo: {
        requirements: ["req-000001"],
        createdRequirements: [],
        specifications: [],
      },
    };

    const result = upsertReqordComment(body, metadata);

    const parsed = parseReqordComment(result);
    expect(parsed).toEqual(metadata);
    expect(result).toContain("Issue body");
    expect(result).toContain("More text");
  });
});
