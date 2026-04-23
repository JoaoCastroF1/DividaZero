import { useState } from "react";
import { useForm } from "react-hook-form";
import type { Debt, DebtType } from "../../lib/constants";
import { TYPES } from "../../lib/constants";
import { Btn, Field, Select } from "../../components/ui";
import { normalizeDebt } from "../../lib/validation";
import { uid, clamp, parseNumber, fBRL, fPct } from "../../lib/format";
import { T } from "../../app/theme";

interface FormValues {
  name: string;
  type: DebtType;
  balance: string;
  rate: string;
  penaltyRate: string;
  graceDaysLeft: string;
  dueDate: string;
  discountPct: string;
  minPayment: string;
  note: string;
  paid: string;
}

interface DebtFormProps {
  debt: Debt | null;
  onSave: (debt: Debt) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}

export function DebtForm({ debt, onSave, onDelete, onCancel }: DebtFormProps) {
  const { handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      name: debt?.name || "",
      type: debt?.type || "emprestimo",
      balance: debt?.balance?.toString() || "",
      rate: debt?.rate?.toString() || "0",
      penaltyRate: debt?.penaltyRate?.toString() || "",
      graceDaysLeft: debt?.graceDaysLeft?.toString() || "0",
      dueDate: debt?.dueDate || "",
      discountPct: debt?.discountPct?.toString() || "0",
      minPayment: debt?.minPayment?.toString() || "",
      note: debt?.note || "",
      paid: debt?.paid?.toString() || "0",
    },
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const values = watch();

  const set = (key: keyof FormValues) => (v: string) =>
    setValue(key, v as never, { shouldDirty: true });

  const discount = clamp(parseNumber(values.discountPct), 0, 99.99);
  const balance = parseNumber(values.balance);
  const rate = parseNumber(values.rate);

  const submit = handleSubmit((vals) => {
    const normalized = normalizeDebt({
      id: debt?.id || uid(),
      name: vals.name,
      type: vals.type,
      balance: parseNumber(vals.balance),
      rate: parseNumber(vals.rate),
      penaltyRate: parseNumber(vals.penaltyRate),
      graceDaysLeft: parseInt(vals.graceDaysLeft) || 0,
      dueDate: vals.dueDate,
      discountPct: parseNumber(vals.discountPct),
      minPayment: parseNumber(vals.minPayment),
      note: vals.note,
      paid: parseNumber(vals.paid),
      done: debt?.done || false,
    });
    if (normalized) onSave(normalized);
  });

  return (
    <form onSubmit={submit}>
      <Field label="Nome" value={values.name} onChange={set("name")} placeholder="Ex: Fatura Nubank" maxLength={80} />
      <Select
        label="Tipo"
        value={values.type}
        onChange={set("type")}
        options={Object.entries(TYPES).map(([k, v]) => ({ value: k, label: v.label }))}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <Field label="Saldo devedor" value={values.balance} onChange={set("balance")} inputMode="decimal" prefix="R$" />
        <Field label="Pgto mínimo" value={values.minPayment} onChange={set("minPayment")} inputMode="decimal" prefix="R$" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <Field label="Taxa atual (% a.m.)" value={values.rate} onChange={set("rate")} inputMode="decimal" placeholder="0 se carência" />
        <Field label="Taxa penalidade (% a.m.)" value={values.penaltyRate} onChange={set("penaltyRate")} inputMode="decimal" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        <Field label="Carência (dias)" value={values.graceDaysLeft} onChange={set("graceDaysLeft")} inputMode="numeric" />
        <Field label="Vencimento" value={values.dueDate} onChange={set("dueDate")} type="date" />
        <Field label="Desconto %" value={values.discountPct} onChange={set("discountPct")} inputMode="decimal" />
      </div>
      {discount > 0 && discount < 100 && balance > 0 && (
        <div
          style={{
            fontSize: 11,
            color: T.ok,
            fontWeight: 600,
            marginBottom: 8,
            padding: "6px 8px",
            background: T.okDim,
            borderRadius: 6,
          }}
        >
          Desc. {discount.toFixed(2).replace(".", ",")}%: taxa efetiva{" "}
          {fPct(rate / (1 - discount / 100))} · Paga{" "}
          {fBRL(balance * (1 - discount / 100))} · Economia{" "}
          {fBRL((balance * discount) / 100)}
        </div>
      )}
      <Field label="Já pago (R$)" value={values.paid} onChange={set("paid")} inputMode="decimal" prefix="R$" />
      <Field label="Observação" value={values.note} onChange={set("note")} placeholder="Detalhes" maxLength={200} />
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <Btn type="submit" disabled={balance <= 0} style={{ flex: 1 }}>
          {debt?.id ? "Salvar" : "Adicionar"}
        </Btn>
        {debt?.id &&
          (confirmDelete ? (
            <>
              <Btn type="button" variant="danger" onClick={() => onDelete(debt.id)}>
                Confirmar
              </Btn>
              <Btn type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Não
              </Btn>
            </>
          ) : (
            <Btn type="button" variant="danger" onClick={() => setConfirmDelete(true)}>
              Excluir
            </Btn>
          ))}
        <Btn type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Btn>
      </div>
    </form>
  );
}
