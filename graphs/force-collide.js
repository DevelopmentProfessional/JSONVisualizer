export const graphDefinition = { name:'Collide Force', description:'Demonstrates collide force.', requiredInputs:[ {role:'nodes', name:'Nodes', required:true} ], optionalInputs:[ {role:'radius', name:'Radius'} ] };
export async function render(container){ d3.select(container).selectAll('*').remove(); d3.select(container).append('div').style('color','#ccc').text('Collide force placeholder'); }
