# OSRS Inventory Image Maker

A web tool for creating inventory icon definitions for Old School RuneScape item models. Upload a model `.dat` file from the OSRS cache, adjust camera parameters in real-time, and export the definition values.

Built with Nuxt 4, Nuxt UI, and TypeScript.

## Features

- **Model Upload** - Drag-and-drop `.dat` files from the OSRS cache (supports gzip-compressed containers)
- **Live Preview** - Real-time 36x32 native resolution preview with 10x scaled view, matching the OSRS inventory slot aesthetic
- **Parameter Controls** - Adjust zoom, roll, pitch, yaw, and X/Y offset with linked sliders and number inputs
- **Definition Export** - Copy the final definition to clipboard in OSRS config format

## How It Works

```
.dat file → Decompress → Parse Model → Light Faces → Rasterize to Canvas
```

The app reads OSRS binary model formats (Type 1/2/3 and legacy), applies Euler angle rotations, and renders triangles using a scanline rasterizer with flat and Gouraud shading - all in the browser with no server required.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and upload a `.dat` model file. A sample model is included at `sample-models/38606.dat`.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server on port 3000 |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type checking |

## Project Structure

```
app/
  pages/index.vue              # Main editor page
  components/
    ModelUpload.vue             # File upload with drag-and-drop
    ModelPreview.client.vue     # Canvas rendering (client-only)
    DefinitionControls.vue      # Parameter sliders
    DefinitionExport.vue        # Text export + copy
  composables/
    useModelRenderer.ts         # 3D-to-2D rendering pipeline
shared/
  types/model.ts                # ModelDefinition, LitModel, InventoryDefinition
  utils/
    model-parser.ts             # OSRS .dat file decoder
    cache-container.ts          # Gzip decompression
    binary-stream.ts            # Binary format reader
    rasterizer.ts               # Scanline triangle rasterizer
    rs-colors.ts                # OSRS HSL color palette
sample-models/
  38606.dat                     # Example model for testing
```

## Tech Stack

- [Nuxt 4](https://nuxt.com) - Vue framework
- [Nuxt UI](https://ui.nuxt.com) - Component library
- [Tailwind CSS](https://tailwindcss.com) - Styling
- TypeScript - Type safety

## License

[MIT](./LICENSE)
