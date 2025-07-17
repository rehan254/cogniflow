# CogniFlow Technical Stack

## Core Technologies
- **Frontend**: Vanilla JavaScript ES6+ with D3.js v7 for visualization
- **AI Integration**: Local LM Studio with Gemma 7B Instruct model
- **Rendering**: SVG/Canvas hybrid with CSS3 animations
- **Styling**: CSS3 with CSS Variables for dynamic theming
- **Data**: Local storage for persistence, JSON serialization

## Key Libraries & Dependencies
- **D3.js v7**: Force simulation, data binding, SVG manipulation
- **jsPDF**: PDF generation capabilities
- **svg-to-pdfkit**: SVG to PDF conversion
- **Google Fonts**: Dynamic font loading for themes

## Local AI System
- **LM Studio Integration**: Local server running on `http://localhost:1234/v1`
- **Model**: Google Gemma 7B Instruct (`google/gemma-3-4b`)
- **Rate Limiting**: 50ms delays with priority queue system
- **No External APIs**: Completely local processing for privacy

## Build System & Deployment
- **Development**: Static HTML file - no build process required
- **Local Server**: Any HTTP server (Python, Node.js, nginx)
- **Docker**: nginx-alpine container serving on port 8000
- **Dependencies**: All loaded via CDN (D3.js, jsPDF, Google Fonts)

## Common Commands

### Development
```bash
# Serve locally with Python
python3 -m http.server 8000

# Or with Node.js
npx http-server -p 8000

# Test LM Studio connection
./test_lmstudio.sh
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build manually
docker build -t cogniflow .
docker run -p 8000:8000 cogniflow
```

### LM Studio Setup
1. Install LM Studio
2. Download Gemma 7B Instruct model
3. Go to 'Local Server' tab
4. Select the model and click 'Start Server'
5. Verify server runs on localhost:1234

## Architecture Patterns
- **Single Page Application (SPA)**: No routing, state-driven UI
- **Event-driven**: D3.js data binding with reactive updates
- **Component-based**: Modular node types and UI components
- **Local-first**: All data and AI processing stays on device