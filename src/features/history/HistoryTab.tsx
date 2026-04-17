import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Btn, Card } from "../../components/ui";
import { fBRL } from "../../lib/format";
import { EPSILON } from "../../lib/constants";
import { T } from "../../app/theme";

export function HistoryTab() {
  const log = useAppStore((s) => s.log);
  const clearLog = useAppStore((s) => s.clearLog);
  const undoLog = useAppStore((s) => s.undoLog);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState<string | null>(null);

  return (
    <div className="anim-in">
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Histórico de pagamentos</div>
      {log.length === 0 && (
        <div style={{ fontSize: 12, color: T.dim, textAlign: "center", padding: 24 }}>
          Nenhum pagamento registrado.
        </div>
      )}
      {log.map((entry) => (
        <Card key={entry.id} style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.accent }}>
              {new Date(entry.date).toLocaleDateString("pt-BR")}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: T.ok }}>{fBRL(entry.amount)}</span>
          </div>
          {entry.allocations?.map((a, j) => (
            <div
              key={j}
              style={{ fontSize: 11, color: T.text, display: "flex", justifyContent: "space-between" }}
            >
              <span>{a.name}</span>
              <span style={{ color: T.ok, fontWeight: 600 }}>{fBRL(a.pay)}</span>
            </div>
          ))}
          {entry.leftover > EPSILON && (
            <div style={{ fontSize: 10, color: T.dim, marginTop: 3 }}>Sobra: {fBRL(entry.leftover)}</div>
          )}
          <div style={{ marginTop: 6, display: "flex", gap: 6, justifyContent: "flex-end" }}>
            {confirmUndo === entry.id ? (
              <>
                <Btn
                  small
                  variant="danger"
                  onClick={async () => {
                    await undoLog(entry.id);
                    setConfirmUndo(null);
                  }}
                >
                  Confirmar
                </Btn>
                <Btn small variant="ghost" onClick={() => setConfirmUndo(null)}>
                  Não
                </Btn>
              </>
            ) : (
              <Btn small variant="ghost" onClick={() => setConfirmUndo(entry.id)}>
                Desfazer
              </Btn>
            )}
          </div>
        </Card>
      ))}
      {log.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {confirmClear ? (
            <div>
              <div style={{ fontSize: 11, color: T.danger, marginBottom: 6, textAlign: "center" }}>
                Limpar histórico não reverte saldos. Use Desfazer em cada entrada se quiser reverter.
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn
                  variant="danger"
                  small
                  onClick={async () => {
                    await clearLog();
                    setConfirmClear(false);
                  }}
                  style={{ flex: 1 }}
                >
                  Sim, limpar
                </Btn>
                <Btn variant="ghost" small onClick={() => setConfirmClear(false)}>
                  Cancelar
                </Btn>
              </div>
            </div>
          ) : (
            <Btn variant="danger" small onClick={() => setConfirmClear(true)} style={{ width: "100%" }}>
              Limpar histórico
            </Btn>
          )}
        </div>
      )}
    </div>
  );
}
