// Force Simulations overview stub
export const graphDefinition = {
  name: 'Force Simulations',
  description: 'Generic force simulation scaffold.',
  requiredInputs: [ { role: 'nodes', name: 'Nodes', required: true } ],
  optionalInputs: [ { role: 'links', name: 'Links' } ]
};
export async function render(container,data,mappings,config={}) {
  d3.select(container).selectAll('*').remove();
  d3.select(container).append('div').style('color','#ccc').style('padding','10px').text('Force simulations placeholder');
}
