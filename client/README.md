# StockFlow Client

React Router v7 frontend for the StockFlow multi-tenant inventory and invoicing platform.

For complete documentation, see the main [README](../README.md).

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (port 5173)
npm run dev
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with HMR |
| `npm run build` | Production build to ./build/ |
| `npm run start` | Serve production build |
| `npm run typecheck` | TypeScript type checking |

## Directory Structure

```
app/
├── routes/         # Page components
├── routes.ts       # Route definitions
└── root.tsx        # Root layout and error boundary

public/             # Static assets

.react-router/
└── types/          # Generated route types
```

## Path Aliases

- `~/*` maps to `./app/*`

## Features

- Server-side rendering (SSR)
- Hot Module Replacement (HMR)
- TailwindCSS v4 for styling
- TypeScript with strict mode