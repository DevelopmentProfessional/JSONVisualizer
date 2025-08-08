// Scatterplot stub implementation
export const graphDefinition = {
  name: 'Scatterplot',
  description: 'Plots points by two quantitative variables.',
  requiredInputs: [
    { role: 'x', name: 'X', description: 'X axis value', required: true },
    { role: 'y', name: 'Y', description: 'Y axis value', required: true }
  ],
  optionalInputs: [
    { role: 'size', name: 'Size', description: 'Point size variable' },
    { role: 'color', name: 'Color', description: 'Color variable' },
    { role: 'series', name: 'Series', description: 'Grouping/series variable' }
  ]
};

export async function render(container, data, mappings, config={}) {
  const width = config.width || 800;
  const height = config.height || 400;
  const sel = d3.select(container);
  sel.selectAll('*').remove();
  sel.append('svg').attr('width', width).attr('height', height)
    .append('text').attr('x', 20).attr('y', 30).attr('fill','#ccc')
    .text('Scatterplot placeholder');
}
