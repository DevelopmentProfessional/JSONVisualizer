export const graphDefinition = { name:'Many-Body Force', description:'Demonstrates charge force.', requiredInputs:[ {role:'nodes', name:'Nodes', required:true} ], optionalInputs:[ {role:'charge', name:'Charge'} ] };
export async function render(container){ d3.select(container).selectAll('*').remove(); d3.select(container).append('div').style('color','#ccc').text('Many-body force placeholder'); }
