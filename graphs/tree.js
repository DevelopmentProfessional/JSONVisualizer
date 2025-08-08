/**
 * Tree Graph Visualization
 * Hierarchical tree structure using D3.js
 */

export const graphDefinition = {
    name: 'Tree',
    type: 'tree',
    description: 'Hierarchical tree visualization; can derive hierarchy from nested children, parent references, or source/target edges.',
    requiredInputs: [
        { role: 'label', name: 'Label', description: 'Node text / identifier', required: true }
    ],
    optionalInputs: [
        { role: 'value', name: 'Value', description: 'Numeric or text value for node' },
        { role: 'parent', name: 'Parent', description: 'Parent node reference (flat list -> tree)' },
        { role: 'children', name: 'Children', description: 'Children array path (nested objects)' },
        { role: 'source', name: 'Source', description: 'Edge list source (to build tree if no children)' },
        { role: 'target', name: 'Target', description: 'Edge list target (to build tree if no children)' },
        { role: 'id', name: 'Unique ID', description: 'Explicit node id (fallback to label)' },
        { role: 'color', name: 'Color', description: 'Color category' }
    ]
};

export function render(container, data, mappings, config = {}) {
    d3.select(container).selectAll('*').remove();
    if (!mappings.label) throw new Error('Tree graph requires a "label" mapping');
    const defaultConfig = { width:800, height:600, margin:{top:20,right:90,bottom:30,left:90}, nodeSize:8, linkColor:'#555', nodeColor:'#69b3a2' };
    const finalConfig = { ...defaultConfig, ...config };
    try {
        const transformed = buildHierarchy(data, mappings);
        const svg = d3.select(container).append('svg').attr('width', finalConfig.width).attr('height', finalConfig.height);
        const g = svg.append('g').attr('transform', `translate(${finalConfig.margin.left},${finalConfig.margin.top})`);
        const layout = d3.tree().size([
            finalConfig.height - finalConfig.margin.top - finalConfig.margin.bottom,
            finalConfig.width - finalConfig.margin.left - finalConfig.margin.right
        ]);
        const root = d3.hierarchy(transformed);
        layout(root);
        g.selectAll('.link')
            .data(root.descendants().slice(1))
            .enter().append('path')
            .attr('class','link')
            .attr('d', d => `M${d.y},${d.x}C${(d.y+d.parent.y)/2},${d.x} ${(d.y+d.parent.y)/2},${d.parent.x} ${d.parent.y},${d.parent.x}`)
            .style('fill','none')
            .style('stroke', finalConfig.linkColor)
            .style('stroke-width','1.4px');
        const node = g.selectAll('.node').data(root.descendants()).enter().append('g').attr('class','node').attr('transform', d=>`translate(${d.y},${d.x})`);
        node.append('circle').attr('r', finalConfig.nodeSize).attr('fill', finalConfig.nodeColor).attr('stroke','#fff').attr('stroke-width',1.2);
        node.append('text')
            .attr('dy','.32em')
            .attr('x', d => d.children ? -10 : 10)
            .attr('text-anchor', d => d.children ? 'end':'start')
            .style('fill','#fff')
            .style('font-size','11px')
            .text(d => d.data.label);
    } catch(e){
        d3.select(container).append('div').style('color','red').style('padding','8px').text('Tree render error: '+ e.message);
    }
}

// --- Hierarchy builders ---
function buildHierarchy(raw, mappings){
    if (mappings.children){
        if (Array.isArray(raw)) return { label:'Root', children: raw.map(r => materializeNode(r, mappings)) };
        return materializeNode(raw, mappings);
    }
    if (mappings.parent && Array.isArray(raw)) return buildFromParentList(raw, mappings);
    if (mappings.source && mappings.target && Array.isArray(raw)) return buildFromEdgeList(raw, mappings);
    if (Array.isArray(raw)) return { label:'Root', children: raw.map((r,i)=>({ label: getValueByPath(r,mappings.label)||'Item '+i, value: mappings.value?getValueByPath(r,mappings.value):null, children:[] })) };
    return { label: getValueByPath(raw, mappings.label) || 'Root', children: [] };
}

function materializeNode(obj, mappings){
    const node = { label: getValueByPath(obj, mappings.label) || 'Node', value: mappings.value?getValueByPath(obj,mappings.value):null };
    if (mappings.children){
        const kids = getValueByPath(obj, mappings.children) || [];
        if (Array.isArray(kids)) node.children = kids.map(k => materializeNode(k, mappings));
    }
    return node;
}

function buildFromParentList(rows, mappings){
    const byId = new Map();
    const childrenMap = new Map();
    rows.forEach(r => {
        const label = getValueByPath(r, mappings.label);
        const parent = getValueByPath(r, mappings.parent);
        if (!label) return;
        const node = byId.get(label) || { label, children: [] };
        node.value = mappings.value? getValueByPath(r,mappings.value):null;
        byId.set(label, node);
        if (parent){
            if(!childrenMap.has(parent)) childrenMap.set(parent, []);
            childrenMap.get(parent).push(label);
        }
    });
    childrenMap.forEach((kids, p) => {
        const parentNode = byId.get(p) || { label: p, children: [] };
        parentNode.children = kids.map(k => byId.get(k)).filter(Boolean);
        byId.set(p, parentNode);
    });
    const allChildren = new Set([].concat(...[...childrenMap.values()]));
    const roots = [...byId.values()].filter(n => !allChildren.has(n.label));
    return roots.length === 1 ? roots[0] : { label: 'Root', children: roots };
}

function buildFromEdgeList(rows, mappings){
    const nodes = new Map();
    const parents = new Map();
    rows.forEach(r => {
        const s = getValueByPath(r, mappings.source);
        const t = getValueByPath(r, mappings.target);
        if (s == null || t == null) return;
        if (!nodes.has(s)) nodes.set(s,{ label:s, children:[] });
        if (!nodes.has(t)) nodes.set(t,{ label:t, children:[] });
        nodes.get(s).children.push(nodes.get(t));
        parents.set(t, s);
    });
    const roots = [...nodes.values()].filter(n => !parents.has(n.label));
    return roots.length === 1 ? roots[0] : { label:'Root', children: roots };
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
