# DívidaZero

Plano de eliminação de dívidas — PWA mobile-first com motor v3 (avalanche + desconto + urgência), simulador de estratégias e persistência local.

## Stack

- Vite + React 18 + TypeScript (strict)
- Zustand (estado) + Dexie/IndexedDB (persistência)
- React Hook Form + Zod (formulários)
- Recharts (gráficos de estratégia)
- vite-plugin-pwa (offline/install)
- Vitest (testes)

## Scripts

```bash
npm install
npm run dev        # http://localhost:5173
npm run test       # motor + formato + estratégias
npm run build      # typecheck + bundle + PWA
npm run preview    # serve dist/
```

## Estrutura

```
src/
  app/           shell, tema, error boundary
  components/ui/ Btn, Card, Field, Select, Modal, Badge, Toggle
  features/      roteiro, debts, strategies, history, settings
  lib/           score, strategies, format, validation, db, constants
  store/         useAppStore (zustand)
tests/lib/       39 testes (score, format, strategies)
```

## Funcionalidades

- **Roteiro**: distribui dinheiro recebido segundo o score (avalanche + desconto + urgência), mostra ordem, explica prioridade.
- **Dívidas**: CRUD com validação Zod, simulador de desconto inline.
- **Estratégias**: compara avalanche × bola-de-neve × score com gráfico Recharts, ordem de quitação e projeção.
- **Histórico**: log de pagamentos com undo por entrada.
- **Config**: renda/gastos, export/import JSON, reset.
- **PWA**: instalável, funciona offline.

## Persistência

Local apenas — IndexedDB via Dexie. Sem backend, sem login. Backup via Exportar/Importar JSON em Config.
