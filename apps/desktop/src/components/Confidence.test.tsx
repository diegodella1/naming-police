import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Confidence } from "./Confidence";

describe("Confidence", () => {
  it("communicates state without relying on color", () => {
    render(<Confidence band="high" value={0.93} />);
    expect(screen.getByLabelText("Confianza Alta").textContent).toContain("Alta · 93%");
  });
});
