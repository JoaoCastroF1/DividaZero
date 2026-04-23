import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { T } from "./theme";
import { ErrorBoundary } from "./ErrorBoundary";
import { EPSILON } from "../lib/constants";
import { fBRL } from "../lib/format";
import { simulate, projectPayoffDate } from "../lib/strategies";
import { RoteiroTab } from "../features/roteiro/RoteiroTab";
import { DebtsTab } from "../features/debts/DebtsTab";
import { OnboardingModal } from "../features/onboarding/OnboardingModal";

const StrategiesTab = lazy(() =>
  import("../features/strategies/StrategiesTab").then((m) => ({ default: m.StrategiesTab })),
);
const HistoryTab = lazy(() =>
  import("../features/history/HistoryTab").then((m) => ({ default: m.HistoryTab })),
);
const SettingsTab = lazy(() =>
  import("../features/settings/SettingsTab").then((m) => ({ default: m.SettingsTab })),
);

type Tab = "roteiro" | "debts" | "strategies" | "history" | "settings";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "roteiro", label: "Roteiro", icon: "▶" },
  { id: "debts", label: "Dívidas", icon: "☰" },
  { id: "strategies", label: "Estratégia", icon: "∿" },
  { id: "history", label: "Histórico", icon: "⏱" },
  { id: "settings", label: "Config", icon: "⚙" },
];

function Header() {
  const debts = useAppStore((s) => s.debts);
  const settings = useAppStore((s) => s.settings);

  const { totalRemaining, totalOriginal, totalPaid, activeCount, doneCount } = useMemo(() => {
    let remaining = 0;
    let original = 0;
    let paid = 0;
    let active = 0;
    let done = 0;
    for (const d of debts) {
      original += d.balance;
      paid += d.paid || 0;
      const r = Math.max(0, (d.balance || 0) - (d.paid || 0));
      if (d.done || r <= EPSILON) {
        done += 1;
      } else {
        active += 1;
        remaining += r;
      }
    }
    return {
      totalRemaining: remaining,
      totalOriginal: original,
      totalPaid: paid,
      activeCount: active,
      doneCount: done,
    };
  }, [debts]);

  const progress = totalOriginal > 0 ? Math.min(100, (totalPaid / totalOriginal) * 100) : 0;

  const budget = Math.max(0, (settings.monthlyIncome || 0) - (settings.monthlyExpenses || 0));
  const projection = useMemo(() => {
    if (activeCount === 0 || budget <= 0) return null;
    const res = simulate(debts, budget, "score", 360);
    const date = projectPayoffDate(res.payoffMonth);
    return { months: res.payoffMonth, date };
  }, [debts, budget, activeCount]);

  return (
    <div
      style={{
        padding: "14px 16px 12px",
        background: "linear-gradient(180deg,rgba(129,140,248,0.08),transparent)",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: T.dim, fontWeight: 600, letterSpacing: 0.4 }}>DÍVIDAZERO</div>
          <div style={{ fontSize: 10, color: T.muted }}>
            {activeCount} ativas · {doneCount} quitadas
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: T.dim, fontWeight: 600 }}>A pagar</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: totalRemaining > 0 ? T.danger : T.ok }}>
            {fBRL(totalRemaining)}
          </div>
        </div>
      </div>
      <div style={{ height: 4, background: T.accentDim, borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: `linear-gradient(90deg,${T.accent},${T.ok})`,
            borderRadius: 2,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
        <span style={{ color: T.ok }}>Pago: {fBRL(totalPaid)}</span>
        <span style={{ color: T.dim }}>{progress.toFixed(1)}% concluído</span>
      </div>
      {projection && projection.date && (
        <div
          style={{
            marginTop: 8,
            padding: "6px 10px",
            background: T.accentDim,
            borderRadius: 8,
            fontSize: 11,
            color: T.accent,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          D-zero estimado:{" "}
          <strong style={{ color: T.text }}>
            {projection.date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
          </strong>{" "}
          <span style={{ color: T.muted, fontWeight: 400 }}>({projection.months}m no ritmo atual)</span>
        </div>
      )}
      {projection === null && activeCount > 0 && (
        <div style={{ marginTop: 8, fontSize: 10, color: T.warn, textAlign: "center" }}>
          Defina renda e gastos em Config para projetar D-zero.
        </div>
      )}
    </div>
  );
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      style={{
        position: "sticky",
        bottom: 0,
        display: "grid",
        gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
        background: "rgba(8,13,25,0.92)",
        backdropFilter: "blur(10px)",
        borderTop: `1px solid ${T.border}`,
        zIndex: 10,
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: "10px 4px 12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: T.font,
              color: isActive ? T.accent : T.dim,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              borderTop: isActive ? `2px solid ${T.accent}` : "2px solid transparent",
              transition: "color 0.15s ease",
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.2 }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: T.bg,
        color: T.muted,
        fontFamily: T.font,
        fontSize: 13,
      }}
    >
      Carregando…
    </div>
  );
}

function TabLoading() {
  return (
    <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: T.dim }}>
      Carregando…
    </div>
  );
}

export function App() {
  const init = useAppStore((s) => s.init);
  const loaded = useAppStore((s) => s.loaded);
  const settings = useAppStore((s) => s.settings);
  const [tab, setTab] = useState<Tab>("roteiro");
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (loaded && !settings.onboardingComplete) {
      setOnboardingOpen(true);
      setTab("roteiro");
    }
  }, [loaded, settings.onboardingComplete]);

  if (!loaded) return <Loading />;

  return (
    <ErrorBoundary>
      <div
        style={{
          minHeight: "100vh",
          background: T.bg,
          color: T.text,
          fontFamily: T.font,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Header />
        <main
          style={{
            flex: 1,
            padding: "12px 14px 20px",
            maxWidth: 640,
            width: "100%",
            margin: "0 auto",
          }}
        >
          {tab === "roteiro" && <RoteiroTab />}
          {tab === "debts" && <DebtsTab />}
          <Suspense fallback={<TabLoading />}>
            {tab === "strategies" && <StrategiesTab />}
            {tab === "history" && <HistoryTab />}
            {tab === "settings" && <SettingsTab />}
          </Suspense>
        </main>
        <TabBar active={tab} onChange={setTab} />
        <OnboardingModal
          open={onboardingOpen}
          onFinish={() => {
            setOnboardingOpen(false);
            setTab("debts");
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
