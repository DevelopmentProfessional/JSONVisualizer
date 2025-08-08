// Donut Chart stub implementation
export const graphDefinition = {
  name: 'Donut Chart',
  description: 'Ring-shaped variant of pie chart.',
  requiredInputs: [
    { role: 'value', name: 'Value', description: 'Slice value', required: true }
  ],
  optionalInputs: [
    { role: 'category', name: 'Category', description: 'Slice category label' },
    { role: 'color', name: 'Color', description: 'Color variable' }
  ]
};

export async function render(container, data, mappings, config={}) {
  const width = config.width || 500;
  const height = config.height || 500;
  const sel = d3.select(container);
  sel.selectAll('*').remove();
  sel.append('svg').attr('width', width).attr('height', height)
    .append('text').attr('x', 20).attr('y', 30).attr('fill','#ccc')
    .text('Donut Chart placeholder');
}
