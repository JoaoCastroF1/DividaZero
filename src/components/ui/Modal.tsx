import { useEffect } from "react";
import type { ReactNode } from "react";
import { T } from "../../app/theme";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "#0f172a",
          border: `1px solid ${T.borderActive}`,
          borderRadius: 16,
          padding: 18,
          maxWidth: 460,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{title}</div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "none",
              border: "none",
              color: T.dim,
              fontSize: 18,
              cursor: "pointer",
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
