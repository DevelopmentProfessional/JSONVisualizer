const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8081;

app.use(express.json({ limit: '400mb' }));
app.use(express.static(__dirname)); // Serve static files (HTML, JS, etc.)

//const fs = require('fs');
//const path = require('path');
const axios = require('axios');
const https = require('https');
const xml2js = require('xml2js');


// Run API Sequence endpoint
app.post('/runApiSequence', async (req, res) => {
    // Accept an array of API calls for sequence processing
    const apiSequence = Array.isArray(req.body) ? req.body : [req.body];
    if (!apiSequence.length) {
        return res.status(400).json({ status: 'error', error: 'No API calls provided' });
    }

    // Load variables from data/variables.json (case-insensitive)
    let variables = {};
    try {
        const varsRaw = fs.readFileSync(path.join(__dirname, 'data', 'variables.json'), 'utf8');
        const varsObj = JSON.parse(varsRaw);
        if (Array.isArray(varsObj.variables)) {
            varsObj.variables.forEach(v => {
                variables[v.name.toLowerCase()] = v.value;
            });
        }
    } catch (e) {}

    // Helper to interpolate {{var}} in string (case-insensitive)
    const interpolate = (str) => {
        if (typeof str !== 'string') return str;
        return str.replace(/{{(\w+)}}/gi, (match, p1) => {
            const key = p1.toLowerCase();
            return variables[key] !== undefined ? variables[key] : match;
        });
    };

    // Helper to extract used variables from strings
    const extractUsedVariables = (url, body) => {
        const usedVars = {};
        const extractFromString = (str) => {
            if (typeof str !== 'string') return;
            const matches = str.match(/{{(\w+)}}/gi);
            if (matches) {
                matches.forEach(match => {
                    const varName = match.replace(/[{}]/g, '').toLowerCase();
                    if (variables[varName] !== undefined) {
                        usedVars[varName] = variables[varName];
                    }
                });
            }
        };
        
        extractFromString(url);
        extractFromString(body);
        return usedVars;
    };

    let sessionCookie = null;
    let loginResult = null;
    let results = [];

    // 1. Find and process login API first (if present)
    const loginIdx = apiSequence.findIndex(api => api.isLogin);
    if (loginIdx !== -1) {
        const loginApi = apiSequence[loginIdx];
        const url = interpolate(loginApi.url);
        const body = interpolate(loginApi.body);
        const usedVariables = extractUsedVariables(loginApi.url, loginApi.body);
        let headers = { ...loginApi.headers };
        try {
            const loginRes = await axios.post(url, body, { httpsAgent, headers, withCredentials: true });
            sessionCookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0] || null;
            
            // Check if login response is XML and convert to JSON automatically
            let loginResponseData = loginRes.data;
            const responseContentType = (loginRes.headers['content-type'] || '').toLowerCase();
            if ((responseContentType.includes('text/xml') || responseContentType.includes('application/xml')) && 
                typeof loginResponseData === 'string' && loginResponseData.trim().startsWith('<')) {
                try {
                    loginResponseData = await parseXmlToJson(loginResponseData);
                    console.log('Automatically converted XML login response to JSON for:', url);
                } catch (xmlErr) {
                    console.warn('Failed to convert login XML to JSON, keeping original data:', xmlErr.message);
                    // Keep original data if conversion fails
                }
            }
            
            loginResult = {
                status: 'success',
                cookie: sessionCookie,
                request: {
                    method: loginApi.method,
                    originalUrl: loginApi.url,
                    interpolatedUrl: url,
                    headers,
                    body
                },
                variables: usedVariables,
                response: {
                    status: loginRes.status,
                    statusText: loginRes.statusText,
                    headers: loginRes.headers,
                    data: loginResponseData
                }
            };
        } catch (err) {
            loginResult = {
                status: 'error',
                error: err.message,
                errorDetails: {
                    message: err.message,
                    code: err.code,
                    status: err.response?.status,
                    statusText: err.response?.statusText,
                    responseData: err.response?.data || null
                },
                request: {
                    method: loginApi.method,
                    originalUrl: loginApi.url,
                    interpolatedUrl: url,
                    headers,
                    body
                },
                variables: usedVariables,
                response: err.response ? {
                    status: err.response.status,
                    statusText: err.response.statusText,
                    headers: err.response.headers,
                    data: err.response.data
                } : null
            };
        }
        results.push(loginResult);
    }

    // 2. Process remaining APIs in order, using sessionCookie if available
    for (let i = 0; i < apiSequence.length; i++) {
        if (i === loginIdx) continue; // Skip login API, already processed
        const api = apiSequence[i];
        const url = interpolate(api.url);
        const body = interpolate(api.body);
        const usedVariables = extractUsedVariables(api.url, api.body);
        let headers = { ...api.headers };
        if (sessionCookie) {
            headers['Cookie'] = sessionCookie;
        }
        const requestInfo = {
            method: api.method,
            originalUrl: api.url,
            interpolatedUrl: url,
            headers,
            body
        };
        try {
            let result;
            switch ((api.method || '').toUpperCase()) {
                case 'POST':
                    result = await axios.post(url, body, { httpsAgent, headers });
                    break;
                case 'GET':
                    result = await axios.get(url, { httpsAgent, headers });
                    break;
                default:
                    result = await axios({ method: api.method, url, data: body, httpsAgent, headers });
            }
            
            // Check if response is XML and convert to JSON automatically
            let responseData = result.data;
            const responseContentType = (result.headers['content-type'] || '').toLowerCase();
            if ((responseContentType.includes('text/xml') || responseContentType.includes('application/xml')) && 
                typeof responseData === 'string' && responseData.trim().startsWith('<')) {
                try {
                    responseData = await parseXmlToJson(responseData);
                    console.log('Automatically converted XML response to JSON for:', url);
                } catch (xmlErr) {
                    console.warn('Failed to convert XML to JSON, keeping original data:', xmlErr.message);
                    // Keep original data if conversion fails
                }
            }
            
            results.push({
                status: 'success',
                request: requestInfo,
                variables: usedVariables,
                response: {
                    status: result.status,
                    statusText: result.statusText,
                    headers: result.headers,
                    data: responseData
                }
            });
        } catch (err) {
            results.push({
                status: 'error',
                error: err.message,
                errorDetails: {
                    message: err.message,
                    code: err.code,
                    status: err.response?.status,
                    statusText: err.response?.statusText,
                    responseData: err.response?.data || null
                },
                request: requestInfo,
                variables: usedVariables,
                response: err.response ? {
                    status: err.response.status,
                    statusText: err.response.statusText,
                    headers: err.response.headers,
                    data: err.response.data
                } : null
            });
        }
    }

    // 3. Save each API result to its individual file in ApiResponse directory
    let resultIndex = 0;
    for (let i = 0; i < apiSequence.length; i++) {
        const api = apiSequence[i];
        const result = results[resultIndex];
        
        if (result) {
            // Get output filename from API configuration
            const outputFileName = api.outputFileName || `api-${Date.now()}-${i}`;
            const filePath = path.join(__dirname, 'data', 'ApiResponse', `${outputFileName}.json`);
            
            try {
                // Save the complete result to the individual file
                fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
                console.log(`API response saved to: ${filePath}`);
            } catch (err) {
                console.error(`Failed to save API response to ${filePath}:`, err);
            }
        }
        
        resultIndex++;
    }

    // Return all results in order
    res.json({ results });
});

// HTTPS agent for insecure requests (e.g. self-signed certs)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Handler for POST requests
async function handlePostRequest(url, body, api, requestInfo, variables, usedVariables) {
    let cookie = null;
    let responseData = null;
    let headers = { ...api.headers };
    if (api.cookie) {
        headers['Cookie'] = api.cookie;
    }
    requestInfo.headers = headers;

    if (url.includes('/_login')) {
        const loginRes = await axios.post(url, body, { httpsAgent, headers, withCredentials: true });
        cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0] || null;
        responseData = loginRes.data;
        return {
            status: 'success',
            cookie,
            request: requestInfo,
            variables: usedVariables,
            response: {
                status: loginRes.status,
                statusText: loginRes.statusText,
                headers: loginRes.headers,
                data: responseData
            }
        };
    } else {
        const postRes = await axios.post(url, body, { httpsAgent, headers });
        responseData = postRes.data;
        return {
            status: 'success',
            request: requestInfo,
            variables: usedVariables,
            response: {
                status: postRes.status,
                statusText: postRes.statusText,
                headers: postRes.headers,
                data: responseData
            }
        };
    }
}

// Handler for GET requests
async function handleGetRequest(url, body, api, requestInfo, variables, usedVariables) {
    let headers = { ...api.headers };
    if (api.cookie) {
        headers['Cookie'] = api.cookie;
    }
    requestInfo.headers = headers;

    const options = {
        method: 'GET',
        url,
        headers,
        httpsAgent
    };
    if (body && body !== '') {
        options.data = body; // Note: GET with body is rare, but allowed
    }

    const getRes = await axios(options);
    const responseData = getRes.data;
    return {
        status: 'success',
        request: requestInfo,
        variables: usedVariables,
        response: {
            status: getRes.status,
            statusText: getRes.statusText,
            headers: getRes.headers,
            data: responseData
        }
    };
}

// Handler for other methods (PUT, PATCH, DELETE, etc.)
async function handleGenericRequest(url, body, api, requestInfo, variables, usedVariables) {
    let headers = { ...api.headers };
    if (api.cookie) {
        headers['Cookie'] = api.cookie;
    }
    requestInfo.headers = headers;

    const options = {
        method: api.method,
        url,
        headers,
        httpsAgent
    };
    if (body && body !== '') {
        options.data = body;
    }

    const res = await axios(options);
    const responseData = res.data;
    return {
        status: 'success',
        request: requestInfo,
        variables: usedVariables,
        response: {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
            data: responseData
        }
    };
}
 
// app.post('/runApiSequence', async (req, res) => {
//     const api = req.body;
//     if (!api || !api.url || !api.method) {
//         return res.status(400).json({
//             status: 'error',
//             error: 'Missing url or method',
//             request: null,
//             variables: {},
//             response: null
//         });
//     }

//     // Load variables from variables.json (case-insensitive)
//     let variables = {};
//     try {
//         const varsRaw = fs.readFileSync(path.join(__dirname, 'variables.json'), 'utf8');
//         const varsObj = JSON.parse(varsRaw);
//         if (Array.isArray(varsObj.variables)) {
//             varsObj.variables.forEach(v => {
//                 variables[v.name.toLowerCase()] = v.value;
//             });
//         }
//     } catch (e) {
//         // If variables.json missing or invalid, continue with empty variables
//         console.warn('Could not load variables.json:', e.message);
//     }

//     // Helper to interpolate {{var}} in string (case-insensitive)
//     function interpolate(str) {
//         if (typeof str !== 'string') return str;
//         return str.replace(/{{(\w+)}}/gi, (match, p1) => {
//             const key = p1.toLowerCase();
//             return variables[key] !== undefined ? variables[key] : match;
//         });
//     }

//     // Interpolate URL and body
//     const interpolatedUrl = interpolate(api.url);
//     const interpolatedBody = interpolate(api.body);

//     // Prepare detailed request info for response
//     const requestInfo = {
//         method: api.method,
//         originalUrl: api.url,
//         interpolatedUrl: interpolatedUrl,
//         headers: api.headers || {},
//         body: interpolatedBody || null
//     };

//     // Log for debugging
//     console.log('API Call:', requestInfo);

//     try {
//         let result;
//         const method = api.method.toUpperCase();

//         switch (method) {
//             case 'POST':
//                 result = await handlePostRequest(interpolatedUrl, interpolatedBody, api, requestInfo, variables);
//                 break;
//             case 'GET':
//                 result = await handleGetRequest(interpolatedUrl, interpolatedBody, api, requestInfo, variables);
//                 break;
//             default:
//                 result = await handleGenericRequest(interpolatedUrl, interpolatedBody, api, requestInfo, variables);
//         }

//         return res.json(result);
//     } catch (err) {
//         let errorDetails = {
//             message: err.message,
//             code: err.code || null,
//             status: err.response?.status || null,
//             statusText: err.response?.statusText || null,
//             responseData: null
//         };

//         if (err.response?.data) {
//             try {
//                 errorDetails.responseData = typeof err.response.data === 'string'
//                     ? err.response.data
//                     : JSON.stringify(err.response.data, null, 2);
//             } catch (e) {
//                 errorDetails.responseData = 'Unable to parse response data';
//             }
//         }

//         console.error('API Error:', errorDetails);

//         return res.status(err.response?.status || 500).json({
//             status: 'error',
//             error: err.message,
//             errorDetails,
//             request: requestInfo,
//             variables,
//             response: err.response ? {
//                 status: err.response.status,
//                 statusText: err.response.statusText,
//                 headers: err.response.headers,
//                 data: err.response.data
//             } : null
//         });
//     }
// });

// Save API calls
app.post('/saveApiCalls', (req, res) => {
    console.log('Received saveApiCalls request:', req.body); // Debug log
    
    const apiCalls = req.body.apiCalls;
    if (!Array.isArray(apiCalls)) {
        console.error('Invalid apiCalls format:', typeof apiCalls, apiCalls);
        return res.status(400).json({ error: 'Invalid apiCalls format - expected array' });
    }
    
    // Remove output data - it should only go to output.json, not APIcalls.json
    const cleanedApiCalls = apiCalls.map(api => {
        const cleaned = { ...api };
        // Remove output and lastRequest as they belong in output.json only
        delete cleaned.output;
        delete cleaned.lastRequest;
        return cleaned;
    });
    
    const filePath = path.join(__dirname, 'data', 'APIcalls.json');
    const dataToSave = { apiCalls: cleanedApiCalls };
    
    console.log(`Saving ${cleanedApiCalls.length} API calls to:`, filePath); // Debug log
    
    fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), err => {
        if (err) {
            console.error('Failed to save API calls:', err);
            return res.status(500).json({ error: 'Failed to save API calls', details: err.message });
        }
        console.log('API calls saved successfully'); // Debug log
        res.json({ success: true, message: `Saved ${cleanedApiCalls.length} API calls` });
    });
});

// Serve APIcalls.json for GET requests
app.get('/APIcalls.json', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'APIcalls.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'APIcalls.json not found' });
        }
        res.type('application/json').send(data);
    });
});

// Serve other JSON files from data directory
app.get('/variables.json', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'variables.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'variables.json not found' });
        }
        res.type('application/json').send(data);
    });
});

app.get('/output.json', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'output.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'output.json not found' });
        }
        res.type('application/json').send(data);
    });
});

app.get('/HiddenNodes.json', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'HiddenNodes.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'HiddenNodes.json not found' });
        }
        res.type('application/json').send(data);
    });
});

app.get('/Graphconf.json', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'Graphconf.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'Graphconf.json not found' });
        }
        res.type('application/json').send(data);
    });
});

app.get('/GraphConf.json', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'GraphConf.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'GraphConf.json not found' });
        }
        res.type('application/json').send(data);
    });
});

app.get('/Filter.json', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'Filter.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'Filter.json not found' });
        }
        res.type('application/json').send(data);
    });
});

app.get('/NodePosition.json', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'NodePosition.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'NodePosition.json not found' });
        }
        res.type('application/json').send(data);
    });
});

// Endpoint to update variables.json
app.post('/variables.json', (req, res) => {
  fs.writeFile(path.join(__dirname, 'data', 'variables.json'), JSON.stringify(req.body, null, 2), err => {
    if (err) {
      res.status(500).send('Write failed');
    } else {
      res.send('OK');
    }
  });
});

// Endpoint to update HiddenNodes.json
app.post('/HiddenNodes.json', (req, res) => {
  fs.writeFile(path.join(__dirname, 'data', 'HiddenNodes.json'), JSON.stringify(req.body, null, 2), err => {
    if (err) {
      res.status(500).send('Write failed');
    } else {
      res.send('OK');
    }
  });
});

// Endpoint to show (unhide) a specific node
app.post('/ShowNode', (req, res) => {
  const { key, depth } = req.body;
  
  if (key === undefined || depth === undefined) {
    return res.status(400).json({ 
      error: 'Missing required parameters: key and depth' 
    });
  }
  
  console.log(`Showing node: key="${key}", depth=${depth}`);
  
  const hiddenNodesPath = path.join(__dirname, 'data', 'HiddenNodes.json');
  
  // Read current hidden nodes
  fs.readFile(hiddenNodesPath, 'utf8', (err, data) => {
    let hiddenNodesData = { hiddenNodes: [] };
    
    if (!err && data) {
      try {
        hiddenNodesData = JSON.parse(data);
        if (!hiddenNodesData.hiddenNodes) {
          hiddenNodesData.hiddenNodes = [];
        }
      } catch (parseErr) {
        console.error('Error parsing HiddenNodes.json:', parseErr);
        hiddenNodesData = { hiddenNodes: [] };
      }
    }
    
    // Remove the specified node from hidden nodes
    const originalLength = hiddenNodesData.hiddenNodes.length;
    hiddenNodesData.hiddenNodes = hiddenNodesData.hiddenNodes.filter(
      hn => !(hn.key === key && hn.depth === depth)
    );
    
    const wasRemoved = hiddenNodesData.hiddenNodes.length < originalLength;
    
    // Save the updated hidden nodes
    fs.writeFile(hiddenNodesPath, JSON.stringify(hiddenNodesData, null, 2), writeErr => {
      if (writeErr) {
        console.error('Failed to save updated HiddenNodes.json:', writeErr);
        return res.status(500).json({ 
          error: 'Failed to save updated hidden nodes', 
          details: writeErr.message 
        });
      }
      
      console.log(`Node successfully ${wasRemoved ? 'shown' : 'was already visible'}: key="${key}", depth=${depth}`);
      res.json({ 
        success: true, 
        message: wasRemoved ? 'Node successfully shown' : 'Node was already visible',
        wasRemoved,
        remainingHiddenNodes: hiddenNodesData.hiddenNodes.length
      });
    });
  });
});

// Smart parsing function to handle different data formats
async function smartParse(data, headers = {}) {
  // If data is already an object, return as is
  if (typeof data === 'object' && data !== null) {
    // Check if it has a 'data' property that might need parsing
    if (data.data && typeof data.data === 'string') {
      const parsedData = await smartParse(data.data, headers);
      return { ...data, data: parsedData };
    }
    return data;
  }

  // If data is not a string, convert to string first
  if (typeof data !== 'string') {
    data = String(data);
  }

  // Check content type from headers
  const contentType = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
  
  // Try to detect format from content type
  if (contentType.includes('application/json') || contentType.includes('text/json')) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.log('Failed to parse as JSON despite content-type, trying other formats');
    }
  }
  
  // XML conversion is now handled upstream in the API response processing
  // Skip XML parsing here to avoid double conversion
  if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
    return data; // Return as-is, should already be converted if it was XML
  }
  
  if (contentType.includes('text/html')) {
    return parseHtmlToJson(data);
  }

  // Auto-detect format based on content
  const trimmedData = data.trim();
  
  // Try JSON first (most common API response)
  if ((trimmedData.startsWith('{') && trimmedData.endsWith('}')) || 
      (trimmedData.startsWith('[') && trimmedData.endsWith(']'))) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.log('Failed to parse as JSON, trying other formats');
    }
  }
  
  // Try XML
  if (trimmedData.startsWith('<') && trimmedData.includes('>')) {
    return await parseXmlToJson(data);
  }
  
  // If all else fails, return as string
  return data;
}

// Helper function to parse XML to JSON using xml2js
async function parseXmlToJson(xmlString) {
  try {
    const parser = new xml2js.Parser({ 
      explicitArray: false,    // Only create arrays when there are multiple elements
      ignoreAttrs: false,      // Keep XML attributes
      mergeAttrs: true,        // Merge attributes with element content
      explicitCharkey: false,  // Don't create separate text content key
      charkey: 'content',      // Use 'content' for mixed content
      trim: true,              // Trim whitespace
      normalize: true,         // Normalize whitespace
      normalizeTags: false,    // Keep original tag casing
      attrkey: '@'            // Prefix for attributes
    });
    
    return new Promise((resolve, reject) => {
      parser.parseString(xmlString, (err, result) => {
        if (err) {
          console.error('XML parsing error:', err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  } catch (e) {
    console.error('Error parsing XML:', e);
    return { content: xmlString, parseError: 'Failed to parse XML' };
  }
}

// Helper function to parse HTML to JSON
function parseHtmlToJson(htmlString) {
  try {
    // Basic HTML parsing - extract text content and basic structure
    const result = {
      type: 'html',
      content: htmlString
    };
    
    // Extract title if present
    const titleMatch = htmlString.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
    }
    
    // Extract meta tags
    const metaMatches = htmlString.match(/<meta[^>]*>/gi);
    if (metaMatches) {
      result.meta = metaMatches.map(meta => {
        const nameMatch = meta.match(/name=["']([^"']+)["']/i);
        const contentMatch = meta.match(/content=["']([^"']+)["']/i);
        return {
          name: nameMatch ? nameMatch[1] : null,
          content: contentMatch ? contentMatch[1] : null
        };
      }).filter(m => m.name || m.content);
    }
    
    // Extract body text (remove HTML tags)
    const bodyMatch = htmlString.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      result.bodyText = bodyMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    } else {
      // If no body tag, extract all text
      result.bodyText = htmlString.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    
    return result;
  } catch (e) {
    console.error('Error parsing HTML:', e);
    return { content: htmlString, parseError: 'Failed to parse HTML' };
  }
}

// Append output to output.json
app.post('/appendOutput', async (req, res) => {
  const result = req.body.result;
  if (!result) {
    return res.status(400).json({ error: 'Missing result data' });
  }

  // Create a copy of the result to modify for output.json
  let outputResult = JSON.parse(JSON.stringify(result));
  
  // Apply smart parsing to the data
  try {
    // If there's a response body/data, parse it intelligently (but not XML - that's handled upstream)
    if (outputResult.response && outputResult.response.data) {
      const responseHeaders = outputResult.response.headers || {};
      outputResult.response.data = await smartParse(outputResult.response.data, responseHeaders);
    }
    
    // If there's a data property specifically, parse it
    if (outputResult.data) {
      outputResult.data = await smartParse(outputResult.data, outputResult.headers || {});
    }
    
    // If there's a body property, parse it
    if (outputResult.body) {
      outputResult.body = await smartParse(outputResult.body, outputResult.headers || {});
    }
  } catch (parseErr) {
    console.error('Error during smart parsing:', parseErr);
    // Continue with original data if parsing fails
  }
  
  // Filter out account variables (visible: false) from the variables section
  if (outputResult.variables) {
    try {
      // Read variables.json to get visibility settings
      const variablesPath = path.join(__dirname, 'data', 'variables.json');
      const variablesData = fs.readFileSync(variablesPath, 'utf8');
      const variablesConfig = JSON.parse(variablesData);
      
      if (variablesConfig.variables && Array.isArray(variablesConfig.variables)) {
        // Create a map of variable names to their visibility
        const visibilityMap = {};
        variablesConfig.variables.forEach(v => {
          visibilityMap[v.name] = v.visible !== false; // Default to visible if not specified
        });
        
        // Filter the variables in the output result
        const filteredVariables = {};
        Object.keys(outputResult.variables).forEach(key => {
          if (visibilityMap[key] !== false) {
            filteredVariables[key] = outputResult.variables[key];
          }
        });
        outputResult.variables = filteredVariables;
      }
    } catch (err) {
      console.error('Error filtering variables:', err);
      // If there's an error reading variables.json, proceed without filtering
    }
  }

  const filePath = path.join(__dirname, 'data', 'output.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    let outputArr = [];
    if (err) {
      // File does not exist or cannot be read, start with empty array
      outputArr = [];
    } else if (data) {
      try {
        outputArr = JSON.parse(data);
        if (!Array.isArray(outputArr)) outputArr = [];
      } catch (e) {
        outputArr = [];
      }
    }
    outputArr.push(outputResult);
    fs.writeFile(filePath, JSON.stringify(outputArr, null, 2), err2 => {
      if (err2) {
        return res.status(500).json({ error: 'Failed to append output' });
      }
      res.json({ success: true });
    });
  });
});

// Endpoint to update NodePosition.json
app.post('/NodePosition.json', (req, res) => {
  console.log('Received NodePosition.json save request:', req.body); // Debug log
  fs.writeFile(path.join(__dirname, 'data', 'NodePosition.json'), JSON.stringify(req.body, null, 2), err => {
    if (err) {
      console.error('Failed to save NodePosition.json:', err);
      res.status(500).send('Write failed');
    } else {
      console.log('NodePosition.json saved successfully');
      res.send('OK');
    }
  });
});

// Endpoint to update Graphconf.json (replaces NodePosition.json)
app.post('/Graphconf.json', (req, res) => {
  console.log('Received Graphconf.json save request:', req.body); // Debug log
  fs.writeFile(path.join(__dirname, 'data', 'Graphconf.json'), JSON.stringify(req.body, null, 2), err => {
    if (err) {
      console.error('Failed to save Graphconf.json:', err);
      res.status(500).send('Write failed');
    } else {
      console.log('Graphconf.json saved successfully');
      res.send('OK');
    }
  });
});

// Update Graph Configuration API
app.post('/UpdateGraphConfiguration', (req, res) => {
  console.log('Received UpdateGraphConfiguration request:', req.body);
  
  const graphConfigPath = path.join(__dirname, 'data', 'Graphconf.json');
  
  // Read existing configuration
  fs.readFile(graphConfigPath, 'utf8', (err, data) => {
    let graphConfig = { 
      nodePositions: {},
      graphControls: {
        expandAll: false,
        collapseAll: false,
        nodeWidth: 110,
        nodeSeparation: 60,
        orientation: 'horizontal',
        textSize: 12
      },
      hierarchicalControls: {
        nodeSeparation: 100,
        levelSeparation: 150,
        nodeSize: 22,
        treeOrientation: 'vertical',
        zoomValue: 1
      },
      explorerControls: {
        nodeSpacing: 100,
        verticalSpacing: 40,
        textSize: 11,
        nodeSize: 5,
        maxDepth: 8,
        chartSize: 400,
        orientation: 'vertical',
        treeShape: 'tree',
        linkStyle: 'curved',
        showLabels: true
      },
      controlPanelState: {
        width: '320px',
        height: '600px',
        collapsed: false
      }
    };
    
    if (!err && data) {
      try {
        graphConfig = JSON.parse(data);
        if (!graphConfig.nodePositions) {
          graphConfig.nodePositions = {};
        }
        if (!graphConfig.graphControls) {
          graphConfig.graphControls = {
            expandAll: false,
            collapseAll: false,
            nodeWidth: 110,
            nodeSeparation: 60,
            orientation: 'horizontal',
            textSize: 12
          };
        }
        if (!graphConfig.hierarchicalControls) {
          graphConfig.hierarchicalControls = {
            nodeSeparation: 100,
            levelSeparation: 150,
            nodeSize: 22,
            treeOrientation: 'vertical',
            zoomValue: 1
          };
        }
        if (!graphConfig.explorerControls) {
          graphConfig.explorerControls = {
            nodeSpacing: 100,
            verticalSpacing: 40,
            textSize: 11,
            nodeSize: 5,
            maxDepth: 8,
            chartSize: 400,
            orientation: 'vertical',
            treeShape: 'tree',
            linkStyle: 'curved',
            showLabels: true
          };
        }
        if (!graphConfig.controlPanelState) {
          graphConfig.controlPanelState = {
            width: '320px',
            height: '600px',
            collapsed: false
          };
        }
      } catch (parseErr) {
        console.error('Error parsing existing Graphconf.json:', parseErr);
      }
    }
    
    // Update with new values from request
    if (req.body.nodePositions) {
      graphConfig.nodePositions = { ...graphConfig.nodePositions, ...req.body.nodePositions };
    }
    if (req.body.graphControls) {
      graphConfig.graphControls = { ...graphConfig.graphControls, ...req.body.graphControls };
    }
    if (req.body.hierarchicalControls) {
      graphConfig.hierarchicalControls = { ...graphConfig.hierarchicalControls, ...req.body.hierarchicalControls };
    }
    if (req.body.explorerControls) {
      graphConfig.explorerControls = { ...graphConfig.explorerControls, ...req.body.explorerControls };
    }
    if (req.body.controlPanelState) {
      graphConfig.controlPanelState = { ...graphConfig.controlPanelState, ...req.body.controlPanelState };
    }
    
    // Save the updated configuration
    fs.writeFile(graphConfigPath, JSON.stringify(graphConfig, null, 2), writeErr => {
      if (writeErr) {
        console.error('Failed to save graph configuration:', writeErr);
        return res.status(500).json({ 
          error: 'Failed to save graph configuration', 
          details: writeErr.message 
        });
      }
      
      console.log('Graph configuration saved successfully:', graphConfig);
      res.json({ 
        success: true, 
        message: 'Graph configuration updated successfully',
        configuration: graphConfig
      });
    });
  });
});

// Alias endpoint to update graph controls (same behavior as /UpdateGraphConfiguration)
app.post('/UpdateGraphControls', (req, res) => {
  // Reuse logic by internally calling the existing implementation
  // Duplicate minimal logic to avoid refactor
  const graphConfigPath = path.join(__dirname, 'data', 'Graphconf.json');
  fs.readFile(graphConfigPath, 'utf8', (err, data) => {
    let graphConfig = {};
    try {
      graphConfig = data ? JSON.parse(data) : {};
    } catch (e) { graphConfig = {}; }
    // Ensure default sections
    graphConfig.nodePositions = graphConfig.nodePositions || {};
    graphConfig.graphControls = graphConfig.graphControls || {
      expandAll: false,
      collapseAll: false,
      nodeWidth: 110,
      nodeSeparation: 60,
      orientation: 'horizontal',
      textSize: 12
    };
    graphConfig.hierarchicalControls = graphConfig.hierarchicalControls || {
      nodeSeparation: 100,
      levelSeparation: 150,
      nodeSize: 22,
      treeOrientation: 'vertical',
      zoomValue: 1
    };
    graphConfig.explorerControls = graphConfig.explorerControls || {
      nodeSpacing: 100,
      verticalSpacing: 40,
      textSize: 11,
      nodeSize: 5,
      maxDepth: 8,
      chartSize: 400,
      orientation: 'vertical',
      treeShape: 'tree',
      linkStyle: 'curved',
      showLabels: true
    };
    graphConfig.controlPanelState = graphConfig.controlPanelState || {
      width: '320px',
      height: '600px',
      collapsed: false
    };

    if (req.body.nodePositions) {
      graphConfig.nodePositions = { ...graphConfig.nodePositions, ...req.body.nodePositions };
    }
    if (req.body.graphControls) {
      graphConfig.graphControls = { ...graphConfig.graphControls, ...req.body.graphControls };
    }
    if (req.body.hierarchicalControls) {
      graphConfig.hierarchicalControls = { ...graphConfig.hierarchicalControls, ...req.body.hierarchicalControls };
    }
    if (req.body.explorerControls) {
      graphConfig.explorerControls = { ...graphConfig.explorerControls, ...req.body.explorerControls };
    }
    if (req.body.controlPanelState) {
      graphConfig.controlPanelState = { ...graphConfig.controlPanelState, ...req.body.controlPanelState };
    }

    fs.writeFile(graphConfigPath, JSON.stringify(graphConfig, null, 2), writeErr => {
      if (writeErr) {
        return res.status(500).json({ error: 'Failed to save graph configuration', details: writeErr.message });
      }
      res.json({ success: true, message: 'Graph configuration updated successfully', configuration: graphConfig });
    });
  });
});

// Save Graph Control Panel Size API
app.post('/SaveGraphControlSize', (req, res) => {
  console.log('Received SaveGraphControlSize request:', req.body);
  
  const graphConfigPath = path.join(__dirname, 'data', 'Graphconf.json');
  
  // Read existing configuration
  fs.readFile(graphConfigPath, 'utf8', (err, data) => {
    let graphConfig = { 
      nodePositions: {},
      graphControls: {
        expandAll: false,
        collapseAll: false,
        nodeWidth: 110,
        nodeSeparation: 60,
        orientation: 'horizontal',
        textSize: 12
      },
      hierarchicalControls: {
        nodeSeparation: 100,
        levelSeparation: 150,
        nodeSize: 22,
        treeOrientation: 'vertical',
        zoomValue: 1
      },
      explorerControls: {
        nodeSpacing: 100,
        verticalSpacing: 40,
        textSize: 11,
        nodeSize: 5,
        maxDepth: 8,
        chartSize: 400,
        orientation: 'vertical',
        treeShape: 'tree',
        linkStyle: 'curved',
        showLabels: true
      },
      controlPanelState: {
        width: '320px',
        height: '600px',
        collapsed: false
      }
    };
    
    if (!err && data) {
      try {
        graphConfig = JSON.parse(data);
        if (!graphConfig.controlPanelState) {
          graphConfig.controlPanelState = {
            width: '320px',
            height: '600px',
            collapsed: false
          };
        }
      } catch (parseErr) {
        console.error('Error parsing existing Graphconf.json:', parseErr);
      }
    }
    
    // Update control panel state with new values from request
    if (req.body) {
      graphConfig.controlPanelState = { ...graphConfig.controlPanelState, ...req.body };
    }
    
    // Save the updated configuration
    fs.writeFile(graphConfigPath, JSON.stringify(graphConfig, null, 2), writeErr => {
      if (writeErr) {
        console.error('Failed to save control panel state:', writeErr);
        return res.status(500).json({ 
          error: 'Failed to save control panel state', 
          details: writeErr.message 
        });
      }
      
      console.log('Control panel state saved successfully:', graphConfig.controlPanelState);
      res.json({ 
        success: true, 
        message: 'Control panel state updated successfully',
        controlPanelState: graphConfig.controlPanelState
      });
    });
  });
});

// Render Graph API - Save graph configuration for rendering
app.post('/RenderGraph', (req, res) => {
  console.log('Received RenderGraph request:', req.body);
  
  const graphControlsPath = path.join(__dirname, 'data', 'GraphControls.json');
  
  try {
    // Validate required fields
    if (!req.body.dataSource || !req.body.visualization) {
      return res.status(400).json({ 
        error: 'Missing required fields: dataSource and visualization are required' 
      });
    }
    
  // Accept either legacy visualization.graphType or new visualization.activeGraphType
  if (!req.body.dataSource.apiResponse || (!req.body.visualization.graphType && !req.body.visualization.activeGraphType)) {
      return res.status(400).json({ 
        error: 'Missing required fields: apiResponse and graphType are required' 
      });
    }
    
    // Load existing to merge multi-graph mappings
    let existing = {};
    try {
      if (fs.existsSync(graphControlsPath)) {
        existing = JSON.parse(fs.readFileSync(graphControlsPath, 'utf8')) || {};
      }
    } catch {}

    const graphs = req.body.visualization.graphs || existing.visualization?.graphs || {};
    const activeGraphType = req.body.visualization.activeGraphType || req.body.visualization.graphType;
    if (req.body.visualization.mappings && activeGraphType) {
      graphs[activeGraphType] = { mappings: req.body.visualization.mappings };
    }

    const configuration = {
      dataSource: {
        apiResponse: req.body.dataSource.apiResponse,
        lastLoaded: new Date().toISOString()
      },
      visualization: {
        activeGraphType: activeGraphType,
        graphs: graphs
      },
      explorerSettings: {
        spacing: req.body.explorerSettings?.spacing || existing.explorerSettings?.spacing || 100,
        verticalSpacing: req.body.explorerSettings?.verticalSpacing || existing.explorerSettings?.verticalSpacing || 40,
        textSize: req.body.explorerSettings?.textSize || existing.explorerSettings?.textSize || 11,
        maxDepth: req.body.explorerSettings?.maxDepth || existing.explorerSettings?.maxDepth || 8
      },
      metadata: {
        createdAt: existing.metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: existing.metadata?.version || '1.0'
      }
    };
    
    // Save the configuration
    fs.writeFileSync(graphControlsPath, JSON.stringify(configuration, null, 2));
    
    console.log('Graph configuration saved successfully:', configuration);
    res.json({ 
      success: true, 
      message: 'Graph configuration saved successfully',
      configuration: configuration
    });
    
  } catch (error) {
    console.error('Failed to save graph configuration:', error);
    res.status(500).json({ 
      error: 'Failed to save graph configuration', 
      details: error.message 
    });
  }
});

// Save (auto) Graph Controls without full render
app.post('/SaveGraphControls', (req, res) => {
  const graphControlsPath = path.join(__dirname, 'data', 'GraphControls.json');
  let existing = {};
  try {
    if (fs.existsSync(graphControlsPath)) {
      existing = JSON.parse(fs.readFileSync(graphControlsPath, 'utf8')) || {};
    }
  } catch (e) {
    existing = {};
  }
  // Initialize structure if missing
  if (!existing.metadata) existing.metadata = { createdAt: new Date().toISOString(), version: '1.0' };
  if (!existing.dataSource) existing.dataSource = {};
  if (!existing.visualization) existing.visualization = { mappings: {} };
  if (!existing.explorerSettings) existing.explorerSettings = {};

  // Merge incoming
  if (req.body.dataSource) {
    existing.dataSource = { ...existing.dataSource, ...req.body.dataSource };
    if (!existing.dataSource.lastLoaded) existing.dataSource.lastLoaded = new Date().toISOString();
  }
  if (req.body.visualization) {
    existing.visualization = {
      ...existing.visualization,
      ...req.body.visualization,
      mappings: { ...(existing.visualization.mappings||{}), ...(req.body.visualization.mappings||{}) }
    };
  }
  if (req.body.explorerSettings) {
    existing.explorerSettings = { ...existing.explorerSettings, ...req.body.explorerSettings };
  }
  existing.metadata.updatedAt = new Date().toISOString();

  try {
    fs.writeFileSync(graphControlsPath, JSON.stringify(existing, null, 2));
    res.json({ success: true, configuration: existing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save graph controls', details: err.message });
  }
});

// Save a named mapping set per data source (DataSourceMappings.json)
app.post('/SaveDataSourceMapping', (req, res) => {
  try {
    const { dataSource, mappingName, graphs } = req.body || {};
    if (!dataSource || !mappingName || !graphs || typeof graphs !== 'object') {
      return res.status(400).json({ error: 'dataSource, mappingName and graphs are required' });
    }
    const filePath = path.join(__dirname, 'data', 'DataSourceMappings.json');
    let existing = { dataSources: {}, metadata: { version: '1.0', createdAt: new Date().toISOString() } };
    if (fs.existsSync(filePath)) {
      try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')) || existing; } catch {}
    }
    if (!existing.dataSources) existing.dataSources = {};
    if (!existing.dataSources[dataSource]) existing.dataSources[dataSource] = { mappings: {} };
    const now = new Date().toISOString();
    existing.dataSources[dataSource].mappings[mappingName] = {
      graphs: graphs,
      updatedAt: now,
      createdAt: existing.dataSources[dataSource].mappings[mappingName]?.createdAt || now
    };
    existing.metadata.updatedAt = now;
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
    res.json({ success: true, mappings: existing.dataSources[dataSource].mappings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save data source mapping', details: err.message });
  }
});

// Validate Node Data Type API - Test if a field path contains compatible data
app.post('/ValidateNodeDataType', (req, res) => {
  console.log('Received ValidateNodeDataType request:', req.body);
  
  try {
    const { fieldPath, rowPath, targetDataType, dataSource } = req.body;
    
    if (!fieldPath || !targetDataType || !dataSource) {
      return res.status(400).json({ 
        error: 'Missing required fields: fieldPath, targetDataType, and dataSource are required' 
      });
    }
    
    // Load the JSON data from the specified data source
    const apiResponsePath = path.join(__dirname, 'data', 'ApiResponse', dataSource);
    
    if (!fs.existsSync(apiResponsePath)) {
      return res.status(404).json({ 
        error: `Data source not found: ${dataSource}` 
      });
    }
    
    const jsonData = JSON.parse(fs.readFileSync(apiResponsePath, 'utf8'));
    
    // Helper function to resolve nested paths
    function resolvePath(path, data = jsonData) {
      if (!path) return data;
      return path.split('.').reduce((obj, key) => {
        if (obj && typeof obj === 'object') {
          return obj[key];
        }
        return undefined;
      }, data);
    }
    
    // Get the row data if rowPath is specified
    let rowData = jsonData;
    if (rowPath) {
      rowData = resolvePath(rowPath);
      if (!Array.isArray(rowData)) {
        return res.status(400).json({ 
          error: 'Row path does not point to an array',
          rowPath: rowPath,
          actualType: typeof rowData
        });
      }
    }
    
    // Extract field name from the full field path
    let fieldName = fieldPath;
    
    if (rowPath && fieldPath.startsWith(rowPath)) {
      // Standard case: remove row path prefix
      const remainder = fieldPath.substring(rowPath.length + 1);
      if (remainder.match(/^\d+\./)) {
        fieldName = remainder.substring(remainder.indexOf('.') + 1);
      } else {
        fieldName = remainder;
      }
    } else {
      // Extract field name from path like "data.0.wb:longitude"
      const pathParts = fieldPath.split('.');
      let lastNumericIndex = -1;
      
      for (let i = 0; i < pathParts.length; i++) {
        if (/^\d+$/.test(pathParts[i])) {
          lastNumericIndex = i;
        }
      }
      
      if (lastNumericIndex >= 0 && lastNumericIndex < pathParts.length - 1) {
        fieldName = pathParts.slice(lastNumericIndex + 1).join('.');
      } else {
        fieldName = pathParts[pathParts.length - 1];
      }
    }
    
    // Test field access and data type compatibility
    const results = [];
    const testItems = Array.isArray(rowData) ? rowData.slice(0, 10) : [rowData];
    
    let validCount = 0;
    let convertibleCount = 0;
    
    for (let i = 0; i < testItems.length; i++) {
      const item = testItems[i];
      let fieldValue;
      
      // Try to access the field
      if (fieldName.includes('.')) {
        fieldValue = resolvePath(fieldName, item);
      } else {
        fieldValue = item[fieldName];
      }
      
      let isValid = false;
      let isConvertible = false;
      
      // Check data type compatibility
      if (targetDataType === 'number') {
        if (typeof fieldValue === 'number' && !isNaN(fieldValue)) {
          isValid = true;
        } else if (typeof fieldValue === 'string') {
          const numValue = parseFloat(fieldValue);
          if (!isNaN(numValue) && isFinite(numValue)) {
            isConvertible = true;
          }
        }
      } else if (targetDataType === 'string') {
        if (typeof fieldValue === 'string') {
          isValid = true;
        } else if (fieldValue !== null && fieldValue !== undefined) {
          isConvertible = true;
        }
      } else if (targetDataType === 'any') {
        isValid = true;
      }
      
      if (isValid) validCount++;
      if (isConvertible) convertibleCount++;
      
      results.push({
        index: i,
        fieldValue: fieldValue,
        fieldType: typeof fieldValue,
        isValid: isValid,
        isConvertible: isConvertible
      });
    }
    
    const totalCount = testItems.length;
    const validRate = totalCount > 0 ? validCount / totalCount : 0;
    const convertibleRate = totalCount > 0 ? convertibleCount / totalCount : 0;
    const overallCompatibility = validRate + convertibleRate;
    
    const response = {
      success: true,
      fieldPath: fieldPath,
      fieldName: fieldName,
      targetDataType: targetDataType,
      totalItems: totalCount,
      validItems: validCount,
      convertibleItems: convertibleCount,
      validRate: validRate,
      convertibleRate: convertibleRate,
      overallCompatibility: overallCompatibility,
      isCompatible: overallCompatibility >= 0.8, // 80% threshold
      sampleResults: results.slice(0, 5),
      recommendation: overallCompatibility >= 0.8 ? 
        (validRate >= 0.8 ? 'Direct mapping recommended' : 'Conversion mapping recommended') :
        'Field not suitable for this data type'
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error validating node data type:', error);
    res.status(500).json({ 
      error: 'Failed to validate data type',
      details: error.message 
    });
  }
});

// Serve directory listings for API responses
app.get('/data/ApiResponse', (req, res) => {
  const apiResponseDir = path.join(__dirname, 'data', 'ApiResponse');
  
  try {
    if (!fs.existsSync(apiResponseDir)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(apiResponseDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    res.json(jsonFiles);
  } catch (error) {
    console.error('Error reading ApiResponse directory:', error);
    res.status(500).json({ error: 'Failed to read directory' });
  }
});

// Endpoint to set starting node position based on monitor resolution
app.post('/SetStartNodePosition', (req, res) => {
  console.log('Received SetStartNodePosition request:', req.body);
  
  const { screenWidth, screenHeight } = req.body;
  
  if (!screenWidth || !screenHeight) {
    return res.status(400).json({ 
      error: 'Missing screen dimensions', 
      required: ['screenWidth', 'screenHeight'] 
    });
  }
  
  // Calculate center position based on screen resolution
  const startingNodeLeft = Math.floor(screenWidth / 2);
  const startingNodeTop = Math.floor(screenHeight / 2);
  
  const nodePositionPath = path.join(__dirname, 'data', 'Graphconf.json');
  
  // Read existing Graphconf.json or create new structure
  fs.readFile(nodePositionPath, 'utf8', (err, data) => {
    let nodePositions = { 
      nodePositions: {},
      graphControls: {
        expandAll: false,
        collapseAll: false
      }
    };
    
    if (!err && data) {
      try {
        nodePositions = JSON.parse(data);
        if (!nodePositions.nodePositions) {
          nodePositions.nodePositions = {};
        }
        if (!nodePositions.graphControls) {
          nodePositions.graphControls = {
            expandAll: false,
            collapseAll: false
          };
        }
      } catch (parseErr) {
        console.error('Error parsing existing Graphconf.json:', parseErr);
        nodePositions = { 
          nodePositions: {},
          graphControls: {
            expandAll: false,
            collapseAll: false
          }
        };
      }
    }
    
    // Set the starting node position values
    nodePositions.nodePositions.StartingNodeLeft = startingNodeLeft;
    nodePositions.nodePositions.StartingNodeTop = startingNodeTop;
    
    // Save the updated file
    fs.writeFile(nodePositionPath, JSON.stringify(nodePositions, null, 2), writeErr => {
      if (writeErr) {
        console.error('Failed to save starting node position:', writeErr);
        return res.status(500).json({ 
          error: 'Failed to save starting node position', 
          details: writeErr.message 
        });
      }
      
      console.log('Starting node position saved successfully:', {
        StartingNodeLeft: startingNodeLeft,
        StartingNodeTop: startingNodeTop,
        screenDimensions: { screenWidth, screenHeight }
      });
      
      res.json({ 
        success: true, 
        message: 'Starting node position set successfully',
        position: {
          StartingNodeLeft: startingNodeLeft,
          StartingNodeTop: startingNodeTop
        },
        screenDimensions: { screenWidth, screenHeight }
      });
    });
  });
});

// Endpoint to update Filter.json
app.post('/Filter.json', (req, res) => {
  fs.writeFile(path.join(__dirname, 'data', 'Filter.json'), JSON.stringify(req.body, null, 2), err => {
    if (err) {
      res.status(500).send('Write failed');
    } else {
      res.send('OK');
    }
  });
});

// Endpoint to update output.json
app.post('/output.json', (req, res) => {
  fs.writeFile(path.join(__dirname, 'data', 'output.json'), JSON.stringify(req.body, null, 2), err => {
    if (err) {
      res.status(500).send('Write failed');
    } else {
      res.send('OK');
    }
  });
});

// Endpoint to update RunConf.json
app.post('/UpdateRunConfiguration', (req, res) => {
  console.log('Received UpdateRunConfiguration request:', req.body);
  
  const runConfigPath = path.join(__dirname, 'data', 'RunConf.json');
  
  // Validate request body
  if (!req.body.applications || !Array.isArray(req.body.applications)) {
    return res.status(400).json({ 
      error: 'Invalid request format', 
      expected: 'applications array' 
    });
  }
  
  // Read existing configuration
  fs.readFile(runConfigPath, 'utf8', (err, data) => {
    let runConfig = { 
      applications: [
        {
          id: "app_default",
          name: "Default Application",
          checked: false,
          apiIds: []
        }
      ]
    };
    
    if (!err && data) {
      try {
        runConfig = JSON.parse(data);
        if (!runConfig.applications) {
          runConfig.applications = [
            {
              id: "app_default",
              name: "Default Application", 
              checked: false,
              apiIds: []
            }
          ];
        }
      } catch (parseErr) {
        console.error('Error parsing existing RunConf.json:', parseErr);
      }
    }
    
    // Update with new applications data
    runConfig.applications = req.body.applications;
    
    // Save the updated configuration
    fs.writeFile(runConfigPath, JSON.stringify(runConfig, null, 2), writeErr => {
      if (writeErr) {
        console.error('Failed to save run configuration:', writeErr);
        return res.status(500).json({ 
          error: 'Failed to save run configuration', 
          details: writeErr.message 
        });
      }
      
      console.log('Run configuration saved successfully:', runConfig);
      res.json({ 
        success: true, 
        message: 'Run configuration updated successfully',
        applications: runConfig.applications
      });
    });
  });
});

// Serve RunConf.json for GET requests
app.get('/RunConf.json', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'RunConf.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      // If file doesn't exist, return default configuration
      const defaultConfig = {
        applications: [
          {
            id: "app_default",
            name: "Default Application",
            checked: false,
            apiIds: []
          }
        ]
      };
      return res.json(defaultConfig);
    }
    res.type('application/json').send(data);
  });
});

// Create a new application
app.post('/CreateApplication', (req, res) => {
  console.log('Received CreateApplication request:', req.body);
  
  const runConfigPath = path.join(__dirname, 'data', 'RunConf.json');
  
  // Read existing configuration
  fs.readFile(runConfigPath, 'utf8', (err, data) => {
    let runConfig = { 
      applications: [
        {
          id: "app_default",
          name: "Default Application",
          checked: false,
          apiIds: []
        }
      ]
    };
    
    if (!err && data) {
      try {
        runConfig = JSON.parse(data);
        if (!runConfig.applications) {
          runConfig.applications = [
            {
              id: "app_default",
              name: "Default Application", 
              checked: false,
              apiIds: []
            }
          ];
        }
      } catch (parseErr) {
        console.error('Error parsing existing RunConf.json:', parseErr);
      }
    }
    
    // Create new application
    const newApp = {
      id: 'app_' + Date.now(),
      name: 'New Application',
      checked: false,
      apiIds: []
    };
    
    // Add the new application to the list
    runConfig.applications.push(newApp);
    
    // Save the updated configuration
    fs.writeFile(runConfigPath, JSON.stringify(runConfig, null, 2), writeErr => {
      if (writeErr) {
        console.error('Failed to save new application:', writeErr);
        return res.status(500).json({ 
          error: 'Failed to save new application', 
          details: writeErr.message 
        });
      }
      
      console.log('New application created successfully:', newApp);
      res.json({ 
        success: true, 
        message: 'New application created successfully',
        application: newApp,
        applications: runConfig.applications
      });
    });
  });
});

// Endpoint to list available API response files
app.get('/api/list-api-responses', (req, res) => {
    try {
        const apiResponseDir = path.join(__dirname, 'data', 'ApiResponse');
        
        // Check if directory exists
        if (!fs.existsSync(apiResponseDir)) {
            fs.mkdirSync(apiResponseDir, { recursive: true });
            return res.json([]);
        }
        
        // Get all JSON files from ApiResponse directory
        const files = fs.readdirSync(apiResponseDir)
            .filter(file => file.endsWith('.json'))
            .sort();
        
        res.json(files);
    } catch (error) {
        console.error('Error listing API response files:', error);
        res.status(500).json({ error: 'Failed to list API response files' });
    }
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
