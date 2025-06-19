// --- Global Undo History ---
let history = [];
const MAX_HISTORY_SIZE = 20;

function addToHistory(action) {
    if (history.length >= MAX_HISTORY_SIZE) {
        history.shift(); // Remove the oldest action if the history is full
    }
    history.push(action);
    console.log("Action added to history:", action.type, "History size:", history.length);
}

// --- Theme Definitions ---
const themes = {
    neuromancer: { bg: "#221C35", colors: ["#D94A87", "#8C3A9E"], selected: "#F071A9", name: "Neuromancer" },
    wiretap:     { bg: "#2A1E3C", colors: ["#E5734A", "#A746B1"], selected: "#F08A5D", name: "Wiretap" },
    vanusa:      { bg: "#3D2241", colors: ["#D85574", "#6E2F8D"], selected: "#E06C89", name: "Vanusa" },
    expresso:    { bg: "#1C182F", colors: ["#794BA4", "#432D66"], selected: "#8A5FB5", name: "Expresso" },
    shifter:     { bg: "#351F4A", colors: ["#F84C7B", "#A439B6"], selected: "#FA6A90", name: "Shifter" },
    bighead:     { bg: "#2E1C2A", colors: ["#D24B5A", "#532545"], selected: "#E06070", name: "Bighead" }
};
let currentTheme;

function selectRandomTheme() {
    const themeNames = Object.keys(themes);
    const randomThemeName = themeNames[Math.floor(Math.random() * themeNames.length)];
    currentTheme = themes[randomThemeName];
    document.body.style.backgroundColor = currentTheme.bg;
    // If canvasContainer is meant to have the BG, use:
    // document.getElementById('canvas-container').style.backgroundColor = currentTheme.bg;
    console.log("Selected theme:", currentTheme.name);
}


