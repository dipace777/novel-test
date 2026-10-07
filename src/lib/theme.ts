export type Theme = "light" | "dark"

export const THEME_STORAGE_KEY = "novel-test-theme"

// Apply the saved theme before the page paints to avoid a light-mode flash.
export const themeInitScript = `
  (() => {
    let theme = "light";
    try {
      const savedTheme = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) ?? localStorage.getItem("trace-theme");
      if (savedTheme === "dark") theme = "dark";
    } catch {}
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  })();
`
