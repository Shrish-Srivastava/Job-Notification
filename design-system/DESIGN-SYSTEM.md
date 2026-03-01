# Job Notification App — Design System

Premium SaaS design system foundation. Calm, intentional, confident.

## Structure

```
design-system/
├── index.css          # Master import — use this
├── theme/
│   ├── tokens.css     # Colors, typography, spacing, transitions
│   └── base.css       # Reset, fonts, typography defaults
├── layout/
│   └── layout.css     # Top Bar, Context Header, Workspace, Panel, Proof Footer
└── components/
    └── components.css # Buttons, inputs, cards, prompt box, error/empty states
```

## Usage

```html
<link rel="stylesheet" href="design-system/index.css">
```

## Layout Structure

Every page follows:

1. **Top Bar** — Brand (left), Progress (center), Status badge (right)
2. **Context Header** — Serif headline + one-line subtext
3. **Main** — Primary Workspace (70%) + Secondary Panel (30%)
4. **Proof Footer** — Checklist (UI Built, Logic Working, Test Passed, Deployed)

## Tokens Reference

| Token | Value |
|-------|-------|
| `--color-bg` | #F7F6F3 |
| `--color-text` | #111111 |
| `--color-accent` | #8B0000 |
| `--color-success` | #5a6b5a |
| `--color-warning` | #8B7355 |
| `--space-1` through `--space-5` | 8, 16, 24, 40, 64px |
| `--radius` | 6px |
| `--transition` | 200ms ease-in-out |

## Component Classes

- `btn btn--primary` / `btn btn--secondary`
- `input` + `input-group` + `input-group__label`
- `card` + `card__title`
- `prompt-box` + `prompt-box__content` + `prompt-box__copy`
- `error-state` / `empty-state`
