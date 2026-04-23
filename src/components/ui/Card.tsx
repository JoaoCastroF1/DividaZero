import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { T } from "../../app/theme";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  style?: CSSProperties;
}

export function Card({ children, style = {}, ...rest }: CardProps) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.r,
        padding: "12px 14px",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
