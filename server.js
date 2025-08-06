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


// Run API Sequence endpoint
app.post('/runApiSequence', async (req, res) => {
    // Accept an array of API calls for sequence processing
    const apiSequence = Array.isArray(req.body) ? req.body : [req.body];
    if (!apiSequence.length) {
        return res.status(400).json({ status: 'error', error: 'No API calls provided' });
    }

    // Load variables from variables.json (case-insensitive)
    let variables = {};
    try {
        const varsRaw = fs.readFileSync(path.join(__dirname, 'variables.json'), 'utf8');
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

    let sessionCookie = null;
    let loginResult = null;
    let results = [];

    // 1. Find and process login API first (if present)
    const loginIdx = apiSequence.findIndex(api => api.isLogin);
    if (loginIdx !== -1) {
        const loginApi = apiSequence[loginIdx];
        const url = interpolate(loginApi.url);
        const body = interpolate(loginApi.body);
        let headers = { ...loginApi.headers };
        try {
            const loginRes = await axios.post(url, body, { httpsAgent, headers, withCredentials: true });
            sessionCookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0] || null;
            loginResult = {
                status: 'success',
                data: loginRes.data,
                cookie: sessionCookie,
                request: {
                    method: loginApi.method,
                    originalUrl: loginApi.url,
                    interpolatedUrl: url,
                    headers,
                    body
                },
                variables,
                response: {
                    status: loginRes.status,
                    statusText: loginRes.statusText,
                    headers: loginRes.headers,
                    data: loginRes.data
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
                variables,
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
            results.push({
                status: 'success',
                data: result.data,
                request: requestInfo,
                variables,
                response: {
                    status: result.status,
                    statusText: result.statusText,
                    headers: result.headers,
                    data: result.data
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
                variables,
                response: err.response ? {
                    status: err.response.status,
                    statusText: err.response.statusText,
                    headers: err.response.headers,
                    data: err.response.data
                } : null
            });
        }
    }

    // Return all results in order
    res.json({ results });
});

// HTTPS agent for insecure requests (e.g. self-signed certs)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Handler for POST requests
async function handlePostRequest(url, body, api, requestInfo, variables) {
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
            data: responseData,
            cookie,
            request: requestInfo,
            variables,
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
            data: responseData,
            request: requestInfo,
            variables,
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
async function handleGetRequest(url, body, api, requestInfo, variables) {
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
        data: responseData,
        request: requestInfo,
        variables,
        response: {
            status: getRes.status,
            statusText: getRes.statusText,
            headers: getRes.headers,
            data: responseData
        }
    };
}

// Handler for other methods (PUT, PATCH, DELETE, etc.)
async function handleGenericRequest(url, body, api, requestInfo, variables) {
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
        data: responseData,
        request: requestInfo,
        variables,
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
    
    const filePath = path.join(__dirname, 'APIcalls.json');
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
    const filePath = path.join(__dirname, 'APIcalls.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'APIcalls.json not found' });
        }
        res.type('application/json').send(data);
    });
});

// Endpoint to update variables.json
app.post('/variables.json', (req, res) => {
  fs.writeFile(path.join(__dirname, 'variables.json'), JSON.stringify(req.body, null, 2), err => {
    if (err) {
      res.status(500).send('Write failed');
    } else {
      res.send('OK');
    }
  });
});

// Endpoint to update HiddenNodes.json
app.post('/HiddenNodes.json', (req, res) => {
  fs.writeFile(path.join(__dirname, 'HiddenNodes.json'), JSON.stringify(req.body, null, 2), err => {
    if (err) {
      res.status(500).send('Write failed');
    } else {
      res.send('OK');
    }
  });
});

// Smart parsing function to handle different data formats
function smartParse(data, headers = {}) {
  // If data is already an object, return as is
  if (typeof data === 'object' && data !== null) {
    // Check if it has a 'data' property that might need parsing
    if (data.data && typeof data.data === 'string') {
      const parsedData = smartParse(data.data, headers);
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
  
  if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
    return parseXmlToJson(data);
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
    return parseXmlToJson(data);
  }
  
  // If all else fails, return as string
  return data;
}

// Helper function to parse XML to JSON
function parseXmlToJson(xmlString) {
  try {
    // Simple XML to JSON converter
    // This is a basic implementation - for production, consider using a library like xml2js
    const result = {};
    
    // Remove XML declaration and comments
    let cleaned = xmlString.replace(/<\?xml[^>]*\?>/gi, '').replace(/<!--[\s\S]*?-->/g, '').trim();
    
    // Handle simple XML structures
    const tagRegex = /<([^\/\s>]+)([^>]*)>([\s\S]*?)<\/\1>/g;
    let match;
    
    while ((match = tagRegex.exec(cleaned)) !== null) {
      const tagName = match[1];
      const content = match[3].trim();
      
      // If content contains more XML tags, parse recursively
      if (content.includes('<') && content.includes('>')) {
        result[tagName] = parseXmlToJson(content);
      } else {
        // Try to parse as number or boolean, otherwise keep as string
        if (content === 'true' || content === 'false') {
          result[tagName] = content === 'true';
        } else if (!isNaN(content) && content !== '') {
          result[tagName] = Number(content);
        } else {
          result[tagName] = content;
        }
      }
    }
    
    // If no tags found, return the original content
    return Object.keys(result).length > 0 ? result : { content: xmlString };
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
app.post('/appendOutput', (req, res) => {
  const result = req.body.result;
  if (!result) {
    return res.status(400).json({ error: 'Missing result data' });
  }

  // Create a copy of the result to modify for output.json
  let outputResult = JSON.parse(JSON.stringify(result));
  
  // Apply smart parsing to the data
  try {
    // If there's a response body/data, parse it intelligently
    if (outputResult.response) {
      outputResult.response = smartParse(outputResult.response, outputResult.headers || {});
    }
    
    // If there's a data property specifically, parse it
    if (outputResult.data) {
      outputResult.data = smartParse(outputResult.data, outputResult.headers || {});
    }
    
    // If there's a body property, parse it
    if (outputResult.body) {
      outputResult.body = smartParse(outputResult.body, outputResult.headers || {});
    }
  } catch (parseErr) {
    console.error('Error during smart parsing:', parseErr);
    // Continue with original data if parsing fails
  }
  
  // Filter out account variables (visible: false) from the variables section
  if (outputResult.variables) {
    try {
      // Read variables.json to get visibility settings
      const variablesPath = path.join(__dirname, 'variables.json');
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

  const filePath = path.join(__dirname, 'output.json');
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

// Endpoint to update Filter.json
app.post('/Filter.json', (req, res) => {
  fs.writeFile(path.join(__dirname, 'Filter.json'), JSON.stringify(req.body, null, 2), err => {
    if (err) {
      res.status(500).send('Write failed');
    } else {
      res.send('OK');
    }
  });
});

// Endpoint to update output.json
app.post('/output.json', (req, res) => {
  fs.writeFile(path.join(__dirname, 'output.json'), JSON.stringify(req.body, null, 2), err => {
    if (err) {
      res.status(500).send('Write failed');
    } else {
      res.send('OK');
    }
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
