---
paths: "cli/**/*.ts"
---

# CLI Development Rules

The CLI lives in `cli/` and is built with tsup into `dist/cli/index.mjs`. It is a workspace package (`pnpm-workspace.yaml`) but is NOT published separately — it's bundled into the root npm package.

## Architecture

```
cli/
├── src/
│   ├── index.ts           # Entry point, command dispatch
│   ├── commands/           # One file per command (init, start, stop, restart, update, doctor, reset)
│   ├── lib/                # Shared logic (prerequisites, install, database, vault, config, etc.)
│   └── templates/          # String template generators (.env, CLAUDE.md, ecosystem.config.cjs, settings.json)
├── tsup.config.ts          # Bundles to ../dist/cli/, inlines @clack/prompts + picocolors
├── tsconfig.json
└── package.json            # Private, not published
```

## Build

```bash
cd cli && pnpm build    # outputs to dist/cli/index.js
```

tsup inlines `@clack/prompts` and `picocolors` via `noExternal` so the published package has zero CLI-specific runtime deps.

## Key Conventions

### Templates generate plain strings
Template functions in `cli/src/templates/` return raw string content (not file operations). The caller writes the file. Example:

```typescript
// Template returns string
export function generateEnvFile(config: InitConfig): string {
  return `DATABASE_URL=${config.databaseUrl}\n...`
}

// Caller writes it
writeFileSync(join(installDir, '.env'), generateEnvFile(config))
```

### PM2 ecosystem loads .env manually
The PM2 `ecosystem.config.cjs` template includes a `loadEnv()` function that parses the `.env` file and spreads all vars into the PM2 `env` block. This is necessary because Nuxt production builds do NOT auto-load `.env` files.

### Linux needs sudo for global installs
Global npm installs (`npm install -g`) require `sudo` on Linux. Use this pattern:

```typescript
const cmd = process.platform === 'linux'
  ? 'sudo npm install -g <package>'
  : 'npm install -g <package>'
execSync(cmd, { stdio: 'inherit' }) // inherit so sudo prompt shows
```

### Install dir vs repo dir
- **Repo dir**: where the git repo is cloned (development)
- **Install dir**: where `init` copies the app source (e.g., `~/bridget`)
- `.cognova` metadata file tracks the install dir path and version
- `findInstallDir()` in `lib/paths.ts` resolves the install dir from cwd, home dir, or metadata

### Config sync is manual
`cognova update` syncs app source but does NOT touch `~/.claude/` config (CLAUDE.md, skills, hooks, rules). Users run `cognova reset` separately when they want to update Claude config. This is intentional — users may have customized their config.

## Caveats

### Not yet published to npm
The `update` command checks the npm registry, so it won't work until the package is published. During development, deploy via git + rsync:

```bash
# On VM
git pull
rsync -av --exclude node_modules --exclude .output --exclude .env \
  --exclude logs --exclude .api-token --exclude .cognova \
  --exclude ecosystem.config.cjs ~/cognova/ ~/install-dir/
cd ~/install-dir && pnpm install && NODE_OPTIONS='--max-old-space-size=4096' pnpm build
pm2 restart cognova
```

### Database migrations run on app startup
The Nuxt plugin `server/plugins/01.database.ts` auto-runs migrations in production. The CLI `update` command also runs `pnpm db:migrate` as a safety net, but it's not strictly required.

### Memory constraints on small VMs
Nuxt builds can OOM on < 4GB RAM. The CLI sets `NODE_OPTIONS='--max-old-space-size=4096'` for build commands. VMs should also have swap configured.

### WebSocket routes must not collide with page routes
Server routes in `server/routes/` take precedence over Nuxt pages. WebSocket handlers must live under `server/routes/_ws/` (e.g., `_ws/chat.ts` -> `/_ws/chat`) to avoid blocking the page route at the same path.

## Types

All CLI types are in `cli/src/lib/types.ts`. Key types:
- `InitConfig` — full config object assembled during the init wizard
- `PersonalityConfig` — agent personality settings (name, tone, traits, etc.)
- `SecondBrainMetadata` — `.cognova` file structure (version, paths, timestamps)

These are CLI-internal types, NOT shared with the Nuxt app. The Nuxt app's shared types live in `shared/types/index.ts`.
