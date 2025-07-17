# CogniFlow v8.3 Upgrade Requirements

## Introduction

This specification outlines the requirements for upgrading CogniFlow from its current state to v8.3, implementing the Enhanced AI Flow Assistant with interactive information cards and the Dynasty Theming System inspired by Kurzgesagt aesthetics. The upgrade transforms CogniFlow from a basic mind-mapping tool into a sophisticated, AI-powered knowledge companion with beautiful, dynamic theming and intelligent, interactive assistance.

## Requirements

### Requirement 1: Dynasty Theming System Implementation

**User Story:** As a user, I want access to 6 beautiful, Kurzgesagt-inspired themes with dynamic color palettes and typography, so that I can customize my mind-mapping experience with professional, visually appealing designs.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL provide 6 predefined themes: Cosmic Ocean, Bioluminescence, Solar Flare, Terra, Stardust, and Digital Retro
2. WHEN a user selects a theme THEN the system SHALL apply canvas background, color palettes, font families, gradients, and shadows dynamically
3. WHEN nodes are created THEN the system SHALL use dynasty logic to assign colors from the theme's palette with proper inheritance
4. WHEN themes are switched THEN the system SHALL load required Google Fonts dynamically and update all visual elements smoothly
5. WHEN nodes are rendered THEN the system SHALL apply subtle gradients and soft shadows based on the theme's aesthetic

### Requirement 2: Enhanced Flow Assistant with Interactive Cards

**User Story:** As a user, I want an AI assistant that provides instant, structured information cards for selected nodes with interactive elements, so that I can quickly enhance my mind map with relevant insights and content.

#### Acceptance Criteria

1. WHEN a node is created or selected THEN the Flow Assistant SHALL instantly generate a comprehensive information card
2. WHEN the information card is displayed THEN it SHALL contain definition, key information, bullet points, probing questions, and structural tips
3. WHEN I click on a definition THEN the system SHALL add the entire definition to the selected node's notes
4. WHEN I click on a bullet point THEN the system SHALL add it as a list item to the selected node, converting it to a list node if necessary
5. WHEN I drag highlighted terms from the paragraph THEN the system SHALL allow dropping them on existing nodes or empty canvas areas to create new nodes

### Requirement 3: Ghost Node Proactive Suggestions

**User Story:** As a user, I want to see AI-generated ghost node suggestions around my selected nodes, so that I can quickly expand my mind map with relevant concepts.

#### Acceptance Criteria

1. WHEN a node is selected THEN the system SHALL display 3-4 semi-transparent ghost nodes with AI-suggested keywords
2. WHEN I click on a ghost node THEN the system SHALL create a new child node with the suggested text and remove the ghost node
3. WHEN I interact with other parts of the map THEN ghost nodes SHALL disappear automatically
4. WHEN ghost nodes are displayed THEN they SHALL have a subtle breathing animation and hover effects
5. WHEN the context changes significantly THEN the system SHALL update ghost node suggestions accordingly

### Requirement 4: Structured JSON API Integration

**User Story:** As a developer/user, I want the Flow Assistant to use a structured JSON API format with local Gemma models, so that the AI responses are consistent, parseable, and optimized for the interactive features.

#### Acceptance Criteria

1. WHEN the Flow Assistant makes API calls THEN it SHALL use the structured JSON prompt format specified for Gemma models
2. WHEN API responses are received THEN the system SHALL parse the JSON structure containing cardTitle, sections, and proactiveNodeSuggestions
3. WHEN LM Studio is not available THEN the system SHALL provide clear error messages and graceful degradation
4. WHEN API calls are made THEN the system SHALL use minimal rate limiting (50ms delays) optimized for local processing
5. WHEN the system processes responses THEN it SHALL handle malformed JSON gracefully with error recovery

### Requirement 5: Interactive UI Elements and Drag-and-Drop

**User Story:** As a user, I want to interact with AI-generated content through clicking, dragging, and dropping, so that I can seamlessly integrate insights into my mind map without manual copying.

#### Acceptance Criteria

1. WHEN I select text in the assistant panel THEN the system SHALL show floating action buttons for "Add to Notes", "Create New Node", and "To Input"
2. WHEN I drag highlighted terms THEN the system SHALL provide visual feedback showing valid drop targets
3. WHEN I drop content on a node THEN the system SHALL add the content to that node's notes with visual confirmation
4. WHEN I drop content on empty canvas THEN the system SHALL create a new sibling node at the drop location
5. WHEN interactions complete THEN the system SHALL provide visual feedback through node flashing or highlighting

### Requirement 6: Enhanced Node Data Structure

**User Story:** As a user, I want nodes to support rich content including notes, list items, and metadata, so that I can store comprehensive information within my mind map structure.

#### Acceptance Criteria

1. WHEN nodes are created THEN they SHALL include a notes array property for storing rich text content
2. WHEN nodes are converted to lists THEN they SHALL support listItems array with proper metadata
3. WHEN AI content is added THEN the system SHALL append to existing notes without overwriting
4. WHEN nodes are saved/loaded THEN all enhanced properties SHALL be preserved in the JSON structure
5. WHEN nodes are displayed THEN the enhanced content SHALL be visually accessible through expanded views

### Requirement 7: Performance and User Experience

**User Story:** As a user, I want the enhanced features to perform smoothly without impacting the core mind-mapping experience, so that I can work efficiently with large, complex mind maps.

#### Acceptance Criteria

1. WHEN AI features are active THEN they SHALL not interfere with core keyboard shortcuts and interactions
2. WHEN multiple AI requests are made THEN the system SHALL use priority queuing to handle user-initiated actions first
3. WHEN the application loads THEN all theme assets SHALL be loaded efficiently without blocking the UI
4. WHEN ghost nodes are rendered THEN they SHALL use efficient D3.js patterns to minimize DOM manipulation
5. WHEN themes are switched THEN the transition SHALL be smooth with appropriate loading states

### Requirement 8: Backward Compatibility and Migration

**User Story:** As an existing user, I want my current mind maps to work seamlessly with the new version, so that I don't lose any existing work or functionality.

#### Acceptance Criteria

1. WHEN existing mind maps are loaded THEN they SHALL display correctly with the new theming system
2. WHEN legacy nodes are processed THEN they SHALL be enhanced with new properties without data loss
3. WHEN the application starts THEN it SHALL default to a theme that closely matches the current appearance
4. WHEN new features are disabled THEN the core functionality SHALL remain fully operational
5. WHEN data is exported THEN it SHALL maintain compatibility with previous versions where possible