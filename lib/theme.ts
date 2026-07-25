export type Theme = "dark" | "light";

// Single source of truth for both modes, mirrored by the :root rules in
// globals.css (which handle first paint before any JS runs) and applied here
// as direct inline styles on toggle — inline styles win over any stylesheet
// rule unconditionally, so a theme switch can never be silently lost to a
// cascade/specificity/layer quirk once JS is running.
const PALETTES: Record<Theme, Record<string, string>> = {
  dark: {
    "--surface": "#0d0d0d",
    "--surface-raised": "#1a1a19",
    "--ink-primary": "#ffffff",
    "--ink-secondary": "#c3c2b7",
    "--ink-muted": "#898781",
    "--hairline": "#2c2c2a",
    "--border": "rgba(255, 255, 255, 0.1)",
  },
  light: {
    "--surface": "#f9f9f7",
    "--surface-raised": "#fcfcfb",
    "--ink-primary": "#0b0b0b",
    "--ink-secondary": "#52514e",
    "--ink-muted": "#898781",
    "--hairline": "#e1e0d9",
    "--border": "rgba(11, 11, 11, 0.1)",
  },
};

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(PALETTES[theme])) {
    root.style.setProperty(prop, value);
  }
  root.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}
