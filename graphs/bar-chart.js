/**
 * Bar Chart Visualization
 * Simple bar chart showing categories and values
 */

export const graphDefinition = {
    name: "Bar Chart",
    type: "bar-chart", 
    description: "Bar chart visualization showing categorical data with numeric values",
    requiredInputs: [
        {
            role: "x",
            name: "X-Axis (Category)",
            description: "Categories for the X-axis",
            required: true
        },
        {
            role: "y",
            name: "Y-Axis (Value)",
            description: "Numeric values for the Y-axis", 
            required: true
        }
    ],
    optionalInputs: [
        {
            role: "label",
            name: "Label",
            description: "Text labels for bars"
        },
        {
            role: "color",
            name: "Color",
            description: "Color value or category for bar styling"
        }
    ]
};

export function render(container, data, mappings, config = {}) {
    console.log('Bar chart render called with:', { data, mappings, config });
    
    // Clear container
    d3.select(container).selectAll('*').remove();
    
    // Default configuration
    const defaultConfig = {
        width: 800,
        height: 600,
        margin: { top: 20, right: 30, bottom: 40, left: 40 },
        barColor: '#69b3a2'
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    
    // Validate required mappings
    if (!mappings.x || !mappings.y) {
        throw new Error('Bar chart requires both "x" and "y" mappings');
    }
    
    try {
        // Transform data for bar chart
        const transformedData = transformDataForBarChart(data, mappings);
        console.log('Transformed data for bar chart:', transformedData);
        
        if (transformedData.length === 0) {
            throw new Error('No valid data found for bar chart');
        }
        
        // Set dimensions
        const width = finalConfig.width - finalConfig.margin.left - finalConfig.margin.right;
        const height = finalConfig.height - finalConfig.margin.top - finalConfig.margin.bottom;
        
        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', finalConfig.width)
            .attr('height', finalConfig.height);
            
        const g = svg.append('g')
            .attr('transform', `translate(${finalConfig.margin.left},${finalConfig.margin.top})`);
        
        // Create scales
        const xScale = d3.scaleBand()
            .range([0, width])
            .domain(transformedData.map(d => d.x))
            .padding(0.1);
        
        const yScale = d3.scaleLinear()
            .range([height, 0])
            .domain([0, d3.max(transformedData, d => d.y)]);
        
        // Create color scale if color mapping provided
        const colorScale = mappings.color ? 
            d3.scaleOrdinal(d3.schemeCategory10) : 
            () => finalConfig.barColor;
        
        // Add X axis
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .style('fill', '#fff')
            .style('font-size', '12px');
        
        // Add Y axis
        g.append('g')
            .call(d3.axisLeft(yScale))
            .selectAll('text')
            .style('fill', '#fff')
            .style('font-size', '12px');
        
        // Add axis lines
        g.selectAll('.domain')
            .style('stroke', '#fff');
        g.selectAll('.tick line')
            .style('stroke', '#fff');
        
        // Add bars
        const bars = g.selectAll('.bar')
            .data(transformedData)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.x))
            .attr('width', xScale.bandwidth())
            .attr('y', d => yScale(d.y))
            .attr('height', d => height - yScale(d.y))
            .attr('fill', d => mappings.color ? colorScale(d.color) : finalConfig.barColor)
            .style('stroke', '#fff')
            .style('stroke-width', '1px');
        
        // Add labels if provided
        if (mappings.label) {
            g.selectAll('.label')
                .data(transformedData)
                .enter().append('text')
                .attr('class', 'label')
                .attr('x', d => xScale(d.x) + xScale.bandwidth() / 2)
                .attr('y', d => yScale(d.y) - 5)
                .attr('text-anchor', 'middle')
                .style('fill', '#fff')
                .style('font-size', '12px')
                .text(d => d.label || d.y);
        }
        
        // Add tooltips
        bars.append('title')
            .text(d => `${d.x}: ${d.y}`);
        
        // Add axis labels
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - finalConfig.margin.left)
            .attr('x', 0 - (height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .style('fill', '#fff')
            .text('Value');
        
        g.append('text')
            .attr('transform', `translate(${width / 2}, ${height + finalConfig.margin.bottom})`)
            .style('text-anchor', 'middle')
            .style('fill', '#fff')
            .text('Category');
            
    } catch (error) {
        console.error('Error rendering bar chart:', error);
        d3.select(container)
            .append('div')
            .style('color', 'red')
            .style('padding', '20px')
            .text(`Error rendering bar chart: ${error.message}`);
    }
}

function transformDataForBarChart(data, mappings) {
    console.log('Transforming data for bar chart with mappings:', mappings);
    
    // Handle array data
    if (Array.isArray(data)) {
        return data.map((item, index) => {
            const x = getValueByPath(item, mappings.x);
            const y = getValueByPath(item, mappings.y);
            const label = mappings.label ? getValueByPath(item, mappings.label) : null;
            const color = mappings.color ? getValueByPath(item, mappings.color) : null;
            
            // Skip items without valid x or y values
            if (x === null || x === undefined || y === null || y === undefined) {
                return null;
            }
            
            return {
                x: String(x),
                y: Number(y) || 0,
                label: label,
                color: color
            };
        }).filter(item => item !== null);
    } else {
        // Handle object data - convert object properties to bar chart data
        return Object.entries(data).map(([key, value]) => {
            let x, y;
            
            if (typeof value === 'object' && value !== null) {
                x = getValueByPath(value, mappings.x) || key;
                y = getValueByPath(value, mappings.y) || 0;
            } else {
                x = key;
                y = Number(value) || 0;
            }
            
            return {
                x: String(x),
                y: Number(y),
                label: mappings.label ? getValueByPath(value, mappings.label) : null,
                color: mappings.color ? getValueByPath(value, mappings.color) : null
            };
        });
    }
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
