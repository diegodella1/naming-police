export interface ToastState {
  kind: "success" | "error";
  message: string;
}

export function Toast({ toast }: { toast?: ToastState }) {
  if (!toast) return null;
  return (
    <div className={`toast ${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"}>
      {toast.message}
    </div>
  );
}
