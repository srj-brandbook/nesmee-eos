# Styling

Tailwind with CSS variables in `frontend/app/globals.css`.

Tokens: `bg`, `surface`, `border`, `text`, `muted`, `primary`, `danger`, `warning`, `success`.

Radius: `sm` 6 / `md` 10 / `lg` 16. Shadows: `sm` cards, `md` dropdowns, `lg` modals.

Dark mode: `class` strategy. `ThemeToggle` writes `localStorage.theme` only (never auth).

Prefer token classes over one-off hex values.
