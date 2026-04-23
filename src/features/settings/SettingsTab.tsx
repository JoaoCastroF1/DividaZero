import { useRef, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Btn, Card, Field, Toggle } from "../../components/ui";
import { fBRL, parseNumber } from "../../lib/format";
import { T } from "../../app/theme";
import { exportSchema } from "../../lib/validation";
import { normalizeDebt } from "../../lib/validation";
import type { Debt, LogEntry, Settings } from "../../lib/constants";
import { DEFAULT_SETTINGS } from "../../lib/constants";

export function SettingsTab() {
  const settings = useAppStore((s) => s.settings);
  const debts = useAppStore((s) => s.debts);
  const log = useAppStore((s) => s.log);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const reset = useAppStore((s) => s.reset);
  const replaceAll = useAppStore((s) => s.replaceAll);

  const [confirmReset, setConfirmReset] = useState(false);
  const [importMsg, setImportMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const payload = { version: 1, debts, log, settings };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dividazero-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    setImportMsg(null);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text);
        const schema = exportSchema.parse(parsed);
        const importedDebts = schema.debts
          .map((d) => normalizeDebt(d))
          .filter((d): d is Debt => d !== null);
        const importedLog = schema.log as LogEntry[];
        const importedSettings: Settings = { ...DEFAULT_SETTINGS, ...schema.settings };
        await replaceAll(importedDebts, importedLog, importedSettings);
        setImportMsg({ kind: "ok", text: `Importadas ${importedDebts.length} dívidas.` });
      } catch (e) {
        setImportMsg({ kind: "err", text: e instanceof Error ? e.message : "Arquivo inválido." });
      }
    };
    reader.onerror = () => setImportMsg({ kind: "err", text: "Erro ao ler arquivo." });
    reader.readAsText(file);
  };

  const available = Math.max(0, (settings.monthlyIncome || 0) - (settings.monthlyExpenses || 0));

  return (
    <div className="anim-in">
      <Card style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 8 }}>Renda e Gastos</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <Field
            label="Renda mensal"
            value={settings.monthlyIncome}
            onChange={(v) => void updateSettings({ monthlyIncome: parseNumber(v) })}
            inputMode="decimal"
            prefix="R$"
          />
          <Field
            label="Gastos fixos"
            value={settings.monthlyExpenses}
            onChange={(v) => void updateSettings({ monthlyExpenses: parseNumber(v) })}
            inputMode="decimal"
            prefix="R$"
          />
        </div>
        <div style={{ fontSize: 12, color: T.ok, fontWeight: 700 }}>
          Disponível: {fBRL(available)}/mês
        </div>
      </Card>

      <Card style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 8 }}>Motor v3</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Toggle
            checked={settings.autoSort}
            onChange={(next) => void updateSettings({ autoSort: next })}
            label="Auto-ordenar por score"
          />
          <span style={{ fontSize: 12 }}>Auto-ordenar por score</span>
        </div>
        <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.6 }}>
          <code style={{ color: T.accent }}>score = taxa/(1-desc%) + (ameaça × urgência)</code>
          <br />
          Taxa maior = primeiro (avalanche). Desconto amplifica taxa efetiva. Vencimento próximo = boost. Saldo
          não infla. Empate = menor saldo.
        </div>
      </Card>

      <Card style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 8 }}>Tom dos textos</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Toggle
            checked={settings.motivationalMode}
            onChange={(next) => void updateSettings({ motivationalMode: next })}
            label="Modo motivacional"
          />
          <span style={{ fontSize: 12 }}>Modo motivacional</span>
        </div>
        <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.5 }}>
          Liga mensagens diretas e enfáticas (ex: "NÃO PEGAR EMPRÉSTIMO NOVO"). Por padrão, o app usa tom neutro adequado a contexto profissional.
        </div>
      </Card>

      <Card style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 8 }}>Backup</div>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn onClick={handleExport} style={{ flex: 1 }} variant="success">
            Exportar JSON
          </Btn>
          <Btn onClick={() => fileRef.current?.click()} variant="ghost" style={{ flex: 1 }}>
            Importar JSON
          </Btn>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }}
          />
        </div>
        {importMsg && (
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              padding: "6px 8px",
              borderRadius: 6,
              background: importMsg.kind === "ok" ? T.okDim : T.dangerDim,
              color: importMsg.kind === "ok" ? T.ok : T.danger,
            }}
          >
            {importMsg.text}
          </div>
        )}
      </Card>

      <Card style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.danger, marginBottom: 8 }}>Resetar</div>
        {!confirmReset ? (
          <Btn variant="danger" onClick={() => setConfirmReset(true)} style={{ width: "100%" }}>
            Resetar tudo
          </Btn>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: T.danger, marginBottom: 6 }}>
              Tem certeza? Todos os dados serão apagados.
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn
                variant="danger"
                onClick={async () => {
                  await reset();
                  setConfirmReset(false);
                }}
                style={{ flex: 1 }}
              >
                Sim, resetar
              </Btn>
              <Btn variant="ghost" onClick={() => setConfirmReset(false)}>
                Não
              </Btn>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: 10, color: T.dim }}>
          DívidaZero · Motor avalanche + desconto + simulador · Dados locais (IndexedDB)
        </div>
      </Card>
    </div>
  );
}
