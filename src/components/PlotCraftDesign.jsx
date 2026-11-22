import React from "react";

/* ============ PlotCraft design system: one shared layer for every screen.
   Typography, layered surfaces, hairline borders, buttons, inputs, eyebrows, scrollbars.
   Scoped to .plotcraft-shell (dashboard) and .wx (welcome) so nothing leaks elsewhere. ============ */
const DESIGN_CSS = `
.plotcraft-shell, .wx {
  --pcd-font-display: "Segoe UI Variable Display", "Aptos Display", "Inter Display", Inter, system-ui, sans-serif;
  --pcd-font-body: "Segoe UI Variable", "Aptos", Inter, system-ui, sans-serif;
  --pcd-hair: rgba(15, 23, 42, 0.08);
  --pcd-lift: 0 1px 0 rgba(255, 255, 255, 0.7) inset, 0 1px 2px rgba(15, 23, 42, 0.04), 0 14px 34px -16px rgba(15, 23, 42, 0.14);
  --pcd-lift-hover: 0 1px 0 rgba(255, 255, 255, 0.7) inset, 0 2px 4px rgba(15, 23, 42, 0.05), 0 26px 52px -18px rgba(15, 23, 42, 0.22);
  --pcd-radius-lg: 22px;
  --pcd-radius-md: 14px;
  font-family: var(--pcd-font-body);
  font-feature-settings: "ss01", "cv11", "tnum" 0;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.plotcraft-shell[data-theme="dream"], .plotcraft-shell[data-theme="rgbclr"], .plotcraft-shell[data-theme="cyberpunk"] {
  --pcd-hair: rgba(255, 255, 255, 0.09);
  --pcd-lift: 0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 18px 40px -18px rgba(0, 0, 0, 0.6);
  --pcd-lift-hover: 0 1px 0 rgba(255, 255, 255, 0.08) inset, 0 28px 60px -20px rgba(0, 0, 0, 0.7);
}

/* typography */
.plotcraft-shell h1, .plotcraft-shell h2, .plotcraft-shell h3,
.wx h1, .wx h2, .wx h3 { font-family: var(--pcd-font-display); letter-spacing: -0.035em; font-weight: 700; }
.plotcraft-shell p, .plotcraft-shell label, .plotcraft-shell span { font-variant-numeric: tabular-nums; }
.plotcraft-shell .pc-eyebrow {
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.6;
}
.plotcraft-shell p.uppercase, .plotcraft-shell span.uppercase { letter-spacing: 0.14em; }

/* layered surfaces: cards, panels and sections in the main area */
.plotcraft-shell main .rounded-3xl:not(button):not(input):not(textarea):not(select) {
  background-color: var(--pc-card, transparent);
  border: 1px solid var(--pcd-hair) !important;
  border-radius: var(--pcd-radius-lg);
  box-shadow: var(--pcd-lift);
  transition: box-shadow 0.5s cubic-bezier(.16,1,.3,1), border-color 0.4s ease, transform 0.5s cubic-bezier(.16,1,.3,1);
}
.plotcraft-shell main .rounded-3xl:not(button):not(input):not(textarea):not(select):hover {
  box-shadow: var(--pcd-lift-hover);
}
.plotcraft-shell main .rounded-2xl:not(button):not(input):not(textarea):not(select) {
  border-radius: var(--pcd-radius-md);
}

/* buttons: crisp, pressable, with a soft top sheen */
.plotcraft-shell button:not(:disabled) { cursor: pointer; }
.plotcraft-shell button:disabled { opacity: 0.45; cursor: not-allowed; }
.plotcraft-shell main button.rounded-xl, .plotcraft-shell main button.rounded-2xl {
  position: relative; overflow: hidden; isolation: isolate;
}
.plotcraft-shell main button.rounded-xl::after, .plotcraft-shell main button.rounded-2xl::after {
  content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background: linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,0) 55%);
  opacity: 0.6;
}

/* inputs: inset depth and calm focus */
.plotcraft-shell input:not([type="range"]):not([type="checkbox"]):not([type="radio"]),
.plotcraft-shell textarea, .plotcraft-shell select {
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.06);
  border: 1px solid var(--pcd-hair);
}

/* scrollbars */
.plotcraft-shell *, .wx * { scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--pc-accent, #7c3aed) 40%, transparent) transparent; }

/* selection */
.plotcraft-shell ::selection, .wx ::selection { background: color-mix(in srgb, var(--pc-accent, #7c3aed) 26%, transparent); }

/* sidebar: quiet hairline and subtle depth */
.plotcraft-shell aside { border-right: 1px solid var(--pcd-hair); }
.plotcraft-shell aside button { border-radius: 12px; }

/* headers and dividers */
.plotcraft-shell header { box-shadow: 0 1px 0 var(--pcd-hair), 0 10px 30px -22px rgba(15, 23, 42, 0.35); }

/* premium empty state, for screens that have nothing yet */
.pcd-empty {
  display: grid; place-items: center; text-align: center; gap: 10px;
  padding: 48px 24px; border-radius: var(--pcd-radius-lg);
  border: 1px dashed color-mix(in srgb, var(--pc-accent, #7c3aed) 35%, transparent);
  background: radial-gradient(70% 60% at 50% 0%, color-mix(in srgb, var(--pc-accent, #7c3aed) 10%, transparent), transparent 70%);
}
.pcd-empty h4 { font-family: var(--pcd-font-display); font-size: 17px; font-weight: 700; letter-spacing: -0.02em; }
.pcd-empty p { font-size: 13px; opacity: 0.7; max-width: 340px; }

@media (prefers-reduced-motion: reduce) {
  .plotcraft-shell *, .wx * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
`;

export default function PlotCraftDesign() {
  return <style>{DESIGN_CSS}</style>;
}

/* Optional helpers for screens being rebuilt */
export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="pcd-empty">
      {Icon && <Icon size={26} style={{ color: "var(--pc-accent, #7c3aed)" }} />}
      <h4>{title}</h4>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function SectionHeader({ eyebrow, title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
      <div>
        {eyebrow && <div className="pc-eyebrow">{eyebrow}</div>}
        <h2 style={{ fontSize: 24, marginTop: eyebrow ? 6 : 0 }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}