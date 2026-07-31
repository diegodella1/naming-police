import { describe, expect, it } from "vitest";
import { assertAnalysisResult, confidenceBand } from "./index";

describe("contracts", () => {
  it("maps confidence bands deterministically", () => {
    expect(confidenceBand(0.9)).toBe("high");
    expect(confidenceBand(0.7)).toBe("medium");
    expect(confidenceBand(0.3)).toBe("low");
  });

  it("rejects unexpected provider fields", () => {
    expect(() =>
      assertAnalysisResult({
        schema_version: "1",
        request_id: "one",
        fields: {},
        confidence: 0.8,
        unsafe_or_sensitive: false,
        model: "test",
        usage: { input_tokens: 1, output_tokens: 1 },
        path: "/tmp/forbidden",
      }),
    ).toThrow("Unexpected field");
  });
});
