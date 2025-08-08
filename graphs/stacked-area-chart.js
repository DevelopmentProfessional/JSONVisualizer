// Stacked Area Chart stub implementation
export const graphDefinition = {
  name: 'Stacked Area Chart',
  description: 'Area chart stacking multiple series over x.',
  requiredInputs: [
    { role: 'x', name: 'X', description: 'X axis (numeric/date)', required: true },
    { role: 'y', name: 'Y', description: 'Y value', required: true },
    { role: 'series', name: 'Series', description: 'Series/category', required: true }
  ],
  optionalInputs: [
    { role: 'color', name: 'Color', description: 'Color variable (default series)' }
  ]
};

export async function render(container, data, mappings, config={}) {
  const width = config.width || 900;
  const height = config.height || 500;
  const sel = d3.select(container);
  sel.selectAll('*').remove();
  sel.append('svg').attr('width', width).attr('height', height)
    .append('text').attr('x', 20).attr('y', 30).attr('fill','#ccc')
    .text('Stacked Area Chart placeholder');
}
