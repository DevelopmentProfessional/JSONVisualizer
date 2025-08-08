// Beeswarm Plot stub implementation
export const graphDefinition = {
  name: 'Beeswarm Plot',
  description: 'Distribution of points adjusted to avoid overlap along one axis.',
  requiredInputs: [
    { role: 'value', name: 'Value', description: 'Primary axis (numeric)', required: true }
  ],
  optionalInputs: [
    { role: 'category', name: 'Category', description: 'Grouping/category variable' },
    { role: 'color', name: 'Color', description: 'Color variable' },
    { role: 'size', name: 'Size', description: 'Point size variable' }
  ]
};

export async function render(container, data, mappings, config={}) {
  const width = config.width || 800;
  const height = config.height || 400;
  const sel = d3.select(container);
  sel.selectAll('*').remove();
  sel.append('svg').attr('width', width).attr('height', height)
    .append('text').attr('x', 20).attr('y', 30).attr('fill','#ccc')
    .text('Beeswarm Plot placeholder');
}
