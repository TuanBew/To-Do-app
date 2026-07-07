import type { ReactNode } from "react";
import { ACCENT } from "@/lib/theme";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#faf9f6", color: "#22201c", position: "relative", overflowX: "hidden" }}>
      <div style={{ display: "flex", minHeight: "100vh", flexWrap: "wrap" }}>
        <div
          style={{
            flex: "1 1 420px",
            maxWidth: 560,
            background: ACCENT,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 56,
            color: "#ffffff",
            overflow: "hidden",
            minHeight: 320,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "radial-gradient(rgba(255,255,255,0.16) 1.5px, transparent 1.5px)",
              backgroundSize: "22px 22px",
              opacity: 0.6,
            }}
          />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", border: "2.5px solid #ffffff", position: "relative", flexShrink: 0 }}>
              <div style={{ position: "absolute", width: 15, height: 15, borderRadius: "50%", background: ACCENT, border: "2.5px solid #ffffff", top: 8, left: 8 }} />
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>Loop</span>
          </div>
          <div style={{ position: "relative", maxWidth: 420 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.8, marginBottom: 14 }}>
              Task management, refined
            </div>
            <div style={{ fontSize: 34, lineHeight: 1.28, fontWeight: 700, letterSpacing: "-0.01em" }}>
              Plan your day. Track what matters. Finish what you start.
            </div>
          </div>
          <div style={{ position: "relative", fontFamily: "var(--font-mono)", fontSize: 12, opacity: 0.7 }}>© 2026 Loop</div>
        </div>
        <div style={{ flex: "1 1 420px", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
          <div style={{ width: "100%", maxWidth: 380 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
