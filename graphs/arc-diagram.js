// Arc Diagram stub implementation
export const graphDefinition = {
  name: 'Arc Diagram',
  description: 'Linear arrangement of nodes with arcs for links.',
  requiredInputs: [
    { role: 'source', name: 'Source', description: 'Link source id', required: true },
    { role: 'target', name: 'Target', description: 'Link target id', required: true }
  ],
  optionalInputs: [
    { role: 'value', name: 'Value', description: 'Link value/weight' },
    { role: 'group', name: 'Group', description: 'Node group/category' },
    { role: 'color', name: 'Color', description: 'Color variable' }
  ]
};

export async function render(container, data, mappings, config={}) {
  const width = config.width || 900;
  const height = config.height || 500;
  const sel = d3.select(container);
  sel.selectAll('*').remove();
  sel.append('svg').attr('width', width).attr('height', height)
    .append('text').attr('x', 20).attr('y', 30).attr('fill','#ccc')
    .text('Arc Diagram placeholder');
}
