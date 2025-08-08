// Area Chart stub implementation
export const graphDefinition = {
  name: 'Area Chart',
  description: 'Area chart showing cumulative magnitude over x.',
  requiredInputs: [
    { role: 'x', name: 'X', description: 'X axis (numeric/date)', required: true },
    { role: 'y', name: 'Y', description: 'Y value', required: true }
  ],
  optionalInputs: [
    { role: 'series', name: 'Series', description: 'Series/category grouping' },
    { role: 'color', name: 'Color', description: 'Color variable' }
  ]
};

export async function render(container, data, mappings, config={}) {
  const width = config.width || 800;
  const height = config.height || 400;
  const sel = d3.select(container);
  sel.selectAll('*').remove();
  sel.append('svg').attr('width', width).attr('height', height)
    .append('text').attr('x', 20).attr('y', 30).attr('fill','#ccc')
    .text('Area Chart placeholder');
}
