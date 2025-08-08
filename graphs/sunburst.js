// Sunburst Chart stub implementation
export const graphDefinition = {
  name: 'Sunburst',
  description: 'Radial hierarchical partition layout.',
  requiredInputs: [
    { role: 'hierarchy', name: 'Hierarchy', description: 'Nested data or parent reference', required: true },
    { role: 'value', name: 'Value', description: 'Node value for sizing', required: true }
  ],
  optionalInputs: [
    { role: 'color', name: 'Color', description: 'Color variable' },
    { role: 'label', name: 'Label', description: 'Label variable' }
  ]
};

export async function render(container, data, mappings, config={}) {
  const width = config.width || 700;
  const height = config.height || 700;
  const sel = d3.select(container);
  sel.selectAll('*').remove();
  sel.append('svg').attr('width', width).attr('height', height)
    .append('text').attr('x', 20).attr('y', 30).attr('fill','#ccc')
    .text('Sunburst placeholder');
}
