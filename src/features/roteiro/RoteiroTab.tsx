import { useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Badge, Card } from "../../components/ui";
import { calcScore, explainScore, priorityLabel, sortDebts } from "../../lib/score";
import { fBRL, parseNumber } from "../../lib/format";
import { EPSILON } from "../../lib/constants";
import { T } from "../../app/theme";
import { Btn } from "../../components/ui/Btn";

export function RoteiroTab() {
  const debts = useAppStore((s) => s.debts);
  const settings = useAppStore((s) => s.settings);
  const log = useAppStore((s) => s.log);
  const distribute = useAppStore((s) => s.distribute);
  const toggleDone = useAppStore((s) => s.toggleDone);

  const [cashInput, setCashInput] = useState("");
  const [showExplain, setShowExplain] = useState<string | null>(null);

  const scored = useMemo(
    () =>
      debts.map((d) => ({
        ...d,
        score: calcScore(d),
        remaining: Math.max(0, (d.balance || 0) - (d.paid || 0)),
      })),
    [debts],
  );

  const sorted = useMemo(
    () => (settings.autoSort ? sortDebts(scored) : scored),
    [scored, settings.autoSort],
  );

  const nextDebt = useMemo(
    () => sorted.find((d) => !d.done && d.remaining > EPSILON),
    [sorted],
  );

  const handleDistribute = async () => {
    const amount = parseNumber(cashInput);
    if (amount <= 0) return;
    await distribute(amount);
    setCashInput("");
  };

  return (
    <div className="anim-in">
      <Card
        style={{
          marginBottom: 12,
          border: `1px solid ${T.borderActive}`,
          background: "linear-gradient(135deg,rgba(129,140,248,0.06),rgba(99,102,241,0.02))",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 6 }}>
          Recebi dinheiro — onde pagar?
        </div>
        <div style={{ fontSize: 10, color: T.muted, marginBottom: 8 }}>
          Avalanche + desconto + urgência. Saldo não infla prioridade.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                color: T.dim,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              R$
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="6.000"
              value={cashInput}
              onChange={(e) => setCashInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleDistribute();
              }}
              style={{
                width: "100%",
                padding: "11px 8px 11px 32px",
                fontSize: 17,
                fontWeight: 800,
                background: "rgba(10,15,30,0.9)",
                border: `1px solid ${T.borderActive}`,
                borderRadius: 10,
                color: T.text,
                outline: "none",
                fontFamily: T.font,
              }}
            />
          </div>
          <Btn onClick={handleDistribute} disabled={parseNumber(cashInput) <= 0} style={{ padding: "11px 18px" }}>
            Distribuir
          </Btn>
        </div>

        {log.length > 0 && log[0].allocations?.length > 0 && (
          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              background: T.okDim,
              borderRadius: 8,
              border: `1px solid ${T.ok}22`,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: T.ok, marginBottom: 4 }}>
              {fBRL(log[0].amount)} — {new Date(log[0].date).toLocaleDateString("pt-BR")}
            </div>
            {log[0].allocations.map((a, i) => (
              <div
                key={i}
                style={{ fontSize: 11, color: T.text, display: "flex", justifyContent: "space-between" }}
              >
                <span>{a.name}</span>
                <span style={{ fontWeight: 700, color: T.ok }}>{fBRL(a.pay)}</span>
              </div>
            ))}
            {log[0].leftover > EPSILON && (
              <div style={{ fontSize: 11, color: T.accent, marginTop: 4, fontWeight: 600 }}>
                Sobra: {fBRL(log[0].leftover)}
              </div>
            )}
          </div>
        )}
      </Card>

      {nextDebt && (
        <div style={{ fontSize: 11, color: T.accent, marginBottom: 10 }}>
          Próximo: <strong style={{ color: T.text }}>{nextDebt.name}</strong> — {fBRL(nextDebt.remaining)}
          {(nextDebt.discountPct || 0) > 0 && (
            <span style={{ color: T.ok }}> (desc. {nextDebt.discountPct}%!)</span>
          )}
        </div>
      )}

      {sorted.map((d, idx) => {
        const label = priorityLabel(d.score, d);
        const progress = d.balance > 0 ? Math.min(100, ((d.paid || 0) / d.balance) * 100) : 0;
        const expanded = showExplain === d.id;
        return (
          <div
            key={d.id}
            style={{
              background: d.done ? T.okDim : T.surface,
              border: `1px solid ${d.done ? T.ok + "22" : T.border}`,
              borderRadius: 10,
              marginBottom: 6,
              opacity: d.done ? 0.5 : 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
              <button
                onClick={() => void toggleDone(d.id)}
                aria-label={d.done ? "Marcar como não quitada" : "Marcar como quitada"}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  flexShrink: 0,
                  cursor: "pointer",
                  border: d.done ? `2px solid ${T.ok}` : `2px solid ${T.dim}44`,
                  background: d.done ? T.ok : "transparent",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {d.done ? "✓" : idx + 1}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: d.done ? T.ok : T.text,
                      textDecoration: d.done ? "line-through" : "none",
                    }}
                  >
                    {d.name}
                  </span>
                  <Badge type={d.type} />
                  {!d.done && (
                    <span
                      style={{
                        fontSize: 8,
                        padding: "2px 5px",
                        borderRadius: 10,
                        background: label.c + "18",
                        color: label.c,
                        fontWeight: 800,
                      }}
                    >
                      {label.t}
                    </span>
                  )}
                  {!d.done && (d.discountPct || 0) > 0 && (
                    <span
                      style={{
                        fontSize: 8,
                        padding: "2px 5px",
                        borderRadius: 10,
                        background: T.okDim,
                        color: T.ok,
                        fontWeight: 800,
                      }}
                    >
                      -{d.discountPct}%
                    </span>
                  )}
                </div>
                {d.note && <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>{d.note}</div>}
                {!d.done && (
                  <button
                    onClick={() => setShowExplain(expanded ? null : d.id)}
                    style={{
                      fontSize: 9,
                      color: T.accent,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px 0",
                      marginTop: 2,
                      textDecoration: "underline",
                      fontFamily: T.font,
                    }}
                  >
                    {expanded ? "esconder" : "por que aqui?"}
                  </button>
                )}
                {expanded && (
                  <div
                    style={{
                      fontSize: 10,
                      color: T.muted,
                      background: T.accentDim,
                      borderRadius: 6,
                      padding: "6px 8px",
                      marginTop: 4,
                      lineHeight: 1.5,
                    }}
                  >
                    <strong style={{ color: T.accent }}>Score: {d.score.toFixed(1)}</strong>
                    <br />
                    {explainScore(d)}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: d.done ? T.ok : T.text,
                    textDecoration: d.done ? "line-through" : "none",
                  }}
                >
                  {fBRL(d.balance)}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: d.done ? T.ok : label.c,
                    textTransform: "uppercase",
                  }}
                >
                  {d.done ? "QUITADO" : label.t}
                </div>
              </div>
            </div>
            {!d.done && (d.paid || 0) > EPSILON && (
              <div style={{ padding: "0 12px 8px" }}>
                <div style={{ height: 3, background: T.accentDim, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: T.accent, borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 10, color: T.accent, marginTop: 3 }}>
                  Pago: {fBRL(d.paid)} — Falta: {fBRL(d.remaining)}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div
        style={{
          marginTop: 12,
          padding: 12,
          background: T.dangerDim,
          border: `1px solid ${T.danger}22`,
          borderRadius: 10,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800, color: T.danger }}>NÃO PEGAR EMPRÉSTIMO NOVO.</div>
        <div style={{ fontSize: 10, color: "#fca5a5", marginTop: 2 }}>
          Vontade? Feche o app, espere 24h, releia o roteiro.
        </div>
      </div>
    </div>
  );
}
