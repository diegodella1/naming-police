import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { Onboarding } from "./Onboarding";

async function reachFinish(onComplete: () => Promise<void>) {
  render(
    <Onboarding
      onPick={async () => "C:\\Users\\Diego\\Downloads"}
      onComplete={onComplete}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Configurar/i }));
  fireEvent.click(screen.getByRole("button", { name: /Seleccionar carpeta local/i }));
  await screen.findByText("C:\\Users\\Diego\\Downloads");
  fireEvent.click(screen.getByRole("button", { name: /Continuar/i }));
  fireEvent.click(screen.getByRole("button", { name: /Continuar/i }));
  fireEvent.click(screen.getByRole("button", { name: /Continuar/i }));
}

describe("Onboarding", () => {
  it("shows progress and exposes completion failures for retry", async () => {
    let rejectCompletion: (error: Error) => void = () => undefined;
    const completion = new Promise<void>((_, reject) => {
      rejectCompletion = reject;
    });
    const onComplete = vi.fn(() => completion);
    await reachFinish(onComplete);

    fireEvent.click(screen.getByRole("button", { name: /Abrir Naming Police/i }));
    expect(screen.getByRole("button", { name: /Abriendo/i })).toBeDisabled();
    rejectCompletion(new Error("Carpeta no permitida"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Carpeta no permitida");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Abrir Naming Police/i })).not.toBeDisabled(),
    );
    expect(onComplete).toHaveBeenCalledWith(
      "C:\\Users\\Diego\\Downloads",
      "general",
      "ask",
      "hosted",
    );
  });
});
