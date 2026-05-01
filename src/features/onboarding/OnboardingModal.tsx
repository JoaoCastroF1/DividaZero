import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Btn, Card, Field, Modal } from "../../components/ui";
import { parseNumber, fBRL } from "../../lib/format";
import { T } from "../../app/theme";
import { PrivacyModal } from "../privacy/PrivacyModal";

interface OnboardingModalProps {
  open: boolean;
  onFinish: () => void;
}

export function OnboardingModal({ open, onFinish }: OnboardingModalProps) {
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [incomeInput, setIncomeInput] = useState("");
  const [expensesInput, setExpensesInput] = useState("");
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const income = parseNumber(incomeInput);
  const expenses = parseNumber(expensesInput);
  const available = Math.max(0, income - expenses);

  const canAdvance = incomeInput.length > 0 && expensesInput.length > 0 && income >= 0 && expenses >= 0;

  const finish = async () => {
    await updateSettings({
      monthlyIncome: income,
      monthlyExpenses: expenses,
      onboardingComplete: true,
    });
    onFinish();
  };

  return (
    <Modal open={open} onClose={() => void 0} title={`Bem-vindo (${step}/3)`}>
      {step === 1 && (
        <div>
          <div style={{ fontSize: 13, color: T.text, marginBottom: 10, lineHeight: 1.5 }}>
            O <strong style={{ color: T.accent }}>DívidaZero</strong> é uma ferramenta para planejar a quitação de dívidas usando um motor que combina taxa de juros, desconto de quitação antecipada e urgência de vencimento.
          </div>
          <Card style={{ background: T.accentDim, border: `1px solid ${T.borderActive}`, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: T.accent, fontWeight: 700, marginBottom: 4 }}>Privacidade</div>
            <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.5, marginBottom: 6 }}>
              Seus dados ficam <strong>apenas no seu navegador</strong> (IndexedDB). Nada é enviado para servidores. Você pode exportar um backup em JSON a qualquer momento.
            </div>
            <button
              onClick={() => setPrivacyOpen(true)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: T.accent,
                fontSize: 10,
                fontFamily: T.font,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Política completa (LGPD)
            </button>
          </Card>
          <Btn onClick={() => setStep(2)} style={{ width: "100%" }}>
            Continuar
          </Btn>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 12, lineHeight: 1.5 }}>
            Para o motor calcular projeções e sugerir estratégias, precisamos saber seu orçamento mensal disponível.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
            <Field
              label="Renda mensal"
              value={incomeInput}
              onChange={setIncomeInput}
              inputMode="decimal"
              prefix="R$"
            />
            <Field
              label="Gastos fixos"
              value={expensesInput}
              onChange={setExpensesInput}
              inputMode="decimal"
              prefix="R$"
            />
          </div>
          <div style={{ fontSize: 11, color: T.ok, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>
            Disponível para dívidas: {fBRL(available)}/mês
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn variant="ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>
              Voltar
            </Btn>
            <Btn onClick={() => setStep(3)} disabled={!canAdvance} style={{ flex: 2 }}>
              Continuar
            </Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div style={{ fontSize: 13, color: T.text, marginBottom: 8, fontWeight: 700 }}>
            Tudo pronto.
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 12, lineHeight: 1.5 }}>
            Agora cadastre suas dívidas uma a uma na aba <strong style={{ color: T.accent }}>Dívidas</strong>. Se preferir explorar o app primeiro, carregue um conjunto de exemplo em <strong style={{ color: T.accent }}>Config → Dados de exemplo</strong>.
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn variant="ghost" onClick={() => setStep(2)} style={{ flex: 1 }}>
              Voltar
            </Btn>
            <Btn onClick={() => void finish()} style={{ flex: 2 }}>
              Começar
            </Btn>
          </div>
        </div>
      )}
      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </Modal>
  );
}
