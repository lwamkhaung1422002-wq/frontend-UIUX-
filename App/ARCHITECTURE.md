# Frontend architecture

The application uses English file and folder names. Myanmar is used only for
customer-facing labels and messages.

    src/
      app/          application bootstrap, theme and route registry
      features/     business capabilities and their page entry points
      components/   reusable UI building blocks
      contexts/     application-wide React state
      domain/       business calculations and rules
      services/     API and demo-data adapters
      styles/       visual tokens shared by every screen
      utils/        framework-independent helpers
      pages/        temporary compatibility layer for existing route components

New work belongs in features/<feature-name>/. A feature may use shared
components, but it must not import another feature's private implementation.

## UI maintenance

- Update color, spacing, radius, and font tokens in src/styles/tokens.css.
- Update MUI defaults in src/app/theme.js.
- Keep page-specific responsive CSS in a feature stylesheet instead of adding
  unrelated rules to a global stylesheet.
- Keep all file names in English; keep visible labels in Myanmar.

The current pages/ directory is kept only as a compatibility layer while
feature implementation files are migrated incrementally. New routes are
registered from src/app/routes.js.
