import { useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Btn, Card, Field } from "../../components/ui";
import { compareStrategies, projectPayoffDate, type Strategy } from "../../lib/strategies";
import { fBRL, parseNumber } from "../../lib/format";
import { T } from "../../app/theme";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STRATEGY_LABEL: Record<Strategy, string> = {
  avalanche: "Avalanche",
  snowball: "Bola-de-neve",
  score: "Score v3",
};

const STRATEGY_COLOR: Record<Strategy, string> = {
  avalanche: "#34d399",
  snowball: "#fbbf24",
  score: "#818cf8",
};

export function StrategiesTab() {
  const debts = useAppStore((s) => s.debts);
  const settings = useAppStore((s) => s.settings);

  const defaultBudget = Math.max(
    0,
    (settings.monthlyIncome || 0) - (settings.monthlyExpenses || 0),
  );
  const [budgetInput, setBudgetInput] = useState(String(defaultBudget));
  const budget = parseNumber(budgetInput);

  const activeDebts = useMemo(() => debts.filter((d) => !d.done), [debts]);

  const results = useMemo(() => {
    if (activeDebts.length === 0 || budget <= 0) return null;
    return compareStrategies(debts, budget, 360);
  }, [debts, budget, activeDebts.length]);

  const chartData = useMemo(() => {
    if (!results) return [];
    const maxMonths = Math.max(
      results.avalanche.months.length,
      results.snowball.months.length,
      results.score.months.length,
    );
    const data: Array<Record<string, number>> = [];
    for (let i = 0; i < maxMonths; i++) {
      const row: Record<string, number> = { month: i };
      (["avalanche", "snowball", "score"] as Strategy[]).forEach((s) => {
        const snap = results[s].months[i];
        if (snap) row[s] = Math.round(snap.totalRemaining);
      });
      data.push(row);
    }
    return data;
  }, [results]);

  if (activeDebts.length === 0) {
    return (
      <div className="anim-in">
        <Card>
          <div style={{ fontSize: 12, color: T.muted, textAlign: "center", padding: 20 }}>
            Nenhuma dívida ativa. Adicione dívidas para simular estratégias.
          </div>
        </Card>
      </div>
    );
  }

  const avalanche = results?.avalanche;
  const snowball = results?.snowball;
  const score = results?.score;
  const bestInterest = results
    ? Math.min(avalanche!.totalInterestPaid, snowball!.totalInterestPaid, score!.totalInterestPaid)
    : 0;
  const worstInterest = results
    ? Math.max(avalanche!.totalInterestPaid, snowball!.totalInterestPaid, score!.totalInterestPaid)
    : 0;
  const savings = worstInterest - bestInterest;

  return (
    <div className="anim-in">
      <Card style={{ marginBottom: 10, border: `1px solid ${T.borderActive}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 6 }}>
          Simulador de estratégias
        </div>
        <div style={{ fontSize: 10, color: T.muted, marginBottom: 8 }}>
          Aplica juros mensais, paga mínimos e aloca sobra pela estratégia escolhida até quitar tudo.
        </div>
        <Field
          label="Orçamento mensal"
          value={budgetInput}
          onChange={setBudgetInput}
          inputMode="decimal"
          prefix="R$"
        />
        {budget <= 0 && (
          <div style={{ fontSize: 11, color: T.warn, marginTop: 4 }}>
            Defina um orçamento maior que zero para simular.
          </div>
        )}
      </Card>

      {results && savings > 1 && (
        <Card style={{ marginBottom: 10, background: T.okDim, border: `1px solid ${T.ok}33` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.ok }}>
            Escolhendo a melhor estratégia você economiza {fBRL(savings)} em juros.
          </div>
        </Card>
      )}

      {results && (
        <>
          <Card style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.accent, marginBottom: 8 }}>
              Comparativo
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: T.dim, textAlign: "left" }}>
                    <th style={{ padding: "4px 6px", fontWeight: 600 }}>Estratégia</th>
                    <th style={{ padding: "4px 6px", fontWeight: 600, textAlign: "right" }}>D-zero</th>
                    <th style={{ padding: "4px 6px", fontWeight: 600, textAlign: "right" }}>Juros</th>
                  </tr>
                </thead>
                <tbody>
                  {(["avalanche", "snowball", "score"] as Strategy[]).map((s) => {
                    const r = results[s];
                    const date = projectPayoffDate(r.payoffMonth);
                    const isBest = r.totalInterestPaid === bestInterest;
                    return (
                      <tr
                        key={s}
                        style={{ borderTop: `1px solid ${T.border}`, color: isBest ? T.ok : T.text }}
                      >
                        <td style={{ padding: "6px 6px", fontWeight: 700 }}>
                          <span style={{ color: STRATEGY_COLOR[s] }}>●</span> {STRATEGY_LABEL[s]}
                          {isBest && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 8,
                                padding: "1px 5px",
                                borderRadius: 10,
                                background: T.okDim,
                                color: T.ok,
                              }}
                            >
                              MELHOR
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "6px 6px", textAlign: "right" }}>
                          {r.payoffMonth != null
                            ? `${r.payoffMonth}m${date ? ` · ${date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}` : ""}`
                            : "—"}
                        </td>
                        <td style={{ padding: "6px 6px", textAlign: "right", fontWeight: 700 }}>
                          {fBRL(r.totalInterestPaid)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {results.avalanche.insufficientBudget && (
              <div style={{ fontSize: 10, color: T.warn, marginTop: 6 }}>
                Orçamento abaixo dos mínimos — simulação pode não quitar.
              </div>
            )}
          </Card>

          <Card style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.accent, marginBottom: 8 }}>
              Saldo ao longo do tempo
            </div>
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis
                    dataKey="month"
                    stroke={T.dim}
                    fontSize={10}
                    tickFormatter={(v: number) => (v === 0 ? "hoje" : `${v}m`)}
                  />
                  <YAxis
                    stroke={T.dim}
                    fontSize={10}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: `1px solid ${T.borderActive}`,
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(value: number) => fBRL(value)}
                    labelFormatter={(label: number) => `Mês ${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {(["avalanche", "snowball", "score"] as Strategy[]).map((s) => (
                    <Line
                      key={s}
                      type="monotone"
                      dataKey={s}
                      name={STRATEGY_LABEL[s]}
                      stroke={STRATEGY_COLOR[s]}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <PayoffOrder results={results} />
        </>
      )}
    </div>
  );
}

function PayoffOrder({
  results,
}: {
  results: ReturnType<typeof compareStrategies>;
}) {
  const [active, setActive] = useState<Strategy>("avalanche");
  const order = results[active].payoffOrder;
  return (
    <Card>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.accent, marginBottom: 8 }}>
        Ordem de quitação
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
        {(["avalanche", "snowball", "score"] as Strategy[]).map((s) => (
          <Btn
            key={s}
            small
            variant={active === s ? "primary" : "ghost"}
            onClick={() => setActive(s)}
          >
            {STRATEGY_LABEL[s]}
          </Btn>
        ))}
      </div>
      {order.length === 0 ? (
        <div style={{ fontSize: 11, color: T.dim }}>Nenhuma quitação no prazo simulado.</div>
      ) : (
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 11, color: T.text }}>
          {order.map((o, i) => (
            <li key={o.debtId} style={{ padding: "3px 0" }}>
              <strong style={{ color: T.text }}>{o.name}</strong>
              <span style={{ color: T.dim }}> — mês {o.month}</span>
              {i === 0 && (
                <span style={{ marginLeft: 6, fontSize: 9, color: T.ok, fontWeight: 700 }}>PRIMEIRA</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
