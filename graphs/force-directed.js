/**
 * Force-Directed Graph Visualization
 * Network graph showing relationships between entities
 */

export const graphDefinition = {
    name: "Force-Directed",
    type: "force-directed",
    description: "Network visualization showing relationships and connections between entities",
    requiredInputs: [
        {
            role: "source",
            name: "Source",
            description: "Source node identifier for links",
            required: true
        },
        {
            role: "target", 
            name: "Target",
            description: "Target node identifier for links",
            required: true
        }
    ],
    optionalInputs: [
        {
            role: "value",
            name: "Value/Weight",
            description: "Numeric value representing link strength or weight"
        },
        {
            role: "group",
            name: "Group/Category",
            description: "Category for node grouping and coloring"
        },
        {
            role: "label",
            name: "Label",
            description: "Text label to display for nodes"
        }
    ]
};

export function render(container, data, mappings, config = {}) {
    console.log('Force-directed graph render called with:', { data, mappings, config });
    
    // Clear container
    d3.select(container).selectAll('*').remove();
    
    // Default configuration
    const defaultConfig = {
        width: 800,
        height: 600,
        linkDistance: 30,
        nodeRadius: 5,
        chargeStrength: -300,
        colors: d3.scaleOrdinal(d3.schemeCategory10)
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    
    // Validate required mappings
    if (!mappings.source || !mappings.target) {
        throw new Error('Force-directed graph requires both "source" and "target" mappings');
    }
    
    try {
        // Transform data to nodes and links
        const { nodes, links } = transformDataForForceDirected(data, mappings);
        console.log('Transformed data for force-directed:', { nodes, links });
        
        if (nodes.length === 0) {
            throw new Error('No nodes found in data');
        }
        
        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', finalConfig.width)
            .attr('height', finalConfig.height);
        
        // Create force simulation
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(finalConfig.linkDistance))
            .force('charge', d3.forceManyBody().strength(finalConfig.chargeStrength))
            .force('center', d3.forceCenter(finalConfig.width / 2, finalConfig.height / 2));
        
        // Add links
        const link = svg.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('stroke-width', d => Math.sqrt(d.value || 1))
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6);
        
        // Add nodes
        const node = svg.append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(nodes)
            .enter().append('circle')
            .attr('r', finalConfig.nodeRadius)
            .attr('fill', d => finalConfig.colors(d.group || 0))
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));
        
        // Add labels if available
        if (mappings.label) {
            const labels = svg.append('g')
                .attr('class', 'labels')
                .selectAll('text')
                .data(nodes)
                .enter().append('text')
                .text(d => d.label || d.id)
                .style('fill', '#fff')
                .style('font-size', '10px')
                .style('text-anchor', 'middle');
                
            simulation.on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);
                
                node
                    .attr('cx', d => d.x)
                    .attr('cy', d => d.y);
                    
                labels
                    .attr('x', d => d.x)
                    .attr('y', d => d.y + 15);
            });
        } else {
            simulation.on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);
                
                node
                    .attr('cx', d => d.x)
                    .attr('cy', d => d.y);
            });
        }
        
        // Add tooltips
        node.append('title')
            .text(d => d.label || d.id);
        
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
        
    } catch (error) {
        console.error('Error rendering force-directed graph:', error);
        d3.select(container)
            .append('div')
            .style('color', 'red')
            .style('padding', '20px')
            .text(`Error rendering force-directed graph: ${error.message}`);
    }
}

function transformDataForForceDirected(data, mappings) {
    console.log('Transforming data for force-directed with mappings:', mappings);
    
    const nodes = new Map();
    const links = [];
    
    // Handle array data - assume each item represents a relationship
    if (Array.isArray(data)) {
        data.forEach((item, index) => {
            const source = getValueByPath(item, mappings.source);
            const target = getValueByPath(item, mappings.target);
            const value = mappings.value ? getValueByPath(item, mappings.value) : 1;
            const group = mappings.group ? getValueByPath(item, mappings.group) : 0;
            const label = mappings.label ? getValueByPath(item, mappings.label) : null;
            
            if (source && target) {
                // Add nodes
                if (!nodes.has(source)) {
                    nodes.set(source, { 
                        id: source, 
                        group: group,
                        label: label || source
                    });
                }
                if (!nodes.has(target)) {
                    nodes.set(target, { 
                        id: target, 
                        group: group,
                        label: label || target
                    });
                }
                
                // Add link
                links.push({
                    source: source,
                    target: target,
                    value: value || 1
                });
            }
        });
    } else {
        // Handle object data - try to extract relationships
        console.warn('Force-directed graph works best with array data representing relationships');
        
        // Create a simple network from object structure
        const rootId = 'root';
        nodes.set(rootId, { id: rootId, group: 0, label: 'Root' });
        
        Object.keys(data).forEach(key => {
            const nodeId = key;
            nodes.set(nodeId, { 
                id: nodeId, 
                group: 1, 
                label: key 
            });
            
            links.push({
                source: rootId,
                target: nodeId,
                value: 1
            });
        });
    }
    
    return {
        nodes: Array.from(nodes.values()),
        links: links
    };
}

function getValueByPath(obj, path) {
    if (!path || !obj) return null;
    
    try {
        // Remove leading $. if present
        const cleanPath = path.replace(/^\$\./, '');
        
        // Split path and navigate through object
        const parts = cleanPath.split(/[\.\[\]]+/).filter(part => part !== '');
        let current = obj;
        
        for (const part of parts) {
            if (current === null || current === undefined) return null;
            
            // Handle array indices
            if (!isNaN(part)) {
                const index = parseInt(part);
                if (Array.isArray(current) && index < current.length) {
                    current = current[index];
                } else {
                    return null;
                }
            } else {
                // Handle object properties
                current = current[part];
            }
        }
        
        // If result is array, return first element
        if (Array.isArray(current) && current.length > 0) {
            return typeof current[0] === 'string' || typeof current[0] === 'number' ? current[0] : current;
        }
        
        return current;
    } catch (error) {
        console.error('Error getting value by path:', error);
        return null;
    }
}
