# Garden Plotter

A 3D garden planning application for designing and visualizing raised bed gardens. Built with React, Three.js, and TypeScript.

![Garden Plotter](https://img.shields.io/badge/Zone-6b-green) ![React](https://img.shields.io/badge/React-19-blue) ![Three.js](https://img.shields.io/badge/Three.js-0.182-black)

## Features

- **3D Visualization** - Interactive garden view with realistic bed rendering, plants, fencing, and bird netting
- **Time-of-Day Lighting** - Simulate morning, noon, and evening light conditions
- **Multiple Layouts** - Support for different garden configurations via `.layout.json` files
- **Research Panel** - Integrated markdown viewer for planning documents with internal linking
- **Bed Details** - Click any bed to see crop assignments and planting information
- **Resizable Panes** - Adjustable three-panel layout with collapsible sidebars

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
garden-plotter/
├── src/
│   ├── components/
│   │   ├── GardenView.tsx      # 3D visualization with Three.js
│   │   ├── ResearchPanel.tsx   # Markdown document viewer
│   │   └── BedDetailsPanel.tsx # Selected bed information
│   ├── scene/
│   │   └── GardenRenderer.ts   # Three.js scene management
│   ├── schemas/
│   │   ├── garden.ts           # Zod schemas for 3D rendering
│   │   └── layout.ts           # Zod schemas for layout data
│   └── store/
│       └── gardenStore.ts      # Zustand state management
├── research/
│   ├── *.md                    # Planning & research documents
│   ├── *.layout.json           # Garden layout configurations
│   └── plants/                 # Individual plant guides
└── assets/
    └── textures/               # Ground and material textures
```

## Creating Layouts

Garden layouts are defined in JSON files with the `.layout.json` extension in the `research/` directory. They're automatically discovered and appear in the layout selector.

```json
{
  "name": "My Garden",
  "dimensions": { "width": 40, "length": 40 },
  "beds": [
    {
      "id": "bed-1",
      "name": "Tomatoes",
      "position": { "x": 5, "y": 10 },
      "dimensions": { "width": 4, "length": 8 },
      "crops": ["tomato", "basil"]
    }
  ]
}
```

See `src/schemas/layout.ts` for the full schema specification.

## Research Documents

Markdown files in `research/` are automatically available in the Research panel. Features include:

- **Auto-discovery** - Drop a `.md` file in `research/` and it appears in the jump menu
- **Internal linking** - Link between documents with `[other-doc.md](other-doc.md)`
- **GitHub-flavored markdown** - Tables, task lists, and code blocks supported

## Tech Stack

- **React 19** - UI framework
- **Three.js** - 3D rendering
- **Zustand** - State management
- **Zod** - Schema validation
- **Vite** - Build tool
- **TypeScript** - Type safety

## License

MIT
