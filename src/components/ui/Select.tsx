import { T } from "../../app/theme";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}

export function Select({ label, value, onChange, options }: SelectProps) {
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
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: 8,
          fontSize: 13,
          background: "rgba(10,15,30,0.8)",
          border: `1px solid ${T.border}`,
          borderRadius: 7,
          color: T.text,
          fontFamily: T.font,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
