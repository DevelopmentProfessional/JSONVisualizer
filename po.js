// po.js - Advanced processor for deeply nested, complex JSON
const fs = require('fs');
const path = require('path');

const INPUT_FILE = 'output.JSON';
const OUTPUT_FILE = 'processed_output.json';

// Load and parse large JSON safely
let data;
try {
  console.log(`Reading ${INPUT_FILE}...`);
  const raw = fs.readFileSync(path.join(__dirname, INPUT_FILE), 'utf8');
  console.log(`File loaded (${Math.round(raw.length / 1024)} KB). Parsing...`);
  data = JSON.parse(raw);
  console.log('JSON parsed successfully.');
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error(`❌ Error: File "${INPUT_FILE}" not found.`);
  } else if (err instanceof SyntaxError) {
    console.error(`❌ Invalid JSON: ${err.message}`);
  } else {
    console.error(`❌ Unexpected error: ${err.message}`);
  }
  process.exit(1);
}

// Result structure
const result = {
  DefaultGroup: { channels: [] }
};

// Stores extracted channels by ID or name
const channelMap = {}; // id/name -> channel object

// Helper: safely get a property with fallbacks
function getProp(obj, ...keys) {
  for (const k of keys) {
    if (obj == null || typeof obj !== 'object') break;
    if (k in obj) return obj[k];
  }
  return undefined;
}

// Helper: extract name from common patterns
function extractName(obj) {
  return getProp(obj, 'name', 'displayName', 'label', 'title') || 'Unnamed';
}

// Helper: check if an object looks like a connector
function isLikelyConnector(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return (
    obj.type?.includes('Connector') ||
    obj.role === 'source' ||
    obj.role === 'destination' ||
    obj.pluginUrn ||
    obj.URN ||
    (obj.properties && (obj.properties.transformers || obj.properties.filters))
  );
}

// Helper: check if object looks like a transformer
function isLikelyTransformer(obj) {
  return obj && typeof obj === 'object' &&
    (obj.transform || obj.map || obj.script || obj.segments || obj.rules);
}

// DFS traversal to find all relevant nodes
function traverse(obj, path = '', callback) {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      traverse(item, `${path}/${index}`, callback);
    });
  } else {
    // Process current object
    callback(obj, path);

    // Recurse into children
    for (const [key, value] of Object.entries(obj)) {
      traverse(value, `${path}/${key}`, callback);
    }
  }
}

// Step 1: Find all channels
console.log('🔍 Searching for channels...');
traverse(data, '', (node, path) => {
  if (path.includes('/channels/') && !path.includes('/connectors')) {
    const match = path.match(/\/channels\/([^\/]+)/);
    if (match) {
      const channelId = match[1];
      const channelName = extractName(node);

      if (!channelMap[channelId]) {
        channelMap[channelId] = {
          id: channelId,
          name: channelName,
          ports: [],
          connectors: []
        };

        // Extract ports if available
        const ports = getProp(node, 'ports');
        if (Array.isArray(ports)) {
          channelMap[channelId].ports = ports.map(p => extractName(p));
        }
      }
    }
  }
});

console.log(`Found ${Object.keys(channelMap).length} channels.`);

// Step 2: Find all connectors and attach to channels
console.log('🔗 Searching for connectors...');
traverse(data, '', (node, path) => {
  if (isLikelyConnector(node)) {
    // Try to infer which channel this belongs to
    let channelId = null;

    // Look for channel reference in path
    const channelMatch = path.match(/\/channels\/([^\/]+)/);
    if (channelMatch) {
      channelId = channelMatch[1];
    }

    // Or look in properties
    if (!channelId) {
      channelId = getProp(node, 'channelId', 'channel', 'ownerChannel');
    }

    if (!channelId || !channelMap[channelId]) return;

    const connName = extractName(node);
    const pluginUrn = getProp(node, 'pluginUrn', 'URN', 'type') || 'unknown';

    // Extract filters
    const filters = [];
    const filtersProp = getProp(node, 'filters', 'filter');
    if (Array.isArray(filtersProp)) {
      filters.push(...filtersProp.map(f => extractName(f)).filter(Boolean));
    } else if (filtersProp && typeof filtersProp === 'object') {
      filters.push(extractName(filtersProp));
    }

    // Extract transformers
    const transformers = [];
    const transformersProp = getProp(node, 'transformers', 'transformer', 'mapping');
    const transList = Array.isArray(transformersProp)
      ? transformersProp
      : (transformersProp ? [transformersProp] : []);

    transList.forEach(t => {
      if (!isLikelyTransformer(t)) return;

      const transformerName = extractName(t);
      const segments = ['MSH-Message_Header']; // Always include MSH

      // Look for any segment-like data
      if (t.segments && Array.isArray(t.segments)) {
        t.segments.forEach(seg => {
          const segName = extractName(seg);
          if (segName && !segments.includes(segName)) {
            segments.push(segName);
          }
        });
      }

      // Also scan for any field that might be a segment
      for (const [k, v] of Object.entries(t)) {
        if (k.toLowerCase().includes('segment') && typeof v === 'string' && !segments.includes(v)) {
          segments.push(v);
        }
      }

      transformers.push({ name: transformerName, segments });
    });

    // Add connector
    channelMap[channelId].connectors.push({
      name: connName,
      pluginUrn,
      filters: filters.filter(Boolean),
      transformers
    });
  }
});

// Step 3: Build final structure
console.log('🏗️ Building output structure...');

// Convert map to array and assign to group
result.DefaultGroup.channels = Object.values(channelMap);

// Optional: group by something smarter later (e.g., tags, metadata)

// Output to console and file
const output = JSON.stringify(result, null, 2);

try {
  fs.writeFileSync(path.join(__dirname, OUTPUT_FILE), output, 'utf8');
  console.log(`✅ Processed data written to ${OUTPUT_FILE}`);
  console.log(`📊 Summary: ${result.DefaultGroup.channels.length} channels processed.`);
} catch (err) {
  console.error('❌ Error writing output:', err.message);
}

// Optional: Print summary
console.log('\n📋 Extracted Channels:');
result.DefaultGroup.channels.forEach(ch => {
  console.log(` - ${ch.name} (${ch.connectors.length} connectors)`);
});