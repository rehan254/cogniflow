# CogniFlow v8.3 Upgrade Implementation Plan

## Phase 1: Dynasty Theming Foundation

- [x] 1. Create dynasty theme configuration system
  - Define the complete theme data structure with all 6 Kurzgesagt themes (Cosmic Ocean, Bioluminescence, Solar Flare, Terra, Stardust, Digital Retro)
  - Include canvas backgrounds, color palettes, font families, and visual effects for each theme
  - Create theme validation functions to ensure data integrity
  - _Requirements: 1.1, 1.2_

- [x] 1.1 Implement CSS custom properties management
  - Create `applyTheme(themeName)` function that sets CSS variables on `:root` element
  - Map theme properties to CSS variables for dynamic styling
  - Implement smooth transitions between theme changes
  - _Requirements: 1.2, 1.4_

- [x] 1.2 Add Google Fonts dynamic loading system
  - Create `loadThemeFonts(themeName)` function to fetch required fonts from Google Fonts API
  - Implement font loading detection and fallback strategies
  - Cache loaded fonts to prevent redundant requests
  - _Requirements: 1.4_

- [x] 1.3 Update node rendering with gradients and shadows
  - Modify node styling to use CSS gradients based on theme configuration
  - Add soft shadow effects using theme-appropriate colors
  - Implement `generateNodeStyle(color, depth)` function for dynamic styling
  - _Requirements: 1.3, 1.5_

- [x] 1.4 Implement dynasty color inheritance logic
  - Update `dynastyPalettes` array with theme-specific color palettes
  - Modify node color assignment to use theme palettes instead of hardcoded colors
  - Ensure proper color inheritance for multi-generation nodes
  - _Requirements: 1.3_

## Phase 2: Enhanced Flow Assistant Core

- [ ] 2. Update LM Studio API integration for structured JSON
  - Modify API call functions to use the new structured prompt format for Gemma models
  - Update request payload to include the specific JSON structure requirements
  - Implement response parsing for the new card-based format
  - _Requirements: 4.1, 4.2_

- [ ] 2.1 Create information card generation system
  - Implement `generateInteractiveInfoCard(node)` function
  - Build context data structure with node relationships and map structure
  - Handle API response parsing and error recovery for malformed JSON
  - _Requirements: 2.1, 2.2, 4.5_

- [ ] 2.2 Implement interactive card rendering
  - Create `displayInteractiveInfoCard(node, data)` function to render structured cards
  - Generate HTML for different section types (definition, paragraph_info, bullet_points, etc.)
  - Apply theme-appropriate styling to card elements
  - _Requirements: 2.2_

- [ ] 2.3 Add click handlers for definitions and bullet points
  - Implement click-to-add functionality for definition sections
  - Create bullet point click handlers that add content to node list items
  - Add visual feedback for successful content additions
  - _Requirements: 2.3, 2.4_

- [ ] 2.4 Implement basic drag and drop for highlighted text
  - Create drag detection for highlighted terms in paragraph sections
  - Add visual indicators for draggable elements
  - Implement basic drop functionality for highlighted content
  - _Requirements: 2.5, 5.2_

## Phase 3: Ghost Node System

- [ ] 3. Create ghost node data structures and management
  - Define `GhostNode` interface with position, animation, and metadata properties
  - Implement `GhostNodeManager` class for lifecycle management
  - Create ghost node storage and cleanup mechanisms
  - _Requirements: 3.1, 3.3_

- [ ] 3.1 Implement AI-driven ghost node suggestion generation
  - Extract `proactiveNodeSuggestions` from Flow Assistant API responses
  - Create intelligent positioning algorithm for ghost nodes around parent nodes
  - Implement suggestion relevance filtering and deduplication
  - _Requirements: 3.1, 3.5_

- [ ] 3.2 Add D3.js rendering for ghost nodes
  - Create D3.js selection and data binding for ghost nodes
  - Implement semi-transparent rendering with dashed borders
  - Add ghost nodes to the existing node rendering pipeline
  - _Requirements: 3.2, 3.4_

- [ ] 3.3 Implement click-to-create functionality
  - Add click event handlers for ghost nodes
  - Create new child nodes with suggested text when ghost nodes are clicked
  - Remove ghost nodes after successful node creation
  - _Requirements: 3.2_

- [ ] 3.4 Add breathing animation and visual effects
  - Implement CSS keyframe animations for ghost node breathing effect
  - Add hover state styling for ghost nodes
  - Create smooth fade-in/fade-out transitions for ghost node lifecycle
  - _Requirements: 3.4_

