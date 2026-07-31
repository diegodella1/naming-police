import { describe, expect, it } from "vitest";
import { validateRequest } from "./analysis";

describe("analysis request validation", () => {
  const base = {
    schema_version: "1",
    request_id: "request-123",
    preset: "invoices",
    locale: "es",
    media_kind: "document",
    metadata: { mime_type: "application/pdf" },
    extracted_text: "Factura Adobe USD 54.99",
  };

  it("accepts minimal safe document payload", () => {
    expect(validateRequest(base).request_id).toBe("request-123");
  });

  it("rejects content ambiguity", () => {
    expect(() =>
      validateRequest({ ...base, thumbnail_base64: "abc" }),
    ).toThrow("exactly_one_content");
  });

  it("rejects oversized extracted text", () => {
    expect(() =>
      validateRequest({ ...base, extracted_text: "x".repeat(20_001) }),
    ).toThrow("text_too_large");
  });
});
