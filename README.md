# CogniFlow 3D

AI-Powered Idea Synthesizer with 3D Force Graph Visualization

## Getting Started

1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the development server:
   ```sh
   npm run dev
   ```
   The app will be available at http://localhost:8000

## Features
- 3D force-directed mind map using React and react-force-graph-3d
- Modern dark UI
- Ready for advanced node/link types and AI integration

## Roadmap
- Migrate all node types and features from D3 to React
- Integrate AI assistant and advanced theming
- Add export, import, and collaboration features

## Dynasty Theming System (v8)
- Six historical themes (Han, Tang, Song, Yuan, Ming, Qing), each with unique color palettes and font pairings.
- Dynamic Google Fonts loading for each theme.
- Color helpers (hexToHsl, hslToHex, getNodeColor) for dynamic node coloring by generation depth.
- Node rendering logic updated to use theme colors and fonts for central, 1st gen, and 2nd+ gen nodes.
- Theme selector dropdown for live switching.