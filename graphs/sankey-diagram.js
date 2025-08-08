// Sankey Diagram stub implementation
export const graphDefinition = {
  name: 'Sankey Diagram',
  description: 'Flow diagram emphasizing major transfers between nodes.',
  requiredInputs: [
    { role: 'source', name: 'Source', description: 'Source node id', required: true },
    { role: 'target', name: 'Target', description: 'Target node id', required: true },
    { role: 'value', name: 'Value', description: 'Flow value', required: true }
  ],
  optionalInputs: [
    { role: 'group', name: 'Group', description: 'Node group/category' },
    { role: 'color', name: 'Color', description: 'Color variable' }
  ]
};

export async function render(container, data, mappings, config={}) {
  const width = config.width || 960;
  const height = config.height || 600;
  const sel = d3.select(container);
  sel.selectAll('*').remove();
  sel.append('svg').attr('width', width).attr('height', height)
    .append('text').attr('x', 20).attr('y', 30).attr('fill','#ccc')
    .text('Sankey Diagram placeholder');
}
