# coin-poc — Claude Rules

## UI Responsiveness (ALWAYS enforce)

The dashboard UI must be fully responsive at all screen sizes. Every change to `ui/` must work cleanly on:
- Mobile: 375px (iPhone SE / standard)
- Tablet: 768px
- Desktop: 1200px+

### Rules
- **No horizontal scroll** at any width
- **Grids must stack** to 1 column at ≤ 480px
- **Tab bar must scroll** horizontally on mobile, never clip or wrap
- **Header** must stay on one line — hide long text on small screens if needed
- **Text must never overflow** its container — use `word-break: break-all` on addresses/hashes
- **Touch targets** (buttons, tabs, checklist items) must be at least 44px tall on mobile
- **All breakpoints** use `max-width` media queries: 480px, 640px, 768px, 900px

### Breakpoint reference
```
≤ 480px  — single column everything, compact header
≤ 640px  — checklist 1 column
≤ 768px  — tablet adjustments
≤ 900px  — two-col stacks, actions 2-col
≤ 1200px — max content width
```

## Stack
- Vanilla HTML/CSS/JS — no build step
- Served via `npx serve ui` on port 3456
- ethers.js v6 via CDN for wallet + contract calls

## Key files
- `ui/index.html` — all tabs and markup
- `ui/style.css` — all styles (no frameworks)
- `ui/app.js` — config, wallet, on-chain logic, tooltips
- `config/*.json` — token, network, deployed config
- `config/lineascan-submission.md` — pre-filled Lineascan form values
