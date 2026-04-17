import { TYPES, type DebtType } from "../../lib/constants";

export function Badge({ type }: { type: DebtType }) {
  const t = TYPES[type] || TYPES.emprestimo;
  return (
    <span
      style={{
        fontSize: 9,
        padding: "2px 6px",
        borderRadius: 20,
        background: t.bg,
        color: t.color,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.4,
      }}
    >
      {t.label}
    </span>
  );
}
