// Timeline stub implementation
export const graphDefinition = {
  name: 'Timeline',
  description: 'Events positioned along a temporal axis.',
  requiredInputs: [
    { role: 'date', name: 'Date', description: 'Event date/time', required: true }
  ],
  optionalInputs: [
    { role: 'label', name: 'Label', description: 'Event label' },
    { role: 'end', name: 'End', description: 'End date/time for ranged events' },
    { role: 'color', name: 'Color', description: 'Color variable' }
  ]
};

export async function render(container, data, mappings, config={}) {
  const width = config.width || 900;
  const height = config.height || 300;
  const sel = d3.select(container);
  sel.selectAll('*').remove();
  sel.append('svg').attr('width', width).attr('height', height)
    .append('text').attr('x', 20).attr('y', 30).attr('fill','#ccc')
    .text('Timeline placeholder');
}
