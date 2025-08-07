/**
 * Graph Registry
 * Central registry for all available D3.js graph types
 */

class GraphRegistry {
    constructor() {
        this.graphs = new Map();
        this.loadedModules = new Map();
    }
    
    /**
     * Register a graph type
     */
    register(graphType, definition) {
        this.graphs.set(graphType, definition);
        console.log(`Registered graph type: ${graphType}`);
    }
    
    /**
     * Get all available graph types
     */
    getAvailableGraphs() {
        return Array.from(this.graphs.entries()).map(([type, def]) => ({
            type: type,
            name: def.name,
            description: def.description,
            requiredInputs: def.requiredInputs,
            optionalInputs: def.optionalInputs
        }));
    }
    
    /**
     * Get definition for a specific graph type
     */
    getDefinition(graphType) {
        return this.graphs.get(graphType);
    }
    
    /**
     * Load and render a graph
     */
    async loadAndRender(graphType, container, data, mappings, config = {}) {
        try {
            console.log(`Loading graph: ${graphType}`);
            
            // Check if module is already loaded
            if (!this.loadedModules.has(graphType)) {
                const module = await import(`./graphs/${graphType}.js`);
                this.loadedModules.set(graphType, module);
                
                // Register the graph definition
                if (module.graphDefinition) {
                    this.register(graphType, module.graphDefinition);
                }
            }
            
            const module = this.loadedModules.get(graphType);
            if (!module || !module.render) {
                throw new Error(`Graph module ${graphType} does not have a render function`);
            }
            
            // Render the graph
            await module.render(container, data, mappings, config);
            console.log(`Successfully rendered ${graphType} graph`);
            
        } catch (error) {
            console.error(`Error loading/rendering graph ${graphType}:`, error);
            
            // Show error in container
            d3.select(container).selectAll('*').remove();
            d3.select(container)
                .append('div')
                .style('color', 'red')
                .style('padding', '20px')
                .style('border', '1px solid red')
                .style('border-radius', '4px')
                .style('margin', '20px')
                .html(`
                    <h4>Error Loading Graph: ${graphType}</h4>
                    <p>${error.message}</p>
                    <small>Check console for more details.</small>
                `);
        }
    }
    
    /**
     * Validate mappings for a graph type
     */
    validateMappings(graphType, mappings) {
        const definition = this.getDefinition(graphType);
        if (!definition) {
            return { valid: false, errors: [`Unknown graph type: ${graphType}`] };
        }
        
        const errors = [];
        const warnings = [];
        
        // Check required inputs
        definition.requiredInputs.forEach(input => {
            if (input.required && (!mappings[input.role] || mappings[input.role] === null)) {
                errors.push(`Required input "${input.name}" (${input.role}) is missing`);
            }
        });
        
        // Check for unmapped inputs
        const allValidRoles = [
            ...definition.requiredInputs.map(i => i.role),
            ...(definition.optionalInputs || []).map(i => i.role)
        ];
        
        Object.keys(mappings).forEach(role => {
            if (mappings[role] !== null && !allValidRoles.includes(role)) {
                warnings.push(`Mapping "${role}" is not used by ${graphType} graph`);
            }
        });
        
        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }
    
    /**
     * Get input requirements for a graph type
     */
    getInputRequirements(graphType) {
        const definition = this.getDefinition(graphType);
        if (!definition) return null;
        
        return {
            required: definition.requiredInputs || [],
            optional: definition.optionalInputs || []
        };
    }
}

// Create global instance
window.graphRegistry = new GraphRegistry();

// Auto-register built-in graphs
const builtInGraphs = [
    {
        type: 'tree',
        name: 'Tree',
        description: 'Hierarchical tree visualization',
        requiredInputs: [
            { role: 'label', name: 'Label', description: 'Text to display for each node', required: true }
        ],
        optionalInputs: [
            { role: 'value', name: 'Value', description: 'Numeric or text value for the node' },
            { role: 'parent', name: 'Parent', description: 'Reference to parent node' },
            { role: 'children', name: 'Children', description: 'Array of child nodes' }
        ]
    },
    {
        type: 'force-directed',
        name: 'Force-Directed Network',
        description: 'Network graph showing relationships',
        requiredInputs: [
            { role: 'source', name: 'Source', description: 'Source node identifier', required: true },
            { role: 'target', name: 'Target', description: 'Target node identifier', required: true }
        ],
        optionalInputs: [
            { role: 'value', name: 'Value/Weight', description: 'Link strength or weight' },
            { role: 'group', name: 'Group/Category', description: 'Node grouping' },
            { role: 'label', name: 'Label', description: 'Node labels' }
        ]
    },
    {
        type: 'bar-chart',
        name: 'Bar Chart',
        description: 'Bar chart for categorical data',
        requiredInputs: [
            { role: 'x', name: 'X-Axis (Category)', description: 'Categories for X-axis', required: true },
            { role: 'y', name: 'Y-Axis (Value)', description: 'Numeric values for Y-axis', required: true }
        ],
        optionalInputs: [
            { role: 'label', name: 'Label', description: 'Text labels for bars' },
            { role: 'color', name: 'Color', description: 'Color value or category' }
        ]
    }
];

// Register built-in graphs
builtInGraphs.forEach(graph => {
    window.graphRegistry.register(graph.type, graph);
});

export default window.graphRegistry;
