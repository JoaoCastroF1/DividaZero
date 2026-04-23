import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Badge, Btn, Card, Modal } from "../../components/ui";
import { calcScore, priorityLabel } from "../../lib/score";
import { fBRL, fPct } from "../../lib/format";
import { T } from "../../app/theme";
import { DebtForm } from "./DebtForm";
import type { Debt } from "../../lib/constants";

type EditingState = { mode: "new" } | { mode: "edit"; debt: Debt } | null;

export function DebtsTab() {
  const debts = useAppStore((s) => s.debts);
  const settings = useAppStore((s) => s.settings);
  const saveDebt = useAppStore((s) => s.saveDebt);
  const deleteDebt = useAppStore((s) => s.deleteDebt);
  const moveUp = useAppStore((s) => s.moveUp);
  const [editing, setEditing] = useState<EditingState>(null);

  const handleSave = async (d: Debt) => {
    await saveDebt(d);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    await deleteDebt(id);
    setEditing(null);
  };

  return (
    <div className="anim-in">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700 }}>{debts.length} dívidas</span>
        <Btn small onClick={() => setEditing({ mode: "new" })}>
          + Adicionar
        </Btn>
      </div>
      {debts.length > 0 && (
        <Card style={{ marginBottom: 10, background: T.accentDim }}>
          <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.5 }}>
            <strong style={{ color: T.ok }}>Desconto:</strong> simule no app do banco e insira o % aqui.
            Dívidas com desconto sobem no ranking (taxa efetiva considera a economia da quitação antecipada).
          </div>
        </Card>
      )}
      {debts.length === 0 && (
        <Card style={{ marginBottom: 10, textAlign: "center", padding: "24px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 }}>
            Nenhuma dívida cadastrada
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 12, lineHeight: 1.5 }}>
            Adicione suas dívidas para que o motor calcule a ordem ideal de quitação.
          </div>
          <Btn onClick={() => setEditing({ mode: "new" })}>Adicionar primeira dívida</Btn>
        </Card>
      )}
      {debts.map((d, i) => {
        const score = calcScore(d);
        const label = priorityLabel(score, d);
        return (
          <Card
            key={d.id}
            style={{ marginBottom: 6, cursor: "pointer" }}
            onClick={() => setEditing({ mode: "edit", debt: d })}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 2 }}>
                  <span style={{ fontSize: 11, color: T.dim, fontWeight: 700 }}>#{i + 1}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: d.done ? T.ok : T.text }}>{d.name}</span>
                  <Badge type={d.type} />
                  {d.done ? (
                    <span
                      style={{
                        fontSize: 8,
                        padding: "1px 5px",
                        borderRadius: 10,
                        background: T.okDim,
                        color: T.ok,
                        fontWeight: 700,
                      }}
                    >
                      QUITADO
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 8,
                        padding: "1px 5px",
                        borderRadius: 10,
                        background: label.c + "18",
                        color: label.c,
                        fontWeight: 700,
                      }}
                    >
                      Score {score.toFixed(0)}
                    </span>
                  )}
                  {(d.discountPct || 0) > 0 && (
                    <span
                      style={{
                        fontSize: 8,
                        padding: "1px 5px",
                        borderRadius: 10,
                        background: T.okDim,
                        color: T.ok,
                        fontWeight: 700,
                      }}
                    >
                      -{d.discountPct}%
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: T.dim }}>
                  Taxa: {fPct(d.rate)} | Pen: {fPct(d.penaltyRate || 0)} | Desc: {d.discountPct || 0}%
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{fBRL(d.balance)}</div>
                {(d.paid || 0) > 0 && <div style={{ fontSize: 10, color: T.ok }}>Pago: {fBRL(d.paid)}</div>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
              {i > 0 && !settings.autoSort && (
                <Btn
                  small
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    void moveUp(d.id);
                  }}
                >
                  ↑
                </Btn>
              )}
              <Btn
                small
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing({ mode: "edit", debt: d });
                }}
              >
                Editar
              </Btn>
            </div>
          </Card>
        );
      })}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.mode === "new" ? "Nova dívida" : "Editar dívida"}
      >
        {editing !== null && (
          <DebtForm
            debt={editing.mode === "edit" ? editing.debt : null}
            onSave={handleSave}
            onDelete={handleDelete}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
