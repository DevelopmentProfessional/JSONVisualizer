// Hexbin Chart stub implementation
export const graphDefinition = {
  name: 'Hexbin',
  description: 'Aggregates points into hexagonal bins.',
  requiredInputs: [
    { role: 'x', name: 'X', description: 'X coordinate', required: true },
    { role: 'y', name: 'Y', description: 'Y coordinate', required: true }
  ],
  optionalInputs: [
    { role: 'value', name: 'Value', description: 'Value to aggregate (default count)' },
    { role: 'color', name: 'Color', description: 'Color variable' }
  ]
};

export async function render(container, data, mappings, config={}) {
  const width = config.width || 800;
  const height = config.height || 500;
  const sel = d3.select(container);
  sel.selectAll('*').remove();
  sel.append('svg').attr('width', width).attr('height', height)
    .append('text').attr('x', 20).attr('y', 30).attr('fill','#ccc')
    .text('Hexbin placeholder');
}
