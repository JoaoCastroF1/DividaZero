import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { T } from "../../app/theme";

type Variant = "primary" | "danger" | "ghost" | "success";

interface BtnProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  children: ReactNode;
  variant?: Variant;
  small?: boolean;
  style?: CSSProperties;
}

const variants: Record<Variant, CSSProperties> = {
  primary: { background: T.accent, color: "#fff" },
  danger: { background: T.dangerDim, color: T.danger, border: `1px solid ${T.danger}33` },
  ghost: { background: "transparent", color: T.muted, border: `1px solid ${T.border}` },
  success: { background: T.okDim, color: T.ok, border: `1px solid ${T.ok}33` },
};

export function Btn({ children, variant = "primary", small, style = {}, disabled, ...rest }: BtnProps) {
  return (
    <button
      disabled={disabled}
      style={{
        padding: small ? "5px 10px" : "10px 16px",
        fontSize: small ? 11 : 13,
        fontWeight: 700,
        border: "none",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s",
        ...variants[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
