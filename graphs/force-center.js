export const graphDefinition = { name:'Center Force', description:'Demonstrates center force.', requiredInputs:[ {role:'nodes', name:'Nodes', required:true} ], optionalInputs:[] };
export async function render(container){ d3.select(container).selectAll('*').remove(); d3.select(container).append('div').style('color','#ccc').text('Center force placeholder'); }
