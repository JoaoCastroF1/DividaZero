import { T } from "../../app/theme";

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      aria-label={label}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        border: "none",
        cursor: "pointer",
        background: checked ? T.accent : T.dim,
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          position: "absolute",
          top: 2,
          left: checked ? 20 : 2,
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}
