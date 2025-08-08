// Radar Chart stub implementation
export const graphDefinition = {
  name: 'Radar Chart',
  description: 'Displays multivariate data across radial axes.',
  requiredInputs: [
    { role: 'variable', name: 'Variable', description: 'Variable name/dimension', required: true },
    { role: 'value', name: 'Value', description: 'Value for variable', required: true }
  ],
  optionalInputs: [
    { role: 'series', name: 'Series', description: 'Grouping/series' },
    { role: 'color', name: 'Color', description: 'Series color variable' }
  ]
};

export async function render(container, data, mappings, config={}) {
  const width = config.width || 600;
  const height = config.height || 600;
  const sel = d3.select(container);
  sel.selectAll('*').remove();
  sel.append('svg').attr('width', width).attr('height', height)
    .append('text').attr('x', 20).attr('y', 30).attr('fill','#ccc')
    .text('Radar Chart placeholder');
}
