# inventory-img-maker

Creates definitions for OSRS (Old School RuneScape) item inventory images using Nuxt 4.

## Quick Links

| Doc | Purpose |
|-----|---------|
| [architecture.md](./docs/architecture.md) | System design |
| [todo.md](./docs/todo.md) | Implementation roadmap |
| [ui-wireframes.md](./docs/ui-wireframes.md) | UI layouts |

## Nuxt Knowledge Cutoff

Your Nuxt 4 and Nuxt UI v4 knowledge is outdated. Before writing frontend code:

```bash
# Nuxt composables/config
python3 .claude/skills/nuxt-docs/fetch.py <topic>

# UI components
python3 .claude/skills/nuxt-ui-docs/fetch.py <component>

# Layout patterns
python3 .claude/skills/nuxt-ui-templates/fetch.py <template> --structure
```

## Rules

Auto-loaded from `.claude/rules/` based on file patterns:
- `nuxt4.md` - Vue/Nuxt files
- `nuxt-ui.md` - Vue components
- `backend.md` - Server TypeScript
- `database.md` - Drizzle schema/migrations

## Hooks

Enforcement via `.claude/hooks/`:
- **protect-env.sh** - Blocks edits to .env files
- **lint-check.sh** - Runs lint after edits

## Code Style

- No semicolons in TypeScript
- No brackets for single-line if/loops
- Types in `shared/types/`, never duplicate
- Ask questions rather than assume

## Workflow

1. Check [todo.md](./docs/todo.md) for current goals
2. Follow plans in `docs/todo/` folder
3. Update docs when deviating from plans
