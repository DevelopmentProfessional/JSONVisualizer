import graphRegistry from '../graphs/registry.js';

const statusArea = document.getElementById('statusArea');
const graphListEl = document.getElementById('graphList');
const container = document.getElementById('graphContainer');
let currentConfig = null;
let currentGraphType = null;

function showStatus(msg, type='info') {
  const div = document.createElement('div');
  div.className = `alert alert-${type} py-1 px-2 mb-1`; 
  div.style.fontSize = '12px';
  div.textContent = msg;
  statusArea.appendChild(div);
  setTimeout(()=> div.remove(), 6000);
}

async function loadConfig() {
  try {
    const resp = await fetch('../data/GraphControls.json?_=' + Date.now());
    if(!resp.ok) throw new Error('Failed to load GraphControls.json');
    const json = await resp.json();
    currentConfig = normalizeConfig(json);
  if (graphListEl) buildGraphList();
    // Auto render only if graph list element exists (GraphControls context)
    if (graphListEl && !currentGraphType) {
      const first = Object.keys(currentConfig.visualization.graphs || {})[0];
      if (first) renderGraph(first);
    }
  } catch (e) {
    console.error(e);
    showStatus('Failed to load configuration', 'danger');
  }
}

function normalizeConfig(cfg) {
  // Backward compatibility: if single graph stored, wrap it
  if (!cfg.visualization.graphs) {
    cfg.visualization.graphs = {};
    if (cfg.visualization.graphType) {
      cfg.visualization.graphs[cfg.visualization.graphType] = {
        mappings: cfg.visualization.mappings || {}
      };
    }
  }
  return cfg;
}

function buildGraphList() {
  if (!graphListEl) return; // Safeguard if list element not present on this page
  graphListEl.innerHTML = '';
  const graphs = currentConfig.visualization.graphs || {};
  if (Object.keys(graphs).length === 0) {
    graphListEl.innerHTML = '<div class="text-muted small">No graph mappings saved.</div>';
    return;
  }
  Object.entries(graphs).forEach(([type, def]) => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm w-100 mb-1 ' + (type === currentGraphType ? 'btn-primary' : 'btn-outline-primary');
    btn.textContent = type;
    btn.onclick = () => renderGraph(type);
    graphListEl.appendChild(btn);
  });
}

function resolveRowData(data, rowPath) {
  if (!rowPath) return data;
  const parts = rowPath.split('.');
  let ref = data;
  for (const p of parts) {
    if (ref && Object.prototype.hasOwnProperty.call(ref, p)) {
      ref = ref[p];
    } else {
      return [];
    }
  }
  return ref;
}

async function renderGraph(type) {
  if (!currentConfig) return;
  const graphDef = currentConfig.visualization.graphs[type];
  if (!graphDef) {
    showStatus('No mapping for graph ' + type, 'warning');
    return;
  }
  currentGraphType = type;
  buildGraphList();
  showStatus('Rendering ' + type + '...', 'info');
  try {
    // Retrieve source data file
    const apiFile = currentConfig.dataSource?.apiResponse;
    if (!apiFile) throw new Error('apiResponse missing in configuration');
    const resp = await fetch('../data/ApiResponse/' + apiFile);
    if (!resp.ok) throw new Error('Failed to load data source ' + apiFile);
    const rawData = await resp.json();

    // Resolve row set if mapping contains rowPath
    const mappings = graphDef.mappings || {};
    const rowPath = mappings.rowPath || currentConfig.visualization.rowPath;
    let workingData = rawData;
    if (rowPath) {
      // attempt path resolution
      try {
        const parts = rowPath.split('.');
        let ref = rawData;
        for (const p of parts) {
          if (ref == null) break;
          ref = ref[p];
        }
        if (Array.isArray(ref)) workingData = ref;
      } catch {}
    }

  // Pass raw workingData to graph modules. (Earlier pre-transformation for bar-chart
  // caused loss of original field names; bar-chart's own transform expects raw objects.)
  const dataForGraph = workingData;

    await graphRegistry.loadAndRender(type, container, dataForGraph, mappings, { width: window.innerWidth, height: window.innerHeight - 80 });
    showStatus('Rendered ' + type, 'success');
  } catch (e) {
    console.error(e);
    showStatus('Render failed: ' + e.message, 'danger');
  }
}

window.reloadConfig = loadConfig;

// Expose render function globally for category-based UI
window.renderGraphType = (t) => renderGraph(t);

loadConfig();
