/**
 * Tree Graph Visualization
 * Hierarchical tree structure using D3.js
 */

export const graphDefinition = {
    name: "Tree",
    type: "tree",
    description: "Hierarchical tree visualization showing parent-child relationships",
    requiredInputs: [
        {
            role: "label",
            name: "Label",
            description: "Text to display for each node",
            required: true
        },
        {
            role: "value", 
            name: "Value",
            description: "Numeric or text value for the node",
            required: false
        },
        {
            role: "parent",
            name: "Parent",
            description: "Reference to parent node (for nested data)",
            required: false
        },
        {
            role: "children",
            name: "Children",
            description: "Array of child nodes",
            required: false
        }
    ],
    optionalInputs: [
        {
            role: "id",
            name: "Unique ID",
            description: "Unique identifier for each node"
        },
        {
            role: "color",
            name: "Color",
            description: "Color value or category for styling"
        }
    ]
};

export function render(container, data, mappings, config = {}) {
    console.log('Tree graph render called with:', { data, mappings, config });
    
    // Clear container
    d3.select(container).selectAll('*').remove();
    
    // Default configuration
    const defaultConfig = {
        width: 800,
        height: 600,
        margin: { top: 20, right: 90, bottom: 30, left: 90 },
        nodeSize: 10,
        linkColor: '#555',
        nodeColor: '#69b3a2'
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    
    // Validate required mappings
    if (!mappings.label) {
        throw new Error('Tree graph requires a "label" mapping');
    }
    
    try {
        // Transform data based on mappings
        const transformedData = transformDataForTree(data, mappings);
        console.log('Transformed data for tree:', transformedData);
        
        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', finalConfig.width)
            .attr('height', finalConfig.height);
            
        const g = svg.append('g')
            .attr('transform', `translate(${finalConfig.margin.left},${finalConfig.margin.top})`);
        
        // Create tree layout
        const tree = d3.tree()
            .size([finalConfig.height - finalConfig.margin.top - finalConfig.margin.bottom, 
                   finalConfig.width - finalConfig.margin.left - finalConfig.margin.right]);
        
        // Create hierarchy
        const root = d3.hierarchy(transformedData);
        tree(root);
        
        // Add links
        g.selectAll('.link')
            .data(root.descendants().slice(1))
            .enter().append('path')
            .attr('class', 'link')
            .attr('d', d => {
                return `M${d.y},${d.x}
                        C${(d.y + d.parent.y) / 2},${d.x}
                         ${(d.y + d.parent.y) / 2},${d.parent.x}
                         ${d.parent.y},${d.parent.x}`;
            })
            .style('fill', 'none')
            .style('stroke', finalConfig.linkColor)
            .style('stroke-width', '2px');
        
        // Add nodes
        const node = g.selectAll('.node')
            .data(root.descendants())
            .enter().append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.y},${d.x})`);
        
        node.append('circle')
            .attr('r', finalConfig.nodeSize)
            .style('fill', finalConfig.nodeColor)
            .style('stroke', '#fff')
            .style('stroke-width', '2px');
        
        node.append('text')
            .attr('dy', '.35em')
            .attr('x', d => d.children ? -13 : 13)
            .style('text-anchor', d => d.children ? 'end' : 'start')
            .style('fill', '#fff')
            .text(d => d.data.label || d.data.name || 'Unknown');
            
    } catch (error) {
        console.error('Error rendering tree graph:', error);
        d3.select(container)
            .append('div')
            .style('color', 'red')
            .style('padding', '20px')
            .text(`Error rendering tree: ${error.message}`);
    }
}

function transformDataForTree(data, mappings) {
    console.log('Transforming data for tree with mappings:', mappings);
    
    // If data is an array, use first item or transform to hierarchy
    if (Array.isArray(data)) {
        if (data.length === 0) {
            return { label: 'No Data', children: [] };
        }
        
        // Create a root node with array items as children
        return {
            label: 'Root',
            children: data.map((item, index) => ({
                label: getValueByPath(item, mappings.label) || `Item ${index}`,
                value: mappings.value ? getValueByPath(item, mappings.value) : null,
                children: mappings.children ? getValueByPath(item, mappings.children) : []
            }))
        };
    }
    
    // For object data, extract based on mappings
    return {
        label: getValueByPath(data, mappings.label) || 'Root',
        value: mappings.value ? getValueByPath(data, mappings.value) : null,
        children: mappings.children ? getValueByPath(data, mappings.children) || [] : []
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
        
        // If result is array, return first element or the array itself
        if (Array.isArray(current) && current.length > 0) {
            return typeof current[0] === 'string' || typeof current[0] === 'number' ? current[0] : current;
        }
        
        return current;
    } catch (error) {
        console.error('Error getting value by path:', error);
        return null;
    }
}
