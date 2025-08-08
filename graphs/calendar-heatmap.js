// Calendar Heatmap stub implementation
export const graphDefinition = {
  name: 'Calendar Heatmap',
  description: 'Daily values laid out over calendar months.',
  requiredInputs: [
    { role: 'date', name: 'Date', description: 'Date value', required: true },
    { role: 'value', name: 'Value', description: 'Measurement per day', required: true }
  ],
  optionalInputs: [
    { role: 'color', name: 'Color', description: 'Color variable (default is value)' }
  ]
};

export async function render(container, data, mappings, config={}) {
  const width = config.width || 900;
  const height = config.height || 200;
  const sel = d3.select(container);
  sel.selectAll('*').remove();
  sel.append('svg').attr('width', width).attr('height', height)
    .append('text').attr('x', 20).attr('y', 30).attr('fill','#ccc')
    .text('Calendar Heatmap placeholder');
}
