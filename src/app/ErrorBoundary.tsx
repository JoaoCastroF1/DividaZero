import { Component, type ErrorInfo, type ReactNode } from "react";
import { T } from "./theme";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("App error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 20,
            background: T.bg,
            color: T.text,
            fontFamily: T.font,
            minHeight: "100vh",
          }}
        >
          <div
            style={{
              maxWidth: 500,
              margin: "40px auto",
              padding: 20,
              background: T.dangerDim,
              border: `1px solid ${T.danger}33`,
              borderRadius: 12,
            }}
          >
            <div
              style={{ fontSize: 16, fontWeight: 700, color: T.danger, marginBottom: 8 }}
            >
              Algo deu errado
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>
              {this.state.error?.message || "Erro desconhecido"}
            </div>
            <button
              onClick={() => this.setState({ error: null })}
              style={{
                padding: "8px 16px",
                background: T.accent,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
