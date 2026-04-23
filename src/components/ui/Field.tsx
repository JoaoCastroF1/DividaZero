import type { InputHTMLAttributes } from "react";
import { T } from "../../app/theme";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label?: string;
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  prefix?: string;
}

export function Field({ label, value, onChange, prefix, type = "text", ...rest }: FieldProps) {
  return (
    <div style={{ marginBottom: 8 }}>
      {label && (
        <div
          style={{
            fontSize: 10,
            color: T.dim,
            marginBottom: 3,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {label}
        </div>
      )}
      <div style={{ position: "relative" }}>
        {prefix && (
          <span
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: T.dim,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: prefix ? "8px 8px 8px 30px" : "8px",
            fontSize: 13,
            background: "rgba(10,15,30,0.8)",
            border: `1px solid ${T.border}`,
            borderRadius: 7,
            color: T.text,
            outline: "none",
            fontFamily: T.font,
          }}
          {...rest}
        />
      </div>
    </div>
  );
}
