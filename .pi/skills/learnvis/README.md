# learnvis Skills

Agent skills for [learnvis](https://github.com/0xlxx/learnvis), a zero-dependency D3+SVG visualization library.

## Installation

```bash
npx skills add 0xlxx/learnvis
```

## What's Included

The learnvis skill provides coding agents with knowledge about:

- **Math Primitives** — vector, point, segment, circle, polygon, angle, grid, axes, fn
- **Graph Theory** — vertex, edge, directed/undirected edges, force/circular layouts
- **Common UI** — dot, arrow, zone, tag, line, path
- **Control Flow** — stage(), animate(), layout splitting, themes
- **Atomic Layer** — low-level createCanvas + render/fade primitives
- **Marker System** — shared MARKER config, per-color arrowheads

## Usage

Once installed, agents will automatically use learnvis knowledge when:

- Creating algorithm/data-structure visualizations
- Building interactive SVG diagrams
- Setting up graph/network visualizations with D3
- Writing math/animation tutorials

### Example Prompts

```
Create a visualization showing Dijkstra's shortest path algorithm
```

```
Draw a force-directed graph with labeled vertices and weighted edges
```

```
Set up a coordinate system with axes and plot a function curve
```

```
Animate a sorting algorithm with step-through controls
```

## Documentation

- [learnvis source](https://github.com/0xlxx/learnvis)
- [D3.js](https://d3js.org)

## License

MIT
