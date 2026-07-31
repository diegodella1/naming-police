import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { Privacy } from "./Privacy";

describe("Hosted login", () => {
  it("retries session storage without consuming the OTP twice", async () => {
    const onRequestCode = vi.fn(async () => undefined);
    const onVerify = vi.fn(async () => {
      throw new Error("Operación segura falló: Credential Manager");
    });
    const onRetryStore = vi.fn(async () => undefined);
    render(
      <Privacy
        settings={{
          locale: "es",
          output_locale: "es",
          remote_ai_enabled: true,
          provider: "hosted",
          notify_suggestions: true,
          auto_updates: true,
          onboarding_complete: true,
        }}
        authenticated={false}
        used={0}
        limit={100}
        onProvider={async () => undefined}
        onSaveKey={async () => undefined}
        onDeleteKey={async () => undefined}
        onRequestCode={onRequestCode}
        onVerify={onVerify}
        onRetryStore={onRetryStore}
        onSignOut={async () => undefined}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("vos@ejemplo.com"), {
      target: { value: "diego@diegodella.ar" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar código" }));
    await screen.findByPlaceholderText("Código de 6–8 dígitos");
    fireEvent.change(screen.getByPlaceholderText("Código de 6–8 dígitos"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verificar código" }));
    expect(await screen.findByRole("button", { name: "Reintentar guardar sesión" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar guardar sesión" }));
    await waitFor(() => expect(onRetryStore).toHaveBeenCalledOnce());
    expect(onVerify).toHaveBeenCalledOnce();
  });
});