document.addEventListener('DOMContentLoaded', () => {
    const svg = d3.select("#mindmap-canvas");
    const canvasContainer = document.getElementById('canvas-container');
    // Ensure canvas container takes the theme BG if body doesn't directly show it.
    // For this setup, body background is fine. If canvas-container has its own opaque bg, set it here.

    // Get initial dimensions from the container
    let width = canvasContainer.offsetWidth;
    let height = canvasContainer.offsetHeight;
    svg.attr('width', width).attr('height', height);

    let nodes = [];
    let links = [];
    let selectedNode = null;
    let isPrimedForChild = false; // Governs Enter key behavior for selectedNode
    const targetDistance = 100; // Default distance for new child nodes
    // const nodeRadius = 20; // Visual radius of a node - will become dynamic

    // Dynamic Node Radius Constants
    const baseRadius = 15; // Minimum radius for a node
    const radiusPerChar = 1; // How much radius increases per character of text
    const minRadius = 15;
    const maxRadius = 70; // Maximum radius to prevent overly large nodes

    // Helper function to calculate node radius based on text content
    function calculateNodeRadius(text) {
        let radius = baseRadius + (text ? text.length * radiusPerChar : 0);
        return Math.max(minRadius, Math.min(radius, maxRadius));
    }

    // Attempt to get the node input from the HTML, or create it if not present.
    // It's best practice to define this input field in index.html.
    let nodeInput = document.getElementById('node-input');
    if (!nodeInput) {
        console.warn('Warning: #node-input element not found in HTML. Creating it dynamically. Please add <input type="text" id="node-input"> to your HTML.');
        nodeInput = document.createElement('input');
        nodeInput.id = 'node-input';
        nodeInput.type = 'text';
        // Insert it before the canvas container for better layout if created dynamically
        if (canvasContainer.parentNode) {
            canvasContainer.parentNode.insertBefore(nodeInput, canvasContainer);
        } else {
            document.body.insertBefore(nodeInput, document.body.firstChild); // Fallback
        }
    }
    nodeInput.placeholder = "Enter text for the first node..."; // Initial placeholder text
    nodeInput.addEventListener('keydown', handleInputKeydown);

    // Main group for holding all zoomable/pannable elements
    const mainGroup = svg.append("g").attr("class", "main-group");

    // Declare globally accessible link and node group selectors for ticked function
    let linkElements, nodeGroups;
    let currentTransform = d3.zoomIdentity; // To store the current zoom/pan transform

    // --- Input Parsing & List Creation Helpers ---
    function parseNumberedList(text) {
        const lines = text.split('\n');
        const listItems = [];
        // Regex to find lines starting with number-dot-space (allowing leading spaces)
        // It captures the number part (e.g., "1.") and the item text.
        const itemRegex = /^\s*(\d+\.)\s+(.+)/;

        for (const line of lines) {
            const match = line.match(itemRegex);
            if (match) {
                listItems.push({
                    number: match[1], // e.g., "1."
                    itemText: match[2].trim() // e.g., "Item A"
                });
            } else {
                // If any line doesn't match (and it's not empty), it's not a simple, continuous numbered list
                // or it's a line that's part of a previous item's text (multi-line item text - not supported by this simple parser)
                if (listItems.length > 0 && line.trim() !== "") {
                    // Allow empty lines between list items, but not non-list lines after list items started.
                    // For this version, any non-matching line means we stop parsing as a list.
                    return null;
                }
                if (line.trim() !== "") return null; // If a non-empty line doesn't match, and we haven't found items yet.
            }
        }
        // Only consider it a list if there are at least two items.
        return listItems.length >= 2 ? listItems : null;
    }


    // --- Typography Helpers ---
    function getContrastingTextColor(backgroundColorHex) {
        if (!backgroundColorHex) return '#000000'; // Default to black if no bg color
        try {
            // Simple brightness calculation (more sophisticated ones exist, e.g., WCAG Luma)
            const rgb = parseInt(backgroundColorHex.slice(1), 16); // Convert hex to integer
            const r = (rgb >> 16) & 0xff;
            const g = (rgb >>  8) & 0xff;
            const b = (rgb >>  0) & 0xff;
            // Using YIQ formula for perceived brightness
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            return brightness > 150 ? '#000000' : '#FFFFFF'; // Threshold can be adjusted (128 is common)
        } catch (e) {
            console.error("Error calculating contrasting color from:", backgroundColorHex, e);
            return '#000000'; // Fallback
        }
    }

    function getFontSizeByDepth(depth) {
        const baseSize = 18; // For depth 0
        const sizeDecrement = 2; // How much to decrease per depth level
        const minSize = 9;   // Minimum font size
        // Ensure depth is a number, default to 0 if undefined or null
        const numericDepth = (typeof depth === 'number' && !isNaN(depth)) ? depth : 0;
        let calculatedSize = baseSize - (numericDepth * sizeDecrement);
        return Math.max(calculatedSize, minSize);
    }

    // Helper function to get node color based on depth and theme
    // Simplified version for now, as per brief.
    function getNodeColor(nodeDepth, theme) {
        if (!theme || !theme.colors || theme.colors.length < 2) {
            return "#CCCCCC"; // Default fallback color
        }
        // Simple logic: depth 0 -> colors[0], depth 1 -> colors[0] (or a mix), depth >= 2 -> colors[1]
        // This can be expanded with proper interpolation later.
        if (nodeDepth === 0) return theme.colors[0];
        // if (nodeDepth === 1) return d3.interpolateRgb(theme.colors[0], theme.colors[1])(0.5); // Example for actual interpolation
        if (nodeDepth === 1) return theme.colors[0]; // For now, keep depth 1 same as root for visual simplicity of 2 main colors
        return theme.colors[1];
    }

    // Ensure a <defs> section exists for gradients
    let defs = svg.select("defs");
    if (defs.empty()) {
        defs = svg.append("defs");
    }

    // Initialize D3 Force Simulation
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(targetDistance))
        .force("charge", d3.forceManyBody().strength(-150)) // Adjusted strength
        .force("center", d3.forceCenter(width / 2, height / 2).strength(0.01)) // Weaker center force for more drift
        .force("collide", d3.forceCollide().radius(d => calculateNodeRadius(d.text) + 5).strength(0.7)) // Collision force
        .force("drift", customDriftForce) // Custom drift force
        .on("tick", ticked);

    // Custom Drift Force
    function customDriftForce(alpha) {
        const driftStrength = 0.0005; // Very subtle strength
        nodes.forEach(node => {
            // Apply a tiny random velocity change, biased slightly towards edges if far from center, or just random
            // For a zero-G feel, pure random is better.
            node.vx += (Math.random() - 0.5) * driftStrength * alpha;
            node.vy += (Math.random() - 0.5) * driftStrength * alpha;

            // Optional: A very weak pull towards the center to prevent nodes from drifting off screen indefinitely
            // This might counteract the "zero-G" feel a bit, so it's optional and should be very weak.
            // const towardsCenterX = (width / 2 - node.x) * 0.00001 * alpha;
            // const towardsCenterY = (height / 2 - node.y) * 0.00001 * alpha;
            // node.vx += towardsCenterX;
            // node.vy += towardsCenterY;
        });
    }

    // Ticked function to update positions
    function ticked() {
        if (linkElements) { // Check if linkElements is initialized
            linkElements.attr("d", d => {
                // Ensure source and target nodes are fully initialized (especially x, y)
                if (typeof d.source.x === 'undefined' || typeof d.source.y === 'undefined' ||
                    typeof d.target.x === 'undefined' || typeof d.target.y === 'undefined') {
                    return ""; // Return empty path if positions are not ready
                }
                const midX = (d.source.x + d.target.x) / 2;
                const midY = (d.source.y + d.target.y) / 2;
                // Use stored offsets; default to 0 if not present (results in a straight line if Q used like this)
                const cOffsetX = d.controlOffsetX || 0;
                const cOffsetY = d.controlOffsetY || 0;
                const controlPointX = midX + cOffsetX;
                const controlPointY = midY + cOffsetY;
                return `M ${d.source.x},${d.source.y} Q ${controlPointX},${controlPointY} ${d.target.x},${d.target.y}`;
            });
        }

        if (nodeGroups) { // Check if nodeGroups is initialized
            nodeGroups
                .attr("transform", d => `translate(${d.x},${d.y})`);
        }
    }

    // Zoom handler function
    function zoomed(event) {
        currentTransform = event.transform;
        mainGroup.attr("transform", currentTransform);
    }

    // Initialize d3.zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4]) // Define min/max zoom scale
        .on("zoom", zoomed);

    // Apply the zoom behavior to the SVG element
    svg.call(zoom);
    // Disable zoom on double click because it's used for node editing
    svg.on("dblclick.zoom", null);


    // Render function: Handles D3 data joins (enter, exit, merge)
    function render() {
        // === Link Elements (Paths) ===
        // Select paths within mainGroup
        linkElements = mainGroup.selectAll('path.link')
            .data(links, d => `link-${d.source.id}-${d.target.id}`);

        linkElements.exit().remove();

        linkElements = linkElements.enter().append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            // Stroke color set in merge below
            .attr('stroke-width', 2) // Slightly thicker default
            // Assign a unique ID to each path for textPath to reference
            .attr('id', d => `link-path-${d.source.id}-${d.target.id}`)
            .merge(linkElements)
            // Update stroke color for all links (new and existing) based on target node depth
            .attr('stroke', d => getNodeColor(d.target.depth || 0, currentTheme));
            // Note: If d.target is undefined briefly during simulation updates, getNodeColor needs a fallback.
            // getNodeColor already has a fallback if theme is bad, but not for undefined d.target.depth.
            // However, links data should always have valid source/target by the time it's used here.

        // 'd' attribute is set in ticked()

        // Remove old list item numbers before potentially re-adding them
        mainGroup.selectAll('.list-item-number').remove();

        linkElements.each(function(d_link) {
            if (d_link.target.isListItem && d_link.target.listItemNumber) {
                // This link leads to a list item. Add the number annotation.
                mainGroup.append('text')
                    .attr('class', 'list-item-number node-text') // Added node-text for font
                    .append('textPath')
                    .attr('xlink:href', `#link-path-${d_link.source.id}-${d_link.target.id}`)
                    .attr('startOffset', '50%') // Adjust as needed for placement
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'text-after-edge') // Position above the line slightly
                    .style('font-size', '9px') // Smaller font for numbers
                    .style('fill', () => { // Contrast against link color or a fixed annotation color
                        const linkColor = getNodeColor(d_link.target.depth || 0, currentTheme);
                        return getContrastingTextColor(linkColor);
                     })
                    .text(d_link.target.listItemNumber);
            }
        });


        // === Node Elements (Groups) ===
        // Select node groups within mainGroup
        nodeGroups = mainGroup.selectAll('g.node')
            .data(nodes, d => d.id);

        nodeGroups.exit().remove();

        const nodeEnter = nodeGroups.enter().append('g') // Create new 'g' elements for new nodes.
            .attr('class', 'node')
            // Initial position is now primarily handled by the simulation.
            // transform will be updated by the 'ticked' function.
            .on('click', handleNodeClick)
            .on('dblclick', handleNodeDblClick) // Add dblclick listener
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        nodeEnter.append('circle') // Append a circle to each new node group.
            // .attr('r', nodeRadius) // Radius is now dynamic
            .attr('stroke', 'none'); // Explicitly no outline for circles

        nodeEnter.append('text') // Append text to each new node group.
            .attr('class', 'node-text') // Add common class
            .attr('dy', '.35em')
            .attr('text-anchor', 'middle');

        // Merge new node groups with existing ones.
        nodeGroups = nodeEnter.merge(nodeGroups);

        // Update visual shapes for all nodes (new and existing).
        nodeGroups.each(function(d) {
            const group = d3.select(this);
            // Remove previous shape if it exists (e.g. if switching from circle to rect)
            group.select("circle").remove();
            group.select("rect.node-shape").remove(); // Use a class for node rects

            if (d.isDefinitionNode) {
                // Append/update a rect for definition nodes
                const rectWidth = 150; // Fixed for now
                const rectHeight = 70;  // Fixed for now
                const rectRxRy = 15;
                group.insert("rect", "text") // Insert rect before text
                    .attr("class", "node-shape")
                    .attr("x", -rectWidth / 2)
                    .attr("y", -rectHeight / 2)
                    .attr("width", rectWidth)
                    .attr("height", rectHeight)
                    .attr("rx", rectRxRy)
                    .attr("ry", rectRxRy)
                    .attr("fill", d3.color(currentTheme.colors[1]).darker(0.5).formatHex()) // Theme-derived color
                    .attr("stroke", "#ccc"); // Default stroke, selection overrides
            } else {
                // Append/update a circle for regular nodes
                group.insert("circle", "text") // Insert circle before text
                    .attr("r", calculateNodeRadius(d.text))
                    // .attr("fill", d.id === selectedNode?.id ? 'lightblue' : '#D3D3D3') // Fill handled by gradient or selection logic
                    .attr("stroke", "none"); // Default stroke, selection overrides

                // Apply radial gradient
                const nodeColor = getNodeColor(d.depth || 0, currentTheme);
                const innerColor = d3.color(nodeColor).brighter(1.5).formatHex();
                const gradientId = `grad-${d.id}`;

                let gradient = defs.select(`#${gradientId}`);
                if (gradient.empty()) {
                    gradient = defs.append("radialGradient").attr("id", gradientId);
                }
                gradient.html(""); // Clear existing stops
                gradient.append("stop").attr("offset", "0%").style("stop-color", innerColor);
                gradient.append("stop").attr("offset", "100%").style("stop-color", nodeColor);

                group.select("circle").attr("fill", `url(#${gradientId})`);
            }
        });

        // Selected node highlight will be handled after this block for all node types
        // So, base fill for non-selected circles is set via gradient.
        // Selected state will override stroke for all, and fill for circles if needed (though gradient preferred)

        // --- Selected Node Highlight ---
        nodeGroups.each(function(d) {
            const group = d3.select(this);
            const shape = group.select(".node-shape, circle"); // Selects either the rect or circle

            if (d.id === selectedNode?.id) {
                shape.attr("stroke", currentTheme.selected)
                     .attr("stroke-width", "4px");
            } else {
                // For definition nodes, keep their default stroke, or set to none if preferred for non-selected
                if (d.isDefinitionNode) {
                     shape.attr("stroke", "#ccc") // Default stroke for non-selected def node
                          .attr("stroke-width", "1px");
                } else {
                     shape.attr("stroke", "none"); // No stroke for non-selected circles
                }
            }
        });

        // --- Text Rendering Logic ---
        nodeGroups.select('text').each(function(d) {
            const textElement = d3.select(this);
            textElement.html(null); // Clear previous content

            if (d.isDefinitionNode) {
                // Special rendering for definition nodes
                textElement.attr("text-anchor", "middle"); // Keep title centered

                // Title "Definition"
                textElement.append("tspan")
                    .attr("class", "definition-node-title") // Added class for potential specific styling
                    .attr("x", 0)
                    .attr("dy", "-0.6em")
                    .style("font-size", getFontSizeByDepth(d.depth) + "px")
                    .attr("font-weight", "bold")
                    // Fill for definition title will be set on the main textElement
                    .text(d.text);

                // Content (actual definition)
                const content = d.definitionContent || "";
                const rectWidth = 150;
                const padding = 10;
                const availableWidth = rectWidth - 2 * padding;
                const definitionContentFontSize = 11; // Fixed smaller size for content

                textElement.append("tspan")
                    .attr("class", "definition-node-content")
                    .attr("x", 0)
                    .attr("dy", "1.4em")
                    .style("font-size", `${definitionContentFontSize}px`)
                    // Fill for definition content will be set on the main textElement
                    .text(truncateTextToFit(content, availableWidth, definitionContentFontSize,1));

                textElement.append("tspan")
                    .attr("class", "definition-node-content")
                    .attr("x", 0)
                    .attr("dy", "1.2em")
                    .style("font-size", `${definitionContentFontSize}px`)
                    // Fill for definition content will be set on the main textElement
                    .text(truncateTextToFit(content, availableWidth, definitionContentFontSize,2));

                textElement.append("tspan")
                    .attr("class", "definition-node-content")
                    .attr("x", 0)
                    .attr("dy", "1.2em")
                    .style("font-size", `${definitionContentFontSize}px`)
                    // Fill for definition content will be set on the main textElement
                    .text(truncateTextToFit(content, availableWidth, definitionContentFontSize,3));

                // Set overall text color for definition node based on its background
                const defNodeBgColor = d3.color(currentTheme.colors[1]).darker(0.5).formatHex();
                textElement.style("fill", getContrastingTextColor(defNodeBgColor));

            } else if (d.isBulletPoint && d.parentId !== null) {
                const incomingLink = links.find(l => l.target.id === d.id);
                if (incomingLink) {
                    const pathColor = getNodeColor(d.depth || 0, currentTheme); // Text is on path, so use path color as bg
                    textElement.attr("dy", null).attr("text-anchor", null);
                    textElement.append("textPath")
                        .attr("xlink:href", `#link-path-${incomingLink.source.id}-${incomingLink.target.id}`)
                        .attr("startOffset", "10%")
                        .attr("dominant-baseline", "central")
                        .style("font-size", getFontSizeByDepth(d.depth) + "px")
                        .style("fill", getContrastingTextColor(pathColor))
                        .text(d.text.substring(2));
                } else {
                    renderNormalTextInternal(textElement, d);
                }
            } else {
                renderNormalTextInternal(textElement, d);
            }
        });

        function renderNormalTextInternal(textElement, d) {
            textElement.select("textPath").remove();
            const fontSize = getFontSizeByDepth(d.depth);
            const nodeBgColor = getNodeColor(d.depth || 0, currentTheme); // Background is the node's outer gradient color

            textElement.style("font-size", fontSize + "px")
                       .style("fill", getContrastingTextColor(nodeBgColor));

            const r = calculateNodeRadius(d.text);
            const approxCharWidth = fontSize * 0.55;
            const maxChars = Math.max(1, Math.floor((r * 1.8) / approxCharWidth));

            let displayText = d.text;
            if (d.text.length > maxChars && maxChars > 2) {
                displayText = d.text.substring(0, maxChars - 2) + '...';
            } else if (d.text.length > maxChars && maxChars <=2 ) {
                 displayText = d.text.substring(0, 1) + '...';
            }

            textElement
                .text(displayText)
                .attr('title', d.text)
                .attr("dy", ".35em")
                .attr("text-anchor", "middle");
        }

        // Helper for basic text wrapping for definition nodes
        function truncateTextToFit(fullText, maxWidth, fontSize, lineNumber, maxLines = 3) {
            if (!fullText) return "";
            // Estimate chars per line (very rough)
            const charsPerLine = Math.floor(maxWidth / (fontSize * 0.55));
            const startChar = (lineNumber - 1) * charsPerLine;
            let endChar = lineNumber * charsPerLine;

            if (startChar >= fullText.length) return "";

            let segment = fullText.substring(startChar, endChar);

            if (lineNumber === maxLines && fullText.length > endChar) {
                segment = segment.substring(0, segment.length - 3) + "...";
            }
            return segment;
        }


        // Update simulation with new nodes and links data
        simulation.nodes(nodes);
        simulation.force("link").links(links);
        // simulation.alpha(0.3).restart(); // Restart simulation gently after rendering changes.
                                        // This will be handled more specifically in addNode and drag handlers
    }

    // Function to add a new node to the mindmap
    function addNode(text, parentNode = null, options = {}) { // Added options parameter
        let x, y;
        // Ensure unique ID: if nodes exist, take max ID + 1, otherwise 0
        const newNodeId = nodes.length > 0 ? Math.max(...nodes.map(n => n.id)) + 1 : 0;

        // Initialize node position. If parent exists, place near parent; otherwise, center.
        // The simulation will then adjust its position.
        if (parentNode) {
            const childrenOfParent = nodes.filter(n => n.parentId === parentNode.id);
            let coneCenterAngle;

            // Determine the global center for cone orientation
            // For simplicity, using (width/2, height/2) of the SVG as the effective global origin
            // for the coordinate system *within* the mainGroup.
            // If nodes[0] exists and is different from parentNode, use it.
            let mapCenterX = width / 2; // Default global center X for mainGroup's coordinate space
            let mapCenterY = height / 2; // Default global center Y

            if (nodes.length > 0 && nodes[0] !== parentNode) {
                // If there's a root node and it's not the current parent, use its position as the map center.
                // This assumes nodes[0] is the central/root node of the entire map.
                // Note: node.x and node.y are already in the mainGroup's coordinate system.
                mapCenterX = nodes[0].x || mapCenterX;
                mapCenterY = nodes[0].y || mapCenterY;
            }

            // Calculate the angle from the map center to the parentNode. This defines the "outward" direction.
            const dxToParent = parentNode.x - mapCenterX;
            const dyToParent = parentNode.y - mapCenterY;

            if (parentNode === nodes[0] || (dxToParent === 0 && dyToParent === 0)) {
                // If parentNode is the root/central node itself, or if it's exactly at mapCenter (no clear outward vector)
                // Default to a downward cone (or could be made configurable, e.g. PI/2 for first, then spread)
                coneCenterAngle = Math.PI / 2;
            } else {
                coneCenterAngle = Math.atan2(dyToParent, dxToParent);
            }

            const coneHalfAngle = (160 / 2) * (Math.PI / 180); // 80 degrees in radians
            let targetAngle = coneCenterAngle; // Default angle is center of the cone

            if (childrenOfParent.length > 0) {
                const existingAngles = childrenOfParent.map(child => {
                    const dxChild = child.x - parentNode.x;
                    const dyChild = child.y - parentNode.y;
                    return (Math.atan2(dyChild, dxChild) + 2 * Math.PI) % (2 * Math.PI);
                }).sort((a, b) => a - b);

                let normConeLower = (coneCenterAngle - coneHalfAngle + 2 * Math.PI) % (2 * Math.PI);
                let normConeUpper = (coneCenterAngle + coneHalfAngle + 2 * Math.PI) % (2 * Math.PI);

                let largestGap = 0;
                const boundaryPoints = [];

                // Add cone boundaries to boundaryPoints
                boundaryPoints.push(normConeLower);
                boundaryPoints.push(normConeUpper);

                existingAngles.forEach(ang => {
                    let isInCone;
                    if (normConeLower <= normConeUpper) { // Normal cone (e.g. lower=0.5rad, upper=2.5rad)
                        isInCone = ang >= normConeLower && ang <= normConeUpper;
                    } else { // Cone wraps around 0/2PI (e.g. lower=5.8rad, upper=0.5rad)
                        isInCone = ang >= normConeLower || ang <= normConeUpper;
                    }
                    if (isInCone) {
                        boundaryPoints.push(ang);
                    }
                });

                const sortedUniquePoints = [...new Set(boundaryPoints)].sort((a, b) => a - b);

                if (sortedUniquePoints.length > 1) {
                     // Iterate through gaps between sorted points (which include cone boundaries)
                    for (let i = 0; i < sortedUniquePoints.length; i++) {
                        let gapStart = sortedUniquePoints[i];
                        let gapEnd = sortedUniquePoints[(i + 1) % sortedUniquePoints.length]; // Wrap around for last segment
                        let currentGap = (gapEnd - gapStart + 2 * Math.PI) % (2 * Math.PI);

                        // If we are checking the gap that "crosses" the 2PI->0 boundary due to cone wrapping,
                        // and normConeLower > normConeUpper, this means the "main" part of the cone is split.
                        // The largest valid segment within the cone is what we want.
                        // The current logic of taking unique sorted points (cone bounds + children in cone)
                        // and finding largest gap between them should work.

                        let midPointCandidate = (gapStart + currentGap / 2 + 2 * Math.PI) % (2 * Math.PI);

                        let isMidpointInCone;
                        if (normConeLower <= normConeUpper) {
                            isMidpointInCone = midPointCandidate >= normConeLower && midPointCandidate <= normConeUpper;
                        } else {
                            isMidpointInCone = midPointCandidate >= normConeLower || midPointCandidate <= normConeUpper;
                        }
                        // Ensure we are not picking a gap outside the cone if the cone is small and children are outside.
                        // The boundaryPoints list only includes children *within* the cone, plus cone boundaries.
                        // So, any gap between these points should be within the cone.

                        if (currentGap > largestGap && isMidpointInCone) {
                            // Check if this gap is actually *within* the 160 degree cone, not the "reflex" 200 degree part.
                            // This is implicitly handled if boundaryPoints only contain angles within or at the cone.
                            // The crucial part is that `midPointCandidate` must fall within the defined cone.
                            largestGap = currentGap;
                            targetAngle = midPointCandidate;
                        }
                    }
                }
                 // If largestGap is 0 after checking (e.g. cone is full, or only one child at a boundary), targetAngle remains coneCenterAngle.
            }
            // If no children, targetAngle is already coneCenterAngle.

            x = parentNode.x + targetDistance * Math.cos(targetAngle);
            y = parentNode.y + targetDistance * Math.sin(targetAngle);

        } else { // This is the first node in the graph (the true root)
            x = width / 2;
            y = height / 2;
        } else if (options.isListItem && parentNode) {
            // Specialized layout for list items
            const verticalSpacing = 50; // Distance between list items
            const firstItemOffsetY = targetDistance * 0.8; // Distance from parent to first item (slightly less than normal targetDistance)
            const horizontalOffset = 20; // Slight horizontal indent for list items

            x = parentNode.x + horizontalOffset;
            // options.itemIndex is 0-based index of the item in the list
            y = parentNode.y + firstItemOffsetY + (options.itemIndex * verticalSpacing);
        } else if (parentNode) { // Standard child node placement (cone logic)
             const childrenOfParent = nodes.filter(n => n.parentId === parentNode.id);
            let coneCenterAngle;
            // ... (rest of the existing cone logic remains unchanged here) ...
            let mapCenterX = width / 2;
            let mapCenterY = height / 2;

            if (nodes.length > 0 && nodes[0] !== parentNode) {
                mapCenterX = nodes[0].x || mapCenterX;
                mapCenterY = nodes[0].y || mapCenterY;
            }

            const dxToParent = parentNode.x - mapCenterX;
            const dyToParent = parentNode.y - mapCenterY;

            if (parentNode === nodes[0] || (dxToParent === 0 && dyToParent === 0)) {
                coneCenterAngle = Math.PI / 2;
            } else {
                coneCenterAngle = Math.atan2(dyToParent, dxToParent);
            }

            const coneHalfAngle = (160 / 2) * (Math.PI / 180);
            let targetAngle = coneCenterAngle;

            if (childrenOfParent.length > 0) {
                const existingAngles = childrenOfParent.map(child => {
                    const dxChild = child.x - parentNode.x;
                    const dyChild = child.y - parentNode.y;
                    return (Math.atan2(dyChild, dxChild) + 2 * Math.PI) % (2 * Math.PI);
                }).sort((a, b) => a - b);

                let normConeLower = (coneCenterAngle - coneHalfAngle + 2 * Math.PI) % (2 * Math.PI);
                let normConeUpper = (coneCenterAngle + coneHalfAngle + 2 * Math.PI) % (2 * Math.PI);

                let largestGap = 0;
                const boundaryPoints = [];
                boundaryPoints.push(normConeLower);
                boundaryPoints.push(normConeUpper);

                existingAngles.forEach(ang => {
                    let isInCone;
                    if (normConeLower <= normConeUpper) {
                        isInCone = ang >= normConeLower && ang <= normConeUpper;
                    } else {
                        isInCone = ang >= normConeLower || ang <= normConeUpper;
                    }
                    if (isInCone) {
                        boundaryPoints.push(ang);
                    }
                });

                const sortedUniquePoints = [...new Set(boundaryPoints)].sort((a, b) => a - b);

                if (sortedUniquePoints.length > 1) {
                    for (let i = 0; i < sortedUniquePoints.length; i++) {
                        let gapStart = sortedUniquePoints[i];
                        let gapEnd = sortedUniquePoints[(i + 1) % sortedUniquePoints.length];
                        let currentGap = (gapEnd - gapStart + 2 * Math.PI) % (2 * Math.PI);
                        let midPointCandidate = (gapStart + currentGap / 2 + 2 * Math.PI) % (2 * Math.PI);

                        let isMidpointInCone;
                        if (normConeLower <= normConeUpper) {
                            isMidpointInCone = midPointCandidate >= normConeLower && midPointCandidate <= normConeUpper;
                        } else {
                            isMidpointInCone = midPointCandidate >= normConeLower || midPointCandidate <= normConeUpper;
                        }
                        if (currentGap > largestGap && isMidpointInCone) {
                            largestGap = currentGap;
                            targetAngle = midPointCandidate;
                        }
                    }
                }
            }
            x = parentNode.x + targetDistance * Math.cos(targetAngle);
            y = parentNode.y + targetDistance * Math.sin(targetAngle);
        } else { // Should not happen if !parentNode and not options.isListItem (covered by first if)
             x = width / 2;
             y = height / 2;
        }


        const newNode = { id: newNodeId, text: text, x: x, y: y, parentId: parentNode ? parentNode.id : null };

        // Assign properties from options
        if (options.isListItem) {
            newNode.isListItem = true;
            newNode.listItemNumber = options.listItemNumber;
        } else {
            newNode.isListItem = false; // Ensure it's explicitly false if not a list item
        }

        // Identify if it's a bullet point (could be a list item, or a standalone bullet)
        if (text.startsWith("- ")) {
            newNode.isBulletPoint = true;
        } else {
            newNode.isBulletPoint = false;
        }
        // Set node depth
        newNode.depth = parentNode ? parentNode.depth + 1 : 0;

        nodes.push(newNode);

        if (parentNode) {
            // Store random offsets for control point calculation for this link
            const controlOffsetX = (Math.random() - 0.5) * 70; // Range for curve intensity
            const controlOffsetY = (Math.random() - 0.5) * 70;
            links.push({
                source: parentNode,
                target: newNode,
                controlOffsetX: controlOffsetX,
                controlOffsetY: controlOffsetY,
                originalDistance: targetDistance // Store original distance
            });
        }

        // Responsibility of calling function to update selection, clear input, and re-render.
        // Also, the calling function (handleInputKeydown) will manage simulation updates.
        return newNode;
    }

    function handleInputKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const text = nodeInput.value.trim();
            if (!text) return;

            let newNode; // To store the single new node if not a list
            let newNodesList = []; // To store multiple nodes if it's a list

            const parsedList = parseNumberedList(text);

            if (parsedList) {
                // Batch creation for numbered list
                let actualParentNode;
                if (nodes.length === 0) {
                    actualParentNode = null; // Should not happen if parsing a list to add to something
                                          // But if it did, list items would become roots.
                                          // For now, assume list is added to an existing node or as children of root.
                } else if (selectedNode) {
                    if (isPrimedForChild) {
                        actualParentNode = selectedNode; // Add list as children of selectedNode
                        isPrimedForChild = false; // Parent is no longer primed after adding children
                        nodeInput.placeholder = `Enter a sibling to '${selectedNode.text}' (Enter) or child (Shift+Enter)...`;
                    } else {
                        actualParentNode = selectedNode.parentId !== null ? nodes.find(n => n.id === selectedNode.parentId) : null; // Add list as siblings
                    }
                } else {
                     actualParentNode = null; // Add list items as root nodes if nothing selected
                }

                parsedList.forEach((item, index) => {
                    const listItemNode = addNode(item.itemText, actualParentNode, {
                        isListItem: true,
                        listItemNumber: item.number,
                        itemIndex: index,
                        totalListItems: parsedList.length
                    });
                    newNodesList.push(listItemNode);
                });

                if (newNodesList.length > 0) {
                    newNode = newNodesList[newNodesList.length - 1]; // Last node in list becomes the one to focus/select
                    // Add history action for the whole list creation
                    addToHistory({
                        type: 'addList',
                        nodeIds: newNodesList.map(n => n.id),
                        parentId: actualParentNode ? actualParentNode.id : null,
                        // Storing all items might be too much, but useful for a more complex undo
                        // For now, a simple undo might just remove all these nodeIds.
                    });
                }

            } else { // Not a list, proceed with single node creation logic
                if (nodes.length === 0) {
                    newNode = addNode(text, null);
                } else if (selectedNode) {
                    if (event.shiftKey) {
                        newNode = addNode(text, selectedNode);
                    } else {
                        if (isPrimedForChild) {
                            newNode = addNode(text, selectedNode);
                            isPrimedForChild = false;
                            nodeInput.placeholder = `Enter a sibling to '${selectedNode.text}' (Enter) or child (Shift+Enter)...`;
                        } else {
                            const parentOfSelected = selectedNode.parentId !== null ? nodes.find(n => n.id === selectedNode.parentId) : null;
                            newNode = addNode(text, parentOfSelected);
                        }
                    }
                } else {
                    newNode = addNode(text, null);
                }
            }


            if (newNode) { // This will be true if a single node was created, or it's the last node of a list.
                // If it was a single node (not a list), add to history here.
                // List additions are added to history inside the parsedList block.
                if (!parsedList && newNode) { // Check if newNode exists to be safe, though it should
                    addToHistory({
                        type: 'addNode',
                        nodeId: newNode.id,
                        parentId: newNode.parentId,
                        text: newNode.text,
                        isDefinitionNode: newNode.isDefinitionNode,
                        isBulletPoint: newNode.isBulletPoint
                    });
                }

                handleNodeClick(null, newNode);
                nodeInput.value = '';

                // If the new node (or the first node of a list) is a root node, fit the view.
                // This handles both the very first node(s) and subsequent root node additions.
                if (newNode.parentId === null) {
                    fitViewToMindMap();
                }

            } else if (selectedNode) {
                addToHistory({
                    type: 'addNode',
                    nodeId: newNode.id,
                    // Store parentId if it exists, otherwise null. Useful for re-selecting parent on undo.
                    parentId: newNode.parentId,
                    // Store text and flags in case undo needs to restore them perfectly, though current undo just removes.
                    text: newNode.text,
                    isDefinitionNode: newNode.isDefinitionNode,
                    isBulletPoint: newNode.isBulletPoint
                });

                handleNodeClick(null, newNode); // This calls render() and sets up selection
                nodeInput.value = '';

                // Restart simulation AFTER node is added and selections/renders are initiated
                simulation.alpha(1).restart();

                if (newNode.parentId === null || nodes.length === 1) { // If it's a root node or the very first node
                    fitViewToMindMap();
                }
            } else if (selectedNode) {
                // No new node was created, but a node is still selected.
                // Update its placeholder based on its current 'isPrimedForChild' state.
                if (isPrimedForChild) { // Should be State 0
                    nodeInput.placeholder = `Add a child to '${selectedNode.text}' (Enter)...`;
                } else { // Should be State 1
                    nodeInput.placeholder = `Enter a sibling to '${selectedNode.text}' (Enter) or child (Shift+Enter)...`;
                }
            } else if (nodes.length === 0) {
                 nodeInput.placeholder = "Enter text for the first node...";
            } else {
                 nodeInput.placeholder = "Select a node, or type to create a new root node...";
            }
            // Ensure render is called if not handled by handleNodeClick (which is called if newNode exists)
            if (!newNode) {
                render();
            }
        }
    }

    // Handles click events on nodes.
    function handleNodeClick(event, clickedNode) {
        selectedNode = clickedNode;
        isPrimedForChild = true;
        nodeInput.placeholder = `Add a child to '${clickedNode.text}' (Enter)...`;
        nodeInput.focus();

        render(); // Re-render to highlight selection; simulation continues.
        centerOnNode(clickedNode); // Center view on the clicked node
        displayGhostNodes(clickedNode); // Show ghost node(s)
    }

    function displayGhostNodes(parentNode) {
        mainGroup.selectAll(".ghost-node").remove(); // Clear existing ghost nodes
        mainGroup.selectAll(".idea-suggestion").remove(); // Also clear any previous idea suggestions

        if (!parentNode) {
            return;
        }

        const parentRadius = calculateNodeRadius(parentNode.text);
        const commonFontSize = 10;
        const commonTextPadding = 8;
        const commonRectHeight = commonFontSize + 2 * commonTextPadding;
        const commonRectRxRy = 8;

        // --- "+ Definition" Ghost Node ---
        const definitionGhostGroup = mainGroup.append("g")
            .datum(parentNode)
            .attr("class", "ghost-node ghost-definition") // Added specific class
            .style("cursor", "pointer");

        const defGhostX = parentNode.x + parentRadius + 35;
        const defGhostY = parentNode.y - commonRectHeight / 2 - 5; // Position slightly above right

        const defTextContent = "+ Definition";
        const defTempTextMeasure = svg.append("text").text(defTextContent).attr("font-size", `${commonFontSize}px`).style("opacity",0);
        const defTextWidth = defTempTextMeasure.node().getComputedTextLength();
        defTempTextMeasure.remove();
        const defRectWidth = defTextWidth + 2 * commonTextPadding;

        definitionGhostGroup.attr("transform", `translate(${defGhostX}, ${defGhostY})`);
        definitionGhostGroup.append("rect")
            .attr("x", -defRectWidth / 2).attr("y", -commonRectHeight / 2)
            .attr("width", defRectWidth).attr("height", commonRectHeight)
            .attr("rx", commonRectRxRy).attr("ry", commonRectRxRy)
            .attr("fill", "rgba(120, 120, 220, 0.8)").attr("stroke", "rgba(80, 80, 180, 1)").attr("stroke-width", 1);
        definitionGhostGroup.append("text").text(defTextContent)
            .attr("text-anchor", "middle").attr("dominant-baseline", "central")
            .attr("font-size", `${commonFontSize}px`).attr("fill", "white");
        definitionGhostGroup.on("click", (event) => handleGhostNodeClick(event, parentNode, "definition"));

        // --- "Get Ideas" Ghost Node ---
        const ideasGhostGroup = mainGroup.append("g")
            .datum(parentNode)
            .attr("class", "ghost-node ghost-ideas") // Added specific class
            .style("cursor", "pointer");

        const ideasGhostX = parentNode.x + parentRadius + 35;
        const ideasGhostY = parentNode.y + commonRectHeight / 2 + 5; // Position slightly below right

        const ideasTextContent = "Get Ideas ✨"; // Or an icon
        const ideasTempTextMeasure = svg.append("text").text(ideasTextContent).attr("font-size", `${commonFontSize}px`).style("opacity",0);
        const ideasTextWidth = ideasTempTextMeasure.node().getComputedTextLength();
        ideasTempTextMeasure.remove();
        const ideasRectWidth = ideasTextWidth + 2 * commonTextPadding;

        ideasGhostGroup.attr("transform", `translate(${ideasGhostX}, ${ideasGhostY})`);
        ideasGhostGroup.append("rect")
            .attr("x", -ideasRectWidth / 2).attr("y", -commonRectHeight / 2)
            .attr("width", ideasRectWidth).attr("height", commonRectHeight)
            .attr("rx", commonRectRxRy).attr("ry", commonRectRxRy)
            .attr("fill", "rgba(100, 200, 100, 0.8)").attr("stroke", "rgba(50, 150, 50, 1)").attr("stroke-width", 1);
        ideasGhostGroup.append("text").text(ideasTextContent)
            .attr("text-anchor", "middle").attr("dominant-baseline", "central")
            .attr("font-size", `${commonFontSize}px`).attr("fill", "white");
        ideasGhostGroup.on("click", (event) => handleGetIdeasClick(event, parentNode));
    }

    // Resize handler
    async function handleGetIdeasClick(event, parentNode) {
        event.stopPropagation();
        console.log("Get Ideas clicked for node:", parentNode.text);
        mainGroup.selectAll(".idea-suggestion").remove(); // Clear previous suggestions

        // Basic loading indicator (e.g., disable button, change text)
        const ideasButton = mainGroup.select(".ghost-ideas"); // Assuming this class targets the button
        const originalButtonText = ideasButton.select("text").text();
        ideasButton.select("text").text("Loading...");
        ideasButton.style("pointer-events", "none"); // Disable further clicks

        const prompt = `Brainstorm some related concepts or child ideas for the following mind map node: "${parentNode.text}". Return exactly 3-5 brief ideas as a JSON array of strings under the key "ideas". Example: {"ideas": ["idea1", "idea2"]}`;

        try {
            const responseString = await callGeminiAPI(prompt, true);
            const responseObject = JSON.parse(responseString);
            const ideas = responseObject.ideas;

            if (ideas && ideas.length > 0) {
                displayIdeaSuggestions(parentNode, ideas);
            } else {
                console.log("LLM returned no ideas or unexpected format.");
                // Optionally display a message to the user that no ideas were found
            }
        } catch (error) {
            console.error("Error getting ideas from LLM:", error);
            // Display error to user, e.g., by briefly changing button text or showing a toast
            ideasButton.select("text").text("Error!");
            setTimeout(() => ideasButton.select("text").text(originalButtonText), 2000); // Reset after 2s
        } finally {
            // Re-enable button if it wasn't replaced by suggestions
            if (!mainGroup.selectAll(".idea-suggestion").empty()){
                 // If suggestions are shown, the ghost nodes might be rebuilt by displayGhostNodes on next click,
                 // or we might want to hide the "Get Ideas" button specifically.
                 // For now, let's assume displayGhostNodes will handle it or it's okay for it to reappear.
            } else {
                 ideasButton.select("text").text(originalButtonText); // Reset if no suggestions shown
            }
            ideasButton.style("pointer-events", "auto");
        }
    }

    function displayIdeaSuggestions(parentNode, ideasArray) {
        mainGroup.selectAll(".idea-suggestion").remove(); // Clear previous before showing new

        const parentRadius = calculateNodeRadius(parentNode.text);
        const baseOffsetY = parentRadius + 20; // Start suggestions below parent
        const suggestionHeight = 25;
        const suggestionMargin = 5;
        const commonFontSize = 10;
        const commonTextPadding = 8;
        const commonRectRxRy = 8;

        ideasArray.forEach((idea, index) => {
            const suggestionGroup = mainGroup.append("g")
                .attr("class", "idea-suggestion")
                .style("cursor", "pointer")
                .datum({ parent: parentNode, ideaText: idea }); // Store data if needed

            // Position suggestions fanning out or in a list
            const suggestionX = parentNode.x;
            const suggestionY = parentNode.y + baseOffsetY + index * (suggestionHeight + suggestionMargin);

            const tempTextMeasure = svg.append("text").text(idea).attr("font-size", `${commonFontSize}px`).style("opacity",0);
            const textWidth = tempTextMeasure.node().getComputedTextLength();
            tempTextMeasure.remove();
            const rectWidth = textWidth + 2 * commonTextPadding + 10; // Extra padding for a "+" icon if desired

            suggestionGroup.attr("transform", `translate(${suggestionX}, ${suggestionY})`);

            suggestionGroup.append("rect")
                .attr("x", -rectWidth / 2)
                .attr("y", -suggestionHeight / 2)
                .attr("width", rectWidth)
                .attr("height", suggestionHeight)
                .attr("rx", commonRectRxRy)
                .attr("ry", commonRectRxRy)
                .attr("fill", "rgba(220, 220, 100, 0.9)") // Light yellow for suggestions
                .attr("stroke", "rgba(180, 180, 50, 1)");

            suggestionGroup.append("text")
                .text(idea) // Could prepend with "+ "
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "central")
                .attr("font-size", `${commonFontSize}px`)
                .attr("fill", "#333");

            suggestionGroup.on("click", (event, d) => handleIdeaSuggestionClick(event, parentNode, idea));
        });
    }

    function handleIdeaSuggestionClick(event, parentOfNewNode, ideaText) {
        event.stopPropagation();

        const newNode = addNode(ideaText, parentOfNewNode);
        if (newNode.text.startsWith("- ")) { // If LLM returns a bullet point, ensure flag is set
            newNode.isBulletPoint = true;
        } else {
            newNode.isBulletPoint = false;
        }
        // Ensure it's not accidentally a definition node
        newNode.isDefinitionNode = false;

        render();
        simulation.nodes(nodes);
        simulation.force("link").links(links);
        simulation.alpha(1).restart();

        handleNodeClick(null, newNode); // Select the new node (this will also clear suggestions via displayGhostNodes)
        // mainGroup.selectAll(".idea-suggestion").remove(); // Explicitly remove, though handleNodeClick->displayGhostNodes should do it.
    }


    function handleGhostNodeClick(event, parentNode, type) {
        event.stopPropagation(); // Prevent click from propagating to other elements like mainGroup or SVG

        if (type === "definition") {
            const definitionTitle = "Definition";

            // Create the new definition node
            const newNode = addNode(definitionTitle, parentNode);
            if (!newNode) return;

            newNode.isDefinitionNode = true;
            newNode.definitionContent = "Fetching definition..."; // Initial content

            // Initial render to show the "Fetching..." state
            render();
            simulation.nodes(nodes);
            simulation.force("link").links(links);
            // simulation.alpha(1).restart(); // Restart after LLM call for potentially better placement with final size

            // Select the new definition node - this also calls render()
            handleNodeClick(null, newNode);

            // Asynchronously fetch the definition
            (async () => {
                const definitionPrompt = `Provide a concise 2-3 line explanation (max 150 characters) for the term: "${parentNode.text}". Do not use markdown or special formatting. Just the plain text explanation.`;
                try {
                    console.log(`Fetching definition for: ${parentNode.text}`);
                    const fetchedDefinition = await callGeminiAPI(definitionPrompt, false);
                    newNode.definitionContent = fetchedDefinition;
                } catch (error) {
                    console.error("Error fetching definition from LLM:", error);
                    newNode.definitionContent = "Could not fetch definition.";
                } finally {
                    // Re-render to show the fetched definition or error.
                    // Also, restart simulation more vigorously here as content change might affect size/layout needs.
                    render();
                    simulation.alpha(0.3).restart(); // Give some energy to resettle if needed
                }
            })();
        }
        // Future: handle other ghost node types like "+ Example", etc.
    }

    window.addEventListener('resize', () => {
        width = canvasContainer.offsetWidth;
        height = canvasContainer.offsetHeight;
        svg.attr('width', width).attr('height', height);
        simulation.force("center", d3.forceCenter(width / 2, height / 2)); // Update center force
        // simulation.alpha(0.3).restart(); // Simulation will adjust based on center, fitView is more comprehensive here
        fitViewToMindMap(); // Adjust view on resize
    });

    // Drag behavior functions integrated with force simulation
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart(); // Heat up simulation
        d.fx = d.x; // Fix node's x position
        d.fy = d.y; // Fix node's y position
        d3.select(this).raise().classed("active", true);
    }

    function dragged(event, d) {
        d.fx = event.x; // Update fixed x position during drag
        d.fy = event.y; // Update fixed y position during drag
        // No need to call render() here, ticked function handles position updates.
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0); // Cool down simulation
        d.fx = null;
        d.fy = null;
        d3.select(this).classed("active", false);

        // Elastic connectors: Adjust resting distance for links connected to the dragged node
        links.forEach(link => {
            if (link.source === d || link.target === d) {
                const dx = link.target.x - link.source.x;
                const dy = link.target.y - link.source.y;
                const currentDist = Math.sqrt(dx * dx + dy * dy);
                const originalDist = link.originalDistance || targetDistance; // Fallback to global

                if (currentDist > originalDist) { // Stretched
                    link.targetRestingDistance = currentDist * 0.75; // Contract a bit
                } else { // Compressed
                    link.targetRestingDistance = currentDist * 1.15; // Expand a bit
                }
            }
        });
        simulation.force("link").distance(l => l.targetRestingDistance || targetDistance);
        simulation.alpha(0.3).restart(); // Reheat simulation to resettle links

        if (d === selectedNode) {
            centerOnNode(d, 250);
        }
    }

    // Node Editing (Double-Click) Handler
    function handleNodeDblClick(event, d) {
        event.stopPropagation(); // Prevent event from bubbling up to SVG
        const nodeElement = this; // The <g class="node"> element
        const nodeData = d; // The data object for the node {id, text, x, y, ...}

        // Hide existing text
        d3.select(nodeElement).select('text').style('display', 'none');

        // Create a temporary input field
        const tempInput = document.createElement('input');
        tempInput.type = 'text';
        tempInput.value = nodeData.text;
        tempInput.style.position = 'absolute'; // Positioned relative to document body

        // Calculate absolute position for the input based on node's transformed coordinates
        // currentTransform applies to mainGroup content. Node x,y are within mainGroup.
        // canvasContainer.offsetLeft/Top are offsets of the SVG container itself.
        const scaledX = nodeData.x * currentTransform.k + currentTransform.x;
        const scaledY = nodeData.y * currentTransform.k + currentTransform.y;

        // Estimate width/height based on node's appearance
        const estimatedNodeRadius = calculateNodeRadius(nodeData.text);
        const inputWidth = Math.max(100, estimatedNodeRadius * 1.8); // Min width 100px or 1.8x radius
        const baseFontSize = getFontSizeByDepth(nodeData.depth || 0);
        const inputHeight = baseFontSize + 10; // Based on node's text size + padding

        // Position the input field's center over the node's visual center on screen
        tempInput.style.left = (scaledX + canvasContainer.offsetLeft - inputWidth / 2) + 'px';
        tempInput.style.top = (scaledY + canvasContainer.offsetTop - inputHeight / 2) + 'px';

        tempInput.style.width = inputWidth + 'px';
        tempInput.style.height = inputHeight + 'px';
        tempInput.style.fontSize = (baseFontSize * 0.95) + 'px'; // Slightly smaller or same as node text
        tempInput.style.textAlign = 'center';
        tempInput.style.border = '1px solid #ccc';
        tempInput.style.zIndex = '100'; // Ensure it's on top

        document.body.appendChild(tempInput);
        tempInput.focus();
        tempInput.select();

        // Function to finalize editing
        function finalizeEdit() {
            const oldText = nodeData.text;
            const newText = tempInput.value;
            nodeData.text = newText;

            // Update isBulletPoint flag based on new text
            if (newText.startsWith("- ")) {
                nodeData.isBulletPoint = true;
            } else {
                nodeData.isBulletPoint = false;
            }

            document.body.removeChild(tempInput);
            d3.select(nodeElement).select('text').style('display', null); // Unhide

            if (oldText !== nodeData.text || (oldText.startsWith("- ") !== newText.startsWith("- "))) { // Re-render if text or bullet status changed
                render(); // Re-render to update text, radius, and potentially textPath
                // Simulation update might be needed if radius change affects forces significantly
                // simulation.alpha(0.1).restart(); // Gentle restart
            }
        }

        tempInput.addEventListener('blur', finalizeEdit);
        tempInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                tempInput.blur(); // Trigger finalizeEdit
            } else if (e.key === 'Escape') {
                // Revert to old text or simply remove input without saving
                document.body.removeChild(tempInput);
                d3.select(nodeElement).select('text').style('display', null); // Unhide
            }
        });
    }

    // Initial render call to set up SVG elements before simulation starts affecting positions.
    render();
    nodeInput.focus();
    selectRandomTheme(); // Select and apply a theme
    fitViewToMindMap(); // Fit view on initial load (might need theme colors if it re-renders)

    // --- PDF Export ---
    const exportPdfButton = document.getElementById('export-pdf-button');
    if (exportPdfButton) {
        exportPdfButton.addEventListener('click', handleExportPDF);
    }

    async function handleExportPDF() {
        // Check if jsPDF is loaded
        if (typeof window.jspdf === 'undefined') {
            console.error("jsPDF library not loaded!");
            alert("Error: jsPDF library is not available. Cannot export PDF.");
            return;
        }
        const { jsPDF } = window.jspdf; // Destructure for convenience

        const svgElement = document.getElementById('mindmap-canvas');
        if (!svgElement) {
            console.error("SVG element not found!");
            alert("Error: SVG element for mind map not found.");
            return;
        }

        // Get the current dimensions of the SVG element itself
        // These are the dimensions of the viewable area, not necessarily the content bounds
        const svgWidth = svgElement.width.baseVal.value;
        const svgHeight = svgElement.height.baseVal.value;

        // Create a jsPDF instance
        const pdf = new jsPDF({
            orientation: svgWidth > svgHeight ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [svgWidth, svgHeight]
        });

        // Try to add the SVG using jsPDF's built-in SVG rendering capabilities
        try {
            // Note: jsPDF's built-in SVG rendering has limitations.
            // It might not support all SVG features, external stylesheets, or complex gradients/fonts perfectly.
            // The 'Inter' font might not be captured unless available to jsPDF or converted to paths.
            // Transforms on the `mainGroup` (for zoom/pan) need to be applied to the content for export.

            // To capture the current view (including zoom/pan):
            // One way is to create a temporary clone of the SVG, apply the transform to its content,
            // and then pass that to jsPDF. Or, if jsPDF's .svg() method can take a transform context.

            // For simplicity in this step, we'll try to render the mainGroup with its transform.
            // This requires jsPDF's .svg() method to handle the <g> element and its transform.
            const mainGroupElement = mainGroup.node();

            // jsPDF's .svg() method expects the SVG element itself or an SVG string.
            // To apply the current zoom transform correctly, we might need to temporarily apply it
            // to the mainGroup's direct children or create a new SVG string with the transform baked in.

            // Alternative: Use a library like 'save-svg-as-png' to get a data URL (PNG) and add as image.
            // This loses vector quality but is often more reliable for visual fidelity of complex SVGs.
            // For now, attempt direct SVG method with jsPDF if available.

            if (pdf.svg && typeof pdf.svg === 'function') {
                 // Get the mainGroup's outerHTML and wrap it in an SVG tag with the current transform.
                 // This is a simplified approach. A more robust one would parse and reconstruct.
                const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                tempSvg.setAttribute("width", svgWidth);
                tempSvg.setAttribute("height", svgHeight);
                // It's important to copy relevant styles and defs if they are not inline
                const defsContent = defs.node().cloneNode(true);
                tempSvg.appendChild(defsContent);

                const transformedGroup = mainGroupElement.cloneNode(true);
                // The mainGroup already has the currentTransform applied by D3 zoom.
                // When jsPDF renders an SVG element, it should respect this transform.

                // We need to provide the whole SVG structure for context (like fonts, defs)
                // Cloning the original SVG and then ensuring the mainGroup's transform is correctly captured.
                const clonedSvgElement = svgElement.cloneNode(true); // Deep clone
                // The mainGroup within the clone already has its transform from the live SVG.

                // It's often better to serialize the *original* SVG after ensuring styles are inline,
                // and then tell jsPDF how to scale/translate it if the library supports that well.
                // Or, use a library that specifically handles d3 output to PDF.

                // For this subtask, let's try adding the mainGroup content directly.
                // This is highly dependent on the capabilities of the specific jsPDF version's .svg() method.
                await pdf.svg(mainGroupElement, {
                    x: 0, //currentTransform.x, // These x,y in pdf.svg might be offsets, not for transform
                    y: 0, //currentTransform.y,
                    width: svgWidth / currentTransform.k, // Adjust for scale
                    height: svgHeight / currentTransform.k,
                    // It's possible we need to pass the scale and translate to the options
                    // or apply them manually to the content before passing to pdf.svg
                });
                // The above is a guess at how pdf.svg might work with a transformed group.
                // A more common use is `pdf.svg(svgElement)` which would take the whole thing.
                // If we take the whole svgElement, the zoom transform is on mainGroup.
                // We need to ensure that the export reflects the *current view* (zoomed/panned state).
                // This might mean creating a temporary SVG string where the mainGroup's transform is applied
                // to its children, or the viewbox is adjusted.

                // Let's try a simpler approach: export the whole SVG, assuming jsPDF handles the transform.
                // This is often the first thing to try with jsPDF's SVG support.
                 await pdf.svg(svgElement, {
                     width: svgWidth,
                     height: svgHeight,
                 });


            } else {
                console.warn("jsPDF .svg() method not available or not a function. SVG export will be limited.");
                // Fallback: could try adding as image if svg method fails, or just save empty.
                // For this example, we'll just save what we have, which might be an empty page if .svg failed.
                alert("PDF generation using direct SVG method might be limited or failed. Check console.");
            }

        } catch (e) {
            console.error("Error during PDF generation with jsPDF .svg():", e);
            alert("Error generating PDF. SVG content might be too complex for direct export.");
            // return; // Optional: stop if PDF generation failed critically
        }

        pdf.save("mindmap.pdf");
        console.log("PDF export initiated.");
    }


    // --- Global Keydown Listener for Deletion and Undo ---
    document.addEventListener('keydown', (event) => {
        // Undo: Ctrl+Z or Cmd+Z
        // This should work even if an input field has focus, as it's a global command.
        if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
            event.preventDefault();
            undoLastAction();
            return; // Undo action taken, no further processing for this key event.
        }

        // Node Deletion Logic:
        // Check if the event target is an input field where Backspace/Delete should function as text editing.
        const activeElement = document.activeElement;
        const isTypingInInput = activeElement &&
                               (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);

        if (event.key === 'Backspace' || event.key === 'Delete') {
            if (isTypingInInput) {
                // If focus is on an input/textarea/contentEditable, allow default Backspace/Delete for text editing.
                // Exception: if it's our main nodeInput and it's empty, we might still want to delete.
                // However, the problem brief implies deletion only if selectedNode is not null.
                // So, if typing, generally don't delete nodes.
                return;
            }

            if (selectedNode) { // Only proceed with node deletion if a node is selected
                event.preventDefault(); // Prevent browser back navigation or other default actions
                deleteNodeAndDescendants(selectedNode.id);

                selectedNode = null;
                isPrimedForChild = false;
                nodeInput.placeholder = nodes.length === 0 ? "Enter text for the first node..." : "Select a node or type to create a new root node...";

                render();
                simulation.nodes(nodes);
                simulation.force("link").links(links);
                simulation.alpha(1).restart();
                fitViewToMindMap();
                mainGroup.selectAll(".ghost-node").remove();
            }
        }
    });

    // --- Helper function for Deletion ---
    function deleteNodeAndDescendants(rootNodeId) {
        const nodesToDelete = new Set();
        const q = [rootNodeId]; // Queue for BFS traversal to find descendants

        // Find all descendants
        while (q.length > 0) {
            const currentId = q.shift();
            if (!nodesToDelete.has(currentId)) {
                nodesToDelete.add(currentId);
                links.forEach(link => {
                    if (link.source.id === currentId && !nodesToDelete.has(link.target.id)) {
                        q.push(link.target.id);
                    }
                    // Note: If graph can have cycles or parent pointers are not strictly one-way,
                    // this might need adjustment. For a tree/DAG structure, this is okay.
                });
            }
        }

        // Filter out nodes to be deleted
        const newNodes = nodes.filter(node => !nodesToDelete.has(node.id));

        // Filter out links connected to deleted nodes
        const newLinks = links.filter(link =>
            !nodesToDelete.has(link.source.id) && !nodesToDelete.has(link.target.id)
        );

        nodes = newNodes; // Keep one
        links = newLinks;
    }

    // --- Undo Last Action ---
    function undoLastAction() {
        if (history.length === 0) {
            console.log("No actions to undo.");
            return;
        }

        const lastAction = history.pop();
        console.log("Undoing action:", lastAction);

        if (lastAction.type === 'addNode') {
            const nodeToRemove = nodes.find(n => n.id === lastAction.nodeId);
            if (nodeToRemove) {
                // Remove the node
                nodes = nodes.filter(n => n.id !== lastAction.nodeId);
                // Remove links connected to this node (as source or target)
                links = links.filter(l => l.target.id !== lastAction.nodeId && l.source.id !== lastAction.nodeId);

                // Clear selection or try to select parent
                if (selectedNode && selectedNode.id === lastAction.nodeId) {
                    selectedNode = nodes.find(n => n.id === lastAction.parentId) || null;
                    if (selectedNode) {
                        handleNodeClick(null, selectedNode); // This also calls render, center, displayGhostNodes
                    } else {
                        mainGroup.selectAll(".ghost-node").remove();
                        mainGroup.selectAll(".idea-suggestion").remove();
                        nodeInput.placeholder = nodes.length === 0 ? "Enter text for the first node..." : "Select a node or type to create a new root node...";
                        render(); // Render if no node became selected
                    }
                } else {
                    render(); // Render if a different node was selected
                }

                simulation.nodes(nodes);
                simulation.force("link").links(links);
                simulation.alpha(0.3).restart();
                fitViewToMindMap(); // Refit view after undo

                // Remove any gradient associated with the undone node
                defs.select(`#grad-${lastAction.nodeId}`).remove();
                console.log("Node undone:", lastAction.nodeId);
            }
        } else if (lastAction.type === 'addList') {
            let parentOfList = null;
            if (lastAction.nodeIds && lastAction.nodeIds.length > 0) {
                lastAction.nodeIds.forEach(nodeId => {
                    const nodeToRemove = nodes.find(n => n.id === nodeId);
                    if (nodeToRemove && nodeToRemove.parentId !== undefined) { // Capture parentId from the first node in the list
                        parentOfList = nodeToRemove.parentId;
                    }
                    nodes = nodes.filter(n => n.id !== nodeId);
                    links = links.filter(l => l.target.id !== nodeId && l.source.id !== nodeId);
                    defs.select(`#grad-${nodeId}`).remove();
                });

                console.log("List undone, node IDs:", lastAction.nodeIds);

                if (selectedNode && lastAction.nodeIds.includes(selectedNode.id)) {
                    selectedNode = nodes.find(n => n.id === parentOfList) || null;
                    if (selectedNode) {
                        handleNodeClick(null, selectedNode);
                    } else {
                        mainGroup.selectAll(".ghost-node").remove();
                        mainGroup.selectAll(".idea-suggestion").remove();
                        nodeInput.placeholder = nodes.length === 0 ? "Enter text for the first node..." : "Select a node or type to create a new root node...";
                         render(); // Render if no node became selected
                    }
                } else {
                     render(); // Render if a different node was selected
                }
                simulation.nodes(nodes);
                simulation.force("link").links(links);
                simulation.alpha(0.3).restart();
                fitViewToMindMap();
            }
        } else if (lastAction.type === 'deleteNodes') {
            // TODO: Implement undo for deletion if required
            console.warn("Undo for 'deleteNodes' not fully implemented in this pass. Pushing action back to history for now.");
            history.push(lastAction); // Push back as it's not handled
        }
        // Add more else if blocks for other action types like 'editNode', 'moveNode' etc. later.
    }


    // --- LLM Interaction Placeholder Functions ---

    async function triggerProactiveSuggestions(newNode) {
        if (!newNode) return;
        console.log(`Placeholder: Triggering proactive suggestions for node: ${newNode.text} (ID: ${newNode.id})`);
        // Simulate an API call
        loadingIndicator.style.display = 'block';
        try {
            const context = `The user just added a node "${newNode.text}". What are some related ideas?`;
            // In a real scenario, you might want to provide more context (parent, siblings etc.)
            const suggestions = await callProactiveGemini(context, newNode.text);
            displayAiSuggestions(suggestions, newNode);
        } catch (error) {
            console.error("Error in triggerProactiveSuggestions:", error);
            displayAiResponse(`Error fetching suggestions for "${newNode.text}".`, "Error");
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }

    async function callProactiveGemini(context, latestEntry) {
        console.log(`Placeholder: Calling proactive Gemini with context: "${context}", latest entry: "${latestEntry}"`);
        // This would call the actual Gemini API
        // For now, using the existing mock which expects a different prompt structure.
        // Let's adapt or make a new mock structure if needed.
        // For now, let's return a simple list of suggestions.
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
        return ["Proactive Suggestion 1", "Follow-up idea 2", "Another related concept 3"];
    }

    const summarizeBtn = document.getElementById('summarize-btn');
    const elaborateBtn = document.getElementById('elaborate-btn');
    const loadingIndicator = document.getElementById('loading-indicator'); // Assuming this exists in HTML based on original spec
    const suggestionPanel = document.getElementById('suggestion-panel'); // Assuming this exists

    if (summarizeBtn) {
        summarizeBtn.addEventListener('click', async () => {
            if (!selectedNode) {
                alert("Please select a node to summarize.");
                return;
            }
            console.log(`Placeholder: Summarize button clicked for node: ${selectedNode.text}`);
            loadingIndicator.style.display = 'block';
            // In a real app, gather context for summarization (e.g., node and its children)
            const textToSummarize = `Node: ${selectedNode.text}` + (selectedNode.children ? selectedNode.children.map(c => c.name).join(', ') : '');
            try {
                const summary = await callGeminiAPI(`Summarize the following: ${textToSummarize}`, false);
                displayAiResponse(summary, `Summary of "${selectedNode.text}"`);
                flashNode(selectedNode.id);
            } catch (error) {
                console.error("Error summarizing:", error);
                displayAiResponse(`Error summarizing "${selectedNode.text}".`, "Error");
            } finally {
                loadingIndicator.style.display = 'none';
            }
        });
    } else {
        console.warn("summarize-btn not found in the HTML.");
    }

    if (elaborateBtn) {
        elaborateBtn.addEventListener('click', async () => {
            if (!selectedNode) {
                alert("Please select a node to elaborate on.");
                return;
            }
            console.log(`Placeholder: Elaborate button clicked for node: ${selectedNode.text}`);
            loadingIndicator.style.display = 'block';
            try {
                const elaboration = await callGeminiAPI(`Elaborate on the idea: ${selectedNode.text}`, false);
                // Add elaborated text as new child nodes or display in panel
                // For now, display in panel:
                displayAiResponse(elaboration, `Elaboration for "${selectedNode.text}"`);
                flashNode(selectedNode.id);
            } catch (error) {
                console.error("Error elaborating:", error);
                displayAiResponse(`Error elaborating on "${selectedNode.text}".`, "Error");
            } finally {
                loadingIndicator.style.display = 'none';
            }
        });
    } else {
        console.warn("elaborate-btn not found in the HTML.");
    }

    function flashNode(nodeId) {
        console.log(`Placeholder: Flashing node ID: ${nodeId}`);
        const nodeElement = nodeGroups.filter(d => d.id === nodeId);
        if (!nodeElement.empty()) {
            const circle = nodeElement.select('circle'); // Or other shape
            if (!circle.empty()) {
                circle.classed('flashing', true);
                setTimeout(() => circle.classed('flashing', false), 1000); // Match CSS animation
            }
        }
    }

    function displayAiSuggestions(suggestions, parentNode) {
        console.log(`Placeholder: Displaying AI suggestions:`, suggestions, `for parent: ${parentNode ? parentNode.text : 'root'}`);
        if (!suggestionPanel) {
            console.error("suggestion-panel element not found in HTML.");
            return;
        }
        // Clear previous suggestions and help text
        suggestionPanel.innerHTML = '';

        const helpText = document.getElementById('initial-help-text');
        if (helpText) helpText.style.display = 'none';

        if (!suggestions || suggestions.length === 0) {
            suggestionPanel.innerHTML = '<p class="text-gray-500">No suggestions available right now.</p>';
            return;
        }

        const container = document.createElement('div');
        container.className = 'suggestion-container';

        suggestions.forEach(suggestionText => {
            const suggestionNodeEl = document.createElement('div');
            suggestionNodeEl.className = 'suggestion-node';
            // suggestionNodeEl.style.backgroundColor = d3.color(chosenPalette.colors[Math.floor(Math.random() * chosenPalette.colors.length)]).brighter(0.2);
            // suggestionNodeEl.style.color = getContrastingTextColor(suggestionNodeEl.style.backgroundColor);
            // For now, use fixed colors or CSS defined ones if available
            suggestionNodeEl.innerHTML = `<span class="plus-icon">+</span> <span>${suggestionText}</span>`;
            suggestionNodeEl.onclick = () => {
                console.log(`Adding suggested node: "${suggestionText}" to parent: ${parentNode ? parentNode.text : 'root'}`);
                const newNode = addNode(suggestionText, parentNode);
                if (newNode) {
                    handleNodeClick(null, newNode); // Select the new node
                    // Clear suggestions after one is added
                    suggestionPanel.innerHTML = '<p class="text-gray-500">Suggestion added! Add more ideas or select a node.</p>';
                     setTimeout(() => {
                        if(suggestionPanel.firstChild && suggestionPanel.firstChild.textContent === 'Suggestion added! Add more ideas or select a node.') {
                           suggestionPanel.innerHTML = '';
                           if(helpText) helpText.style.display = 'block'; // Show initial help or a generic one
                        }
                    }, 3000);
                }
            };
            container.appendChild(suggestionNodeEl);
        });
        suggestionPanel.appendChild(container);
    }

    function displayAiResponse(text, title) {
        console.log(`Placeholder: Displaying AI response. Title: "${title}", Text: "${text}"`);
        if (!suggestionPanel) {
            console.error("suggestion-panel element not found in HTML.");
            return;
        }

        const helpText = document.getElementById('initial-help-text');
        if (helpText) helpText.style.display = 'none';

        const bubble = document.createElement('div');
        bubble.className = 'ai-response-bubble';

        let content = '';
        if (title) {
            content += `<h3>${title}</h3>`;
        }
        content += `<p>${text.replace(/\n/g, '<br>')}</p>`; // Basic formatting
        bubble.innerHTML = content;

        // Prepend to show newest first, or append
        suggestionPanel.insertBefore(bubble, suggestionPanel.firstChild);
    }

    // --- Camera and Navigation Functions ---

    // Mock Gemini API Call Function (for development and testing)
    // Note: The original script.js had a mock callGeminiAPI.
    // The one in the problem description was more advanced. I'll assume the one from script.js for now.
    // If this needs to be replaced by the one from the problem description, that's a separate step.
    async function callGeminiAPI(promptText, expectJson = false) {
        console.log(`Mock Gemini API Call with prompt: "${promptText}", Expect JSON: ${expectJson}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

        if (expectJson) {
            // Simulate a typical JSON response for brainstorming ideas
            return JSON.stringify({ ideas: ["LLM Idea 1", "LLM Concept 2", "LLM Thought 3", "Fourth Idea from LLM"] });
        } else {
            // Simulate a definition response
            return `This is a mock definition for the term in the prompt "${promptText.substring(promptText.indexOf(':') + 2, promptText.lastIndexOf('"'))}". It's typically 2-3 lines long and provides a concise explanation. From LLM. Max 150 chars.`;
        }
    }


    // Center on Selection (helper function)
    function centerOnNode(node, duration = 750) {
        if (!node || typeof node.x === 'undefined' || typeof node.y === 'undefined') {
            console.warn("centerOnNode: Node is null or has undefined coordinates.", node);
            return;
        }
        const scale = d3.zoomTransform(svg.node()).k; // Get current scale
        const targetX = width / 2 - node.x * scale;
        const targetY = height / 2 - node.y * scale;

        svg.transition().duration(duration)
            .call(zoom.transform, d3.zoomIdentity.translate(targetX, targetY).scale(scale));
    }

    // Intelligent Framing (Fit to View)
    function fitViewToMindMap(duration = 750) {
        if (nodes.length === 0) {
            svg.transition().duration(duration).call(zoom.transform, d3.zoomIdentity);
            return;
        }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        nodes.forEach(node => {
            // Ensure node.x and node.y are numbers before calculation
            if (typeof node.x !== 'number' || typeof node.y !== 'number') {
                console.warn("fitViewToMindMap: Node with undefined coordinates found.", node);
                return; // Skip this node
            }
            const r = calculateNodeRadius(node.text);
            if (node.x - r < minX) minX = node.x - r;
            if (node.x + r > maxX) maxX = node.x + r;
            if (node.y - r < minY) minY = node.y - r;
            if (node.y + r > maxY) maxY = node.y + r;
        });

        // If min/max are still Infinity, it means all nodes had undefined coords or nodes array was effectively empty.
        if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
             svg.transition().duration(duration).call(zoom.transform, d3.zoomIdentity); // Reset to default
            return;
        }


        if (nodes.length === 1 && isFinite(nodes[0].x) && isFinite(nodes[0].y)) {
            const node = nodes[0];
            const scale = 1.0; // Default scale for a single node
            centerOnNode(node, duration); // Use centerOnNode for a single node
            // Need to adjust its scale explicitly if centerOnNode doesn't do it to a specific scale
            svg.transition().duration(duration)
               .call(zoom.transform, d3.zoomIdentity.translate(width / 2 - node.x * scale, height / 2 - node.y * scale).scale(scale));
            return;
        }

        const mapWidth = maxX - minX;
        const mapHeight = maxY - minY;

        const effectiveMapWidth = mapWidth === 0 ? width / 2 : mapWidth;
        const effectiveMapHeight = mapHeight === 0 ? height / 2 : mapHeight;

        let scale = Math.min(width / effectiveMapWidth, height / effectiveMapHeight) * 0.9;

        const [minZoom, maxZoom] = zoom.scaleExtent();
        scale = Math.max(minZoom, Math.min(scale, maxZoom));

        const midX = minX + mapWidth / 2;
        const midY = minY + mapHeight / 2;

        const targetX = width / 2 - midX * scale;
        const targetY = height / 2 - midY * scale;

        svg.transition().duration(duration)
            .call(zoom.transform, d3.zoomIdentity.translate(targetX, targetY).scale(scale));
    }
});