## Phase 4: Advanced Interactions and Data Management

- [ ] 4. Complete drag and drop system implementation
  - Implement `DragDropManager` class with comprehensive drag and drop handling
  - Add support for multiple drag types (highlighted-text, bullet-point, definition)
  - Create drop target detection and visual feedback system
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 4.1 Enhance node data structure
  - Update `Node` interface to include `notes` array property
  - Add support for enhanced list items with metadata
  - Implement data migration for existing nodes to new structure
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 4.2 Implement visual feedback system
  - Create `flashNode(nodeId)` enhancement for content addition confirmation
  - Add drop target highlighting during drag operations
  - Implement loading states for AI operations
  - _Requirements: 5.5_

- [ ] 4.3 Add comprehensive error handling
  - Implement `ErrorHandler` class for centralized error management
  - Add graceful degradation for LM Studio offline scenarios
  - Create user-friendly error messages and recovery options
  - _Requirements: 4.3, 4.5_

- [ ] 4.4 Create floating action UI for text selection
  - Implement floating "Add to Notes", "Create New Node", and "To Input" buttons
  - Add text selection detection in assistant panel
  - Create positioning logic for floating UI elements
  - _Requirements: 5.1_

## Phase 5: Performance Optimization and Integration

- [ ] 5. Implement performance optimizations
  - Add debouncing for AI API calls to prevent excessive requests
  - Optimize D3.js rendering patterns for ghost nodes and enhanced nodes
  - Implement efficient memory management for card data and ghost nodes
  - _Requirements: 7.1, 7.2, 7.4_

- [ ] 5.1 Add priority queue system for AI requests
  - Create request prioritization for user-initiated vs background actions
  - Implement queue management with proper rate limiting for local API
  - Add request cancellation for outdated or superseded requests
  - _Requirements: 7.2_

- [ ] 5.2 Implement backward compatibility layer
  - Create data migration functions for existing mind maps
  - Ensure legacy node structures work with new features
  - Add compatibility checks and graceful feature degradation
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 5.3 Add comprehensive testing suite
  - Create unit tests for theme system, AI integration, and ghost nodes
  - Implement integration tests for drag-and-drop and node interactions
  - Add performance tests for large mind maps and theme switching
  - _Requirements: 7.3, 7.4_

- [ ] 5.4 Implement accessibility improvements
  - Add keyboard navigation support for all new interactive elements
  - Ensure screen reader compatibility for AI-generated content
  - Implement proper ARIA labels and semantic HTML structure
  - _Requirements: 7.1_

## Phase 6: Final Polish and Documentation

- [ ] 6. Create user documentation and guides
  - Write comprehensive user guide for new theming system
  - Create tutorial for Flow Assistant interactive features
  - Document keyboard shortcuts and accessibility features
  - _Requirements: 8.4_

- [ ] 6.1 Perform comprehensive cross-browser testing
  - Test all features across Chrome, Firefox, Safari, and Edge
  - Verify theme rendering consistency across different browsers
  - Test touch interactions for mobile and tablet devices
  - _Requirements: 7.5_

- [ ] 6.2 Optimize bundle size and loading performance
  - Minimize CSS and JavaScript where possible
  - Implement lazy loading for non-critical theme assets
  - Optimize font loading strategy for better perceived performance
  - _Requirements: 7.3_

- [ ] 6.3 Add analytics and monitoring
  - Implement error tracking for production issues
  - Add performance monitoring for AI response times
  - Create usage analytics for new features (privacy-preserving)
  - _Requirements: 7.4_

- [ ] 6.4 Final integration testing and bug fixes
  - Perform end-to-end testing of all user workflows
  - Fix any remaining bugs or edge cases
  - Verify all requirements are fully implemented and tested
  - _Requirements: 8.5_

## Implementation Notes

### Critical Dependencies
- LM Studio must be running with Gemma model loaded for AI features
- Google Fonts API access required for dynamic font loading
- Modern browser with ES6+ support and CSS custom properties

### Testing Checkpoints
- After Phase 1: Verify all themes render correctly and switch smoothly
- After Phase 2: Confirm AI cards generate and display interactive elements
- After Phase 3: Test ghost node generation, positioning, and interaction
- After Phase 4: Validate complete drag-and-drop workflows
- After Phase 5: Performance test with large mind maps and concurrent AI requests

### Rollback Strategy
- Each phase should be implemented as feature flags that can be disabled
- Maintain backward compatibility throughout implementation
- Keep original functionality intact until new features are fully tested
- Provide easy rollback mechanism for any phase if issues arise