// Violin Plot stub implementation
export const graphDefinition = {
  name: 'Violin Plot',
  description: 'Distribution density visualization per category.',
  requiredInputs: [
    { role: 'value', name: 'Value', description: 'Numeric value', required: true }
  ],
  optionalInputs: [
    { role: 'category', name: 'Category', description: 'Grouping/category variable' },
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
    .text('Violin Plot placeholder');
}
