// Global variables for hierarchical graph controls
let currentZoom = 1;
let svgSelection;
let treeData = null;
let nodeSeparation = 100;
let levelSeparation = 150;
let nodeSize = 22;
let treeOrientation = 'vertical';
let graphData = { nodes: [], links: [] };
let hierarchicalControls = {};

// Default values
const DEFAULT_VALUES = {
    nodeSeparation: 100,
    levelSeparation: 150,
    nodeSize: 22,
    treeOrientation: 'vertical',
    zoomValue: 1
};

// Function to save control values to Graphconf.json
async function saveControlValues() {
    try {
        hierarchicalControls = {
            nodeSeparation: nodeSeparation,
            levelSeparation: levelSeparation,
            nodeSize: nodeSize,
            treeOrientation: treeOrientation,
            zoomValue: currentZoom
        };
        
        const response = await fetch('/UpdateGraphConfiguration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hierarchicalControls: hierarchicalControls
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('Hierarchical controls saved successfully');
    } catch (error) {
        console.error('Failed to save hierarchical controls:', error);
    }
}

// Function to load control values from Graphconf.json
async function loadControlValues() {
    try {
        const response = await fetch('/Graphconf.json');
        if (response.ok) {
            const config = await response.json();
            hierarchicalControls = config.hierarchicalControls || DEFAULT_VALUES;
            
            nodeSeparation = hierarchicalControls.nodeSeparation || DEFAULT_VALUES.nodeSeparation;
            levelSeparation = hierarchicalControls.levelSeparation || DEFAULT_VALUES.levelSeparation;
            nodeSize = hierarchicalControls.nodeSize || DEFAULT_VALUES.nodeSize;
            treeOrientation = hierarchicalControls.treeOrientation || DEFAULT_VALUES.treeOrientation;
            currentZoom = hierarchicalControls.zoomValue || DEFAULT_VALUES.zoomValue;
        } else {
            // Use defaults if file doesn't exist
            nodeSeparation = DEFAULT_VALUES.nodeSeparation;
            levelSeparation = DEFAULT_VALUES.levelSeparation;
            nodeSize = DEFAULT_VALUES.nodeSize;
            treeOrientation = DEFAULT_VALUES.treeOrientation;
            currentZoom = DEFAULT_VALUES.zoomValue;
        }
        
        // Update UI elements
        updateControlDisplays();
    } catch (error) {
        console.error('Error loading control values:', error);
        // Use defaults on error
        nodeSeparation = DEFAULT_VALUES.nodeSeparation;
        levelSeparation = DEFAULT_VALUES.levelSeparation;
        nodeSize = DEFAULT_VALUES.nodeSize;
        treeOrientation = DEFAULT_VALUES.treeOrientation;
        currentZoom = DEFAULT_VALUES.zoomValue;
        updateControlDisplays();
    }
}

// Function to update control displays
function updateControlDisplays() {
    // Update sliders and inputs
    const elements = [
        { slider: 'nodeSeparationSlider', input: 'nodeSeparationInput', value: nodeSeparation },
        { slider: 'levelSeparationSlider', input: 'levelSeparationInput', value: levelSeparation },
        { slider: 'nodeSizeSlider', input: 'nodeSizeInput', value: nodeSize }
    ];
    
    elements.forEach(({ slider, input, value }) => {
        const sliderEl = document.getElementById(slider);
        const inputEl = document.getElementById(input);
        if (sliderEl) sliderEl.value = value;
        if (inputEl) inputEl.value = value;
    });
    
    // Update orientation dropdown
    const orientationSelect = document.getElementById('treeOrientation');
    if (orientationSelect) {
        orientationSelect.value = treeOrientation;
    }
    
    // Update zoom display
    const zoomDisplay = document.getElementById('zoomValue');
    if (zoomDisplay) {
        zoomDisplay.value = currentZoom.toFixed(1);
    }
}

function setZoom(zoomLevel) {
    currentZoom = zoomLevel;
    if (svgSelection) {
        svgSelection.call(
            d3.zoom().transform,
            d3.zoomIdentity.scale(zoomLevel)
        );
    }
    // Update zoom display
    const zoomDisplay = document.getElementById('zoomValue');
    if (zoomDisplay) {
        zoomDisplay.value = currentZoom.toFixed(1);
    }
    saveControlValues();
}
window.setZoom = setZoom;

function zoomIn() {
    setZoom(currentZoom * 1.2);
}
window.zoomIn = zoomIn;

function zoomOut() {
    setZoom(currentZoom / 1.2);
}
window.zoomOut = zoomOut;

function centerGraph() {
    if (svgSelection) {
        svgSelection.transition().duration(750)
            .call(
                d3.zoom().transform,
                d3.zoomIdentity
            );
    }
    currentZoom = 1;
    // Update zoom display
    const zoomDisplay = document.getElementById('zoomValue');
    if (zoomDisplay) {
        zoomDisplay.value = currentZoom.toFixed(1);
    }
}
window.centerGraph = centerGraph;

function fitToScreen() {
    if (svgSelection && treeData) {
        const graphElement = document.getElementById('graph');
        const width = graphElement.clientWidth;
        const height = graphElement.clientHeight;
        
        // Calculate bounds of all nodes
        const nodes = d3.selectAll('.node').nodes();
        if (nodes.length > 0) {
            const xExtent = d3.extent(nodes, d => d3.select(d).attr('transform').match(/translate\(([^,]+),/)[1]);
            const yExtent = d3.extent(nodes, d => d3.select(d).attr('transform').match(/translate\([^,]+,([^)]+)\)/)[1]);
            
            const scale = Math.min(
                width / (xExtent[1] - xExtent[0]),
                height / (yExtent[1] - yExtent[0])
            ) * 0.8;
            
            const centerX = (xExtent[0] + xExtent[1]) / 2;
            const centerY = (yExtent[0] + yExtent[1]) / 2;
            
            svgSelection.transition().duration(750)
                .call(
                    d3.zoom().transform,
                    d3.zoomIdentity
                        .translate(width / 2, height / 2)
                        .scale(scale)
                        .translate(-centerX, -centerY)
                );
            currentZoom = scale;
        } else {
            svgSelection.transition().duration(750)
                .call(
                    d3.zoom().transform,
                    d3.zoomIdentity
                );
            currentZoom = 1;
        }
        // Update zoom display
        const zoomDisplay = document.getElementById('zoomValue');
        if (zoomDisplay) {
            zoomDisplay.value = currentZoom.toFixed(1);
        }
    }
}
window.fitToScreen = fitToScreen;

function updateNodeSeparation(val) {
    nodeSeparation = +val;
    document.getElementById('nodeSeparationSlider').value = val;
    document.getElementById('nodeSeparationInput').value = val;
    if (treeData) {
        renderHierarchicalGraph(treeData);
    }
    saveControlValues();
}
window.updateNodeSeparation = updateNodeSeparation;

function updateLevelSeparation(val) {
    levelSeparation = +val;
    document.getElementById('levelSeparationSlider').value = val;
    document.getElementById('levelSeparationInput').value = val;
    if (treeData) {
        renderHierarchicalGraph(treeData);
    }
    saveControlValues();
}
window.updateLevelSeparation = updateLevelSeparation;

function updateNodeSize(val) {
    nodeSize = +val;
    document.getElementById('nodeSizeSlider').value = val;
    document.getElementById('nodeSizeInput').value = val;
    if (treeData) {
        renderHierarchicalGraph(treeData);
    }
    saveControlValues();
}
window.updateNodeSize = updateNodeSize;

function updateTreeOrientation(val) {
    treeOrientation = val;
    if (treeData) {
        renderHierarchicalGraph(treeData);
    }
    saveControlValues();
}
window.updateTreeOrientation = updateTreeOrientation;

// --- Data Loading Functions ---
async function loadDataFromJson() {
    try {
        console.log('Loading data from JSON files...');
        
        // Load DataLoaded.json which contains the hierarchical structure
        const response = await fetch('/load-data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Loaded data from JSON:', data);
        
        if (data.nodes && data.nodes.length > 0) {
            graphData = data;
            treeData = convertToHierarchicalData(data);
            renderHierarchicalGraph(treeData);
            updateParentNodeOptions();
            console.log('Data loaded and rendered successfully');
        } else {
            console.log('No data found in JSON file');
            renderHierarchicalGraph(null);
        }
    } catch (error) {
        console.error('Error loading JSON data:', error);
        alert('Error loading data: ' + error.message);
    }
}
window.loadDataFromJson = loadDataFromJson;

async function refreshData() {
    try {
        console.log('Refreshing data...');
        await loadDataFromJson();
        console.log('Data refreshed successfully');
    } catch (error) {
        console.error('Error refreshing data:', error);
        alert('Error refreshing data: ' + error.message);
    }
}
window.refreshData = refreshData;

// Function to refresh all data by running the complete pipeline
async function refreshAllData() {
    const refreshButton = document.getElementById('refreshButton');
    const refreshText = document.getElementById('refreshText');
    const refreshSpinner = document.getElementById('refreshSpinner');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressStatus = document.getElementById('progressStatus');
    
    try {
        // Disable button and show loading state
        refreshButton.disabled = true;
        refreshText.textContent = 'Processing...';
        refreshSpinner.style.display = 'inline-block';
        progressContainer.style.display = 'block';
        
        // Update progress to show starting
        progressBar.style.width = '10%';
        progressText.textContent = '10%';
        progressStatus.textContent = 'Starting data pipeline...';
        
        console.log('Starting complete data pipeline refresh...');
        
        // Call the server endpoint
        const response = await fetch('/refresh-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Update progress to show completion
        progressBar.style.width = '100%';
        progressText.textContent = '100%';
        progressStatus.textContent = 'Pipeline completed successfully!';
        
        const result = await response.json();
        console.log('Refresh result:', result);
        
        if (result.success) {
            // Reload the data after successful pipeline execution
            await loadDataFromJson();
            
            // Show success message
            setTimeout(() => {
                progressStatus.textContent = `✅ Pipeline completed! ${result.nodeCount} nodes loaded.`;
                progressStatus.style.color = '#28a745';
            }, 1000);
            
            console.log('Data pipeline completed successfully');
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
        
    } catch (error) {
        console.error('Error refreshing all data:', error);
        
        // Show error state
        progressBar.style.width = '100%';
        progressBar.className = 'progress-bar bg-danger';
        progressText.textContent = 'Error';
        progressStatus.textContent = `❌ Error: ${error.message}`;
        progressStatus.style.color = '#dc3545';
        
        alert('Error refreshing data: ' + error.message);
    } finally {
        // Re-enable button and restore state
        setTimeout(() => {
            refreshButton.disabled = false;
            refreshText.textContent = '🔄 Refresh All';
            refreshSpinner.style.display = 'none';
            
            // Hide progress bar after a delay
            setTimeout(() => {
                progressContainer.style.display = 'none';
                progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated';
                progressStatus.style.color = '';
            }, 3000);
        }, 2000);
    }
}
window.refreshAllData = refreshAllData;

// Function to reset JSON data
async function resetJsonData() {
    try {
        const response = await fetch('/reset-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Reset result:', result);
        
        // Clear the graph
        graphData = { nodes: [], links: [] };
        treeData = null;
        renderHierarchicalGraph(null);
        
    } catch (error) {
        console.error('Error resetting data:', error);
    }
}
window.resetJsonData = resetJsonData;

// Convert flat graph data to hierarchical tree structure
function convertToHierarchicalData(data) {
    if (!data.nodes || data.nodes.length === 0) {
        return null;
    }

    // Create hierarchical structure: Groups -> Channels -> Destinations -> Transformers
    const hierarchicalData = {
        id: 'root',
        name: 'Mirth Connect Channels',
        type: 'Root',
        children: []
    };

    // Find all Group nodes
    const groupNodes = data.nodes.filter(node => node.type === 'Group');
    
    groupNodes.forEach(group => {
        const groupNode = {
            id: group.id,
            name: group.name || group.groupName || `Group ${group.id}`,
            type: 'Group',
            groupId: group.groupId,
            children: []
        };

        // Find channels for this group
        if (group.channels && Array.isArray(group.channels)) {
            group.channels.forEach(channel => {
                const channelNode = {
                    id: channel.id || channel.channelId,
                    name: channel.name || channel.channelName || `Channel ${channel.id}`,
                    type: 'Channel',
                    channelId: channel.channelId,
                    enabled: channel.enabled,
                    metadata: channel.metadata,
                    portInfo: channel.portInfo,
                    children: []
                };

                // Add destination connectors to channels
                if (channel.destinationConnectors && Array.isArray(channel.destinationConnectors)) {
                    channel.destinationConnectors.forEach(destination => {
                        const destinationNode = {
                            id: destination.id,
                            name: destination.name || `Destination ${destination.id}`,
                            type: 'Destination',
                            destinationId: destination.id,
                            channelId: destination.channelId,
                            connectorType: destination.connectorType,
                            transportName: destination.transportName,
                            enabled: destination.enabled,
                            properties: destination.properties,
                            children: []
                        };

                        // Add transformers to destinations
                        if (destination.transformers && Array.isArray(destination.transformers)) {
                            destination.transformers.forEach(transformer => {
                                const transformerNode = {
                                    id: transformer.id,
                                    name: transformer.name || `Transformer ${transformer.id}`,
                                    type: 'Transformer',
                                    transformerId: transformer.id,
                                    destinationId: transformer.destinationId,
                                    channelId: transformer.channelId,
                                    enabled: transformer.enabled,
                                    transformerType: transformer.type,
                                    properties: transformer.properties,
                                    description: transformer.description,
                                    version: transformer.version
                                };
                                destinationNode.children.push(transformerNode);
                            });
                        }

                        channelNode.children.push(destinationNode);
                    });
                }

                groupNode.children.push(channelNode);
            });
        }

        hierarchicalData.children.push(groupNode);
    });

    // If no groups found, try to create structure from other node types
    if (hierarchicalData.children.length === 0) {
        const channelNodes = data.nodes.filter(node => node.type === 'Channel');
        if (channelNodes.length > 0) {
            channelNodes.forEach(channel => {
                const channelNode = {
                    id: channel.id,
                    name: channel.name || `Channel ${channel.id}`,
                    type: 'Channel',
                    children: []
                };
                hierarchicalData.children.push(channelNode);
            });
        } else {
            // Fallback to original logic for backward compatibility
            const nodeMap = new Map();
            data.nodes.forEach(node => {
                nodeMap.set(node.id, { ...node, children: [] });
            });

            if (data.links) {
                data.links.forEach(link => {
                    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
                    
                    const sourceNode = nodeMap.get(sourceId);
                    const targetNode = nodeMap.get(targetId);
                    
                    if (sourceNode && targetNode) {
                        sourceNode.children.push(targetNode);
                    }
                });
            }

            const rootNodes = data.nodes.filter(node => {
                if (!data.links) return true;
                const hasIncomingLinks = data.links.some(link => {
                    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
                    return targetId === node.id;
                });
                return !hasIncomingLinks;
            });

            if (rootNodes.length > 0) {
                hierarchicalData.children = rootNodes.map(node => nodeMap.get(node.id));
            }
        }
    }

    return hierarchicalData;
}

// --- Add Node Handler ---
function handleAddNode() {
    const type = document.getElementById('nodeType').value;
    const name = document.getElementById('nodeName').value.trim();
    const parentId = document.getElementById('parentNode').value;
    
    if (!name) {
        alert('Please enter a node name.');
        return;
    }
    
    const id = `${type}-${name}-${Date.now()}`;
    const newNode = { id, name, type };
    
    // Add to graph data
    graphData.nodes.push(newNode);
    
    // Add link if parent is selected
    if (parentId) {
        graphData.links.push({ source: parentId, target: id });
    }
    
    // Rebuild tree data and render
    treeData = convertToHierarchicalData(graphData);
    renderHierarchicalGraph(treeData);
    updateParentNodeOptions();
    
    // Clear the form and close modal
    document.getElementById('nodeName').value = '';
    
    // Close the modal using Bootstrap
    const modal = bootstrap.Modal.getInstance(document.getElementById('addNodeModal'));
    if (modal) {
        modal.hide();
    }
}
window.handleAddNode = handleAddNode;

// Update parent node options in the dropdown
function updateParentNodeOptions() {
    const parentSelect = document.getElementById('parentNode');
    if (!parentSelect) return;
    
    // Clear existing options except the first one
    parentSelect.innerHTML = '<option value="">None (Root)</option>';
    
    // Add all nodes as potential parents
    graphData.nodes.forEach(node => {
        const option = document.createElement('option');
        option.value = node.id;
        option.textContent = `${node.type}: ${node.name}`;
        parentSelect.appendChild(option);
    });
}

// --- D3 Hierarchical Graph Rendering ---
function renderHierarchicalGraph(data) {
    const width = document.getElementById('graph').clientWidth;
    const height = document.getElementById('graph').clientHeight;
    d3.select('#graph').selectAll('*').remove();

    if (!data) {
        // Show empty state
        svgSelection = d3.select('#graph')
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        svgSelection.append('text')
            .attr('x', width / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('font-size', '16px')
            .style('fill', '#666')
            .text('No data to display. Load some data first.');
        return;
    }

    svgSelection = d3.select('#graph')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Add a group for zooming and panning
    const zoomGroup = svgSelection.append('g').attr('class', 'zoom-group');

    // Enable pan/zoom with mouse
    svgSelection.call(
        d3.zoom()
            .scaleExtent([0.1, 10])
            .on('zoom', (event) => {
                zoomGroup.attr('transform', event.transform);
                currentZoom = event.transform.k;
                // Update zoom display
                const zoomDisplay = document.getElementById('zoomValue');
                if (zoomDisplay) {
                    zoomDisplay.value = currentZoom.toFixed(1);
                }
            })
    );

    // Unique color for each node type
    const color = d3.scaleOrdinal()
        .domain(['Group', 'Channel', 'Destination', 'Transformer', 'Custom', 'Root'])
        .range(['#9467bd', '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#8c564b']);

    // Create tree layout based on orientation
    let tree;
    if (treeOrientation === 'radial') {
        tree = d3.tree()
            .size([2 * Math.PI, Math.min(width, height) / 2 - 100])
            .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);
    } else if (treeOrientation === 'horizontal') {
        tree = d3.tree()
            .size([height - 100, width - 100])
            .nodeSize([levelSeparation, nodeSeparation]);
    } else {
        // vertical (default) - center the root node
        tree = d3.tree()
            .size([width - 100, height - 100])
            .nodeSize([nodeSeparation, levelSeparation]);
    }

    // Create hierarchy from data
    const root = d3.hierarchy(data);
    
    // Assign positions
    tree(root);
    
    // Position the root node in center-left for vertical orientation
    if (treeOrientation === 'vertical') {
        // Calculate the center-left position (1/3 from left, center vertically)
        const centerLeftX = width / 3;
        const centerY = height / 2;
        
        // Find the root node and adjust its position
        const rootNode = root.descendants().find(d => !d.parent);
        if (rootNode) {
            // Calculate the offset to position the root in center-left
            const offsetX = centerLeftX - rootNode.x;
            const offsetY = centerY - rootNode.y;
            
            // Apply the offset to all nodes
            root.descendants().forEach(d => {
                d.x += offsetX;
                d.y += offsetY;
            });
        }
    }

    // Draw links
    const link = zoomGroup.append('g')
        .attr('fill', 'none')
        .attr('stroke', '#999')
        .attr('stroke-width', 2)
        .selectAll('path')
        .data(root.links())
        .join('path')
        .attr('d', d => {
            if (treeOrientation === 'radial') {
                return d3.linkRadial()
                    .angle(d => d.x)
                    .radius(d => d.y)(d);
            } else {
                return d3.linkHorizontal()
                    .x(d => treeOrientation === 'horizontal' ? d.y : d.x)
                    .y(d => treeOrientation === 'horizontal' ? d.x : d.y)(d);
            }
        });

    // Draw nodes
    const node = zoomGroup.append('g')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .selectAll('circle')
        .data(root.descendants())
        .join('circle')
        .attr('r', nodeSize / 2)
        .attr('fill', d => color(d.data.type))
        .attr('transform', d => {
            if (treeOrientation === 'radial') {
                return `rotate(${(d.x * 180 / Math.PI - 90)}) translate(${d.y},0)`;
            } else {
                return `translate(${treeOrientation === 'horizontal' ? d.y : d.x},${treeOrientation === 'horizontal' ? d.x : d.y})`;
            }
        });

    // Add text labels
    const textGroup = zoomGroup.append('g')
        .selectAll('g')
        .data(root.descendants())
        .join('g')
        .attr('class', 'node')
        .attr('transform', d => {
            if (treeOrientation === 'radial') {
                return `rotate(${(d.x * 180 / Math.PI - 90)}) translate(${d.y},0)`;
            } else {
                return `translate(${treeOrientation === 'horizontal' ? d.y : d.x},${treeOrientation === 'horizontal' ? d.x : d.y})`;
            }
        });

    // Add background rectangle for text
    textGroup.append('rect')
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('fill', d => color(d.data.type))
        .attr('stroke', d => color(d.data.type))
        .attr('stroke-width', 1)
        .attr('pointer-events', 'none');

    // Add text with enhanced information
    textGroup.append('text')
        .text(d => {
            let displayText = d.data.name;
            
            // Add status indicators
            if (d.data.enabled !== undefined) {
                displayText += ` [${d.data.enabled ? '✓' : '✗'}]`;
            }
            
            // Add metadata count for channels
            if (d.data.type === 'Channel' && d.data.metadata) {
                const metadataCount = Object.keys(d.data.metadata).length;
                if (metadataCount > 0) {
                    displayText += ` (${metadataCount} metadata)`;
                }
            }
            
            // Add port info for channels
            if (d.data.type === 'Channel' && d.data.portInfo) {
                displayText += ` (Port: ${d.data.portInfo.port || 'N/A'})`;
            }
            
            // Add connector type for destinations
            if (d.data.type === 'Destination' && d.data.connectorType) {
                displayText += ` (${d.data.connectorType})`;
            }
            
            // Add transformer type for transformers
            if (d.data.type === 'Transformer' && d.data.transformerType) {
                displayText += ` (${d.data.transformerType})`;
            }
            
            return displayText;
        })
        .attr('text-anchor', d => {
            if (treeOrientation === 'radial') {
                return d.x < Math.PI ? 'start' : 'end';
            } else if (treeOrientation === 'horizontal') {
                return 'start';
            } else {
                return 'middle';
            }
        })
        .attr('dominant-baseline', 'middle')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('fill', 'white')
        .style('pointer-events', 'auto')
        .style('cursor', 'pointer')
        .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
        .each(function(d) {
            const textElement = d3.select(this);
            const rectElement = d3.select(this.parentNode).select('rect');
            
            // Position text and calculate background
            if (treeOrientation === 'radial') {
                textElement.attr('transform', d.x >= Math.PI ? 'rotate(180)' : null);
            } else if (treeOrientation === 'horizontal') {
                textElement.attr('x', 8);
            }
            
            // Calculate background rectangle
            if (textElement.node() && textElement.node().getBBox) {
                try {
                    const textNode = textElement.node();
                    const bbox = textNode.getBBox();
                    const padding = 6;
                    
                    if (treeOrientation === 'radial') {
                        rectElement
                            .attr('x', bbox.x - padding)
                            .attr('y', bbox.y - padding)
                            .attr('width', bbox.width + padding * 2)
                            .attr('height', bbox.height + padding * 2);
                    } else if (treeOrientation === 'horizontal') {
                        rectElement
                            .attr('x', 4)
                            .attr('y', bbox.y - padding)
                            .attr('width', bbox.width + padding * 2)
                            .attr('height', bbox.height + padding * 2);
                    } else {
                        rectElement
                            .attr('x', bbox.x - padding)
                            .attr('y', bbox.y - padding)
                            .attr('width', bbox.width + padding * 2)
                            .attr('height', bbox.height + padding * 2);
                    }
                } catch (error) {
                    console.warn('getBBox failed, using default text background size');
                    const defaultWidth = 100;
                    const defaultHeight = 20;
                    rectElement
                        .attr('x', -defaultWidth / 2)
                        .attr('y', -defaultHeight / 2)
                        .attr('width', defaultWidth)
                        .attr('height', defaultHeight);
                }
            } else {
                const defaultWidth = 100;
                const defaultHeight = 20;
                rectElement
                    .attr('x', -defaultWidth / 2)
                    .attr('y', -defaultHeight / 2)
                    .attr('width', defaultWidth)
                    .attr('height', defaultHeight);
            }
        });

    // Apply current zoom
    setZoom(currentZoom);
}

// --- Initialize ---
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing Hierarchical Graph...');
    
    // Load control values from Graphconf.json
    await loadControlValues();
    
    // Automatically load existing JSON data on page load
    loadDataFromJson();
    
    console.log('Hierarchical Graph initialized');
});