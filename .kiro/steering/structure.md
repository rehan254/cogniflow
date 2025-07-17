# CogniFlow Project Structure

## Root Directory Layout
```
├── index.html              # Main application (4600+ lines, complete SPA)
├── README.md              # Project documentation and setup guide
├── Dockerfile             # nginx-alpine container configuration
├── docker-compose.yml     # Docker orchestration for port 8000
├── test_lmstudio.sh      # LM Studio API connection test script
├── CogniFlow_v8_FRD.txt  # Comprehensive functional requirements (745 lines)
├── v8 App Spec.txt       # Complete implementation specification
├── .gitignore            # Git ignore rules (node_modules)
├── .dockerignore         # Docker ignore rules
└── oldcode               # Legacy code reference (currently empty)
```

## Application Architecture (index.html)

### Core Structure
- **Single HTML File**: Complete application in one file (~4600 lines)
- **Embedded CSS**: All styling within `<style>` tags
- **Embedded JavaScript**: All logic within `<script type="module">` tags
- **No Build Process**: Direct browser execution, no compilation needed

### Key Code Sections
1. **CSS Styling** (~1000 lines): Themes, animations, responsive design
2. **HTML Structure** (~200 lines): Minimal DOM, dynamically populated
3. **JavaScript Logic** (~3400 lines): D3.js simulation, AI integration, UI logic

### JavaScript Module Organization
```javascript
// Setup & Configuration
- D3.js initialization
- LM Studio API configuration
- Theme system setup

// Core Data Structures
- nodes[], links[] arrays
- State management variables
- History stack for undo/redo

// Force Simulation Engine
- D3.js force simulation
- Custom collision detection
- Physics calculations

// Node System
- Standard, Expanded, List, Media node types
- Creation, editing, deletion logic
- Visual rendering functions

// AI Integration
- Flow Assistant chat system
- Local API queue management
- Structured response parsing

// Event Handlers
- Mouse/keyboard interactions
- Drag & drop functionality
- UI state management
```

## Configuration Files

### Docker Configuration
- **Dockerfile**: nginx-alpine serving static files on port 8000
- **docker-compose.yml**: Single service container orchestration
- **Port Mapping**: Host 8000 → Container 8000

### Development Scripts
- **test_lmstudio.sh**: Bash script to verify LM Studio API connectivity
- Tests localhost:1234/v1/models endpoint
- Provides setup instructions if server not running

## Documentation Structure
- **README.md**: User-facing setup and feature documentation
- **CogniFlow_v8_FRD.txt**: Technical requirements document (19 sections)
- **v8 App Spec.txt**: Implementation specification and feature list

## Conventions

### File Organization
- **Single File Architecture**: Everything in index.html for simplicity
- **No External Dependencies**: All libraries loaded via CDN
- **Self-Contained**: Application runs without build process

### Code Style
- **ES6+ JavaScript**: Modern syntax with modules, arrow functions
- **CSS Variables**: Dynamic theming with custom properties
- **Semantic HTML**: Minimal, accessible DOM structure
- **Progressive Enhancement**: Works without JavaScript for basic HTML

### Naming Conventions
- **camelCase**: JavaScript variables and functions
- **kebab-case**: CSS classes and HTML IDs
- **PascalCase**: Constructor functions and classes
- **UPPER_CASE**: Constants and configuration values