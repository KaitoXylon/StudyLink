/**
 * theme.js — Theme system for StudyInk
 * Manages UI color themes and accent customization.
 * Clean, minimalist Slate Teal and Nordic presets.
 */

const THEMES = [
  { id: 'slate', name: 'Slate Teal', accent: '#76ABAE', accentLight: '#9fd4d7', bg: '#222831', surface: '#31363F' },
  { id: 'nord', name: 'Nordic Blue', accent: '#88c0d0', accentLight: '#8fbcbb', bg: '#2e3440', surface: '#3b4252' },
  { id: 'minimal', name: 'Minimal Gray', accent: '#d1d5db', accentLight: '#f3f4f6', bg: '#111827', surface: '#1f2937' },
  { id: 'cream', name: 'Warm Cream', accent: '#424242', accentLight: '#616161', bg: '#F7F0E9', surface: '#eae3dc' },
];

class ThemeManager {
  constructor() {
    this.current = null;
    this.init();
  }

  init() {
    this.buildThemeGrid();
  }

  buildThemeGrid() {
    const grid = document.getElementById('theme-presets');
    if (!grid) return;
    grid.innerHTML = '';
    THEMES.forEach(theme => {
      const swatch = document.createElement('div');
      swatch.className = 'theme-swatch';
      swatch.title = theme.name;
      swatch.style.background = `linear-gradient(135deg, ${theme.bg}, ${theme.accent})`;
      swatch.textContent = theme.name;
      swatch.dataset.themeId = theme.id;
      swatch.addEventListener('click', () => this.applyTheme(theme));
      grid.appendChild(swatch);
    });
  }

  applyTheme(theme) {
    const root = document.documentElement;
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-light', theme.accentLight);
    root.style.setProperty('--accent-dim', `${theme.accent}26`);
    root.style.setProperty('--accent-glow', `${theme.accent}59`);
    root.style.setProperty('--bg-base', theme.bg);
    root.style.setProperty('--bg-surface', theme.surface);

    // Deriving matching elevated/card colors dynamically based on surface color
    const elevated = this.lightenHex(theme.surface, 8);
    const card = this.lightenHex(theme.surface, 16);
    root.style.setProperty('--bg-elevated', elevated);
    root.style.setProperty('--bg-card', card);

    // Update active swatch class in UI
    document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
    const sw = document.querySelector(`[data-theme-id="${theme.id}"]`);
    if (sw) sw.classList.add('active');

    this.current = theme;
    showToast(`Theme: ${theme.name}`, 'success');

    if (window.appState) window.appState.saveSettings();
  }

  applyCustomAccent(color) {
    const light = this.lightenHex(color, 20);
    const root = document.documentElement;
    root.style.setProperty('--accent', color);
    root.style.setProperty('--accent-light', light);
    root.style.setProperty('--accent-dim', `${color}26`);
    root.style.setProperty('--accent-glow', `${color}59`);
    this.current = { id: 'custom', accent: color, accentLight: light };
    showToast('Custom accent applied', 'success');
    if (window.appState) window.appState.saveSettings();
  }

  lightenHex(hex, amount) {
    let r = parseInt(hex.slice(1,3), 16);
    let g = parseInt(hex.slice(3,5), 16);
    let b = parseInt(hex.slice(5,7), 16);
    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }

  getState() {
    return { current: this.current };
  }

  restoreState(state) {
    if (!state || !state.current) {
      this.applyTheme(THEMES[0]);
      return;
    }
    const theme = THEMES.find(t => t.id === state.current.id);
    if (theme) {
      this.applyTheme(theme);
    } else if (state.current.id === 'custom' && state.current.accent) {
      // Check if the saved custom accent is purple/violet — if so, reset to Slate Teal
      const hex = state.current.accent.replace('#', '');
      const r = parseInt(hex.slice(0,2), 16);
      const g = parseInt(hex.slice(2,4), 16);
      const b = parseInt(hex.slice(4,6), 16);
      // Purple heuristic: blue dominant, red significant, low green
      const isPurple = b > 150 && r > 80 && g < 140;
      if (isPurple) {
        this.applyTheme(THEMES[0]); // Reset to Slate Teal
      } else {
        this.applyCustomAccent(state.current.accent);
      }
    } else {
      this.applyTheme(THEMES[0]);
    }
  }
}

// Global toast utility
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.classList.add('hidden'); }, 2500);
}

window.ThemeManager = ThemeManager;
window.showToast = showToast;
window.THEMES = THEMES;
