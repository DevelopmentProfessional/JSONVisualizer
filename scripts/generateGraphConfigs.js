#!/usr/bin/env node
/*
 * Script: generateGraphConfigs.js
 * Scans /graphs directory, imports each module, extracts graphDefinition if present,
 * and writes a consolidated configs file to data/GraphModuleConfigs.json
 * (role list unified for convenience).
 */
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const graphsDir = path.join(__dirname, '..', 'graphs');
const outFile = path.join(__dirname, '..', 'data', 'GraphModuleConfigs.json');

async function main(){
  const files = fs.readdirSync(graphsDir).filter(f => f.endsWith('.js'));
  const configs = [];
  for (const f of files){
    const full = path.join(graphsDir, f);
    try {
      const mod = await import(full + '?cacheBust=' + Date.now());
      if (mod.graphDefinition){
        const gd = mod.graphDefinition;
        configs.push({
          type: gd.type || path.basename(f, '.js'),
            name: gd.name || gd.type || f,
            description: gd.description || '',
            requiredInputs: (gd.requiredInputs||[]).map(i => ({role:i.role,name:i.name,description:i.description||'',required:!!i.required})),
            optionalInputs: (gd.optionalInputs||[]).map(i => ({role:i.role,name:i.name,description:i.description||''}))
        });
      }
    } catch(e){
      console.warn('Skip graph (import failed):', f, e.message);
    }
  }
  configs.sort((a,b)=>a.type.localeCompare(b.type));
  fs.writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), graphs: configs }, null, 2));
  console.log('Wrote', outFile, 'with', configs.length, 'graph configs');
}
main();
