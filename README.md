# CommandBoard.run

CommandBoard.run is the hosted product and reference implementation built on the LogicSRC open coordination standards.

This repo contains the product PWA, REST API reference service, CLI, TUI, and maintained plugin adapters used to prove the LogicSRC schemas in real workflows.

## Workspaces

```txt
apps/
  commandboard-api   REST API reference service
  commandboard-web   PWA shell
packages/
  cli                commandboard/cb command line client
  tui                terminal UI
  schemas            LogicSRC JSON schemas consumed by the product
  validators         schema validation utilities
  plugin-core        plugin manifest and loader runtime
plugins/
  coinpay            DID, wallet, payment, and escrow plugin
  ugig               jobs and gigs marketplace plugin
  sh1pt              projects, actions, releases, and delivery plugin
```

## Development

```bash
npm install
npm run check
npm --workspace @logicsrc/commandboard-web run dev
npm --workspace @logicsrc/cli run dev -- tui
```

## Production

```bash
npm run build
npm start
```

The production server serves the CommandBoard.run PWA at `/` and the reference API under `/api/*`.
