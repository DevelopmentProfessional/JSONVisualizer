// app.js
const axios = require('axios');
const https = require('https');
const fs = require('fs');

require('dotenv').config();

const USERNAME = process.env.API_USERNAME;
const PASSWORD = process.env.API_PASSWORD;
const BASE_URL = process.env.BASE_URL || 'https://localhost:8443/api';

if (!USERNAME || !PASSWORD) {
  fs.writeFileSync('output.json', JSON.stringify({ error: 'Missing API_USERNAME or API_PASSWORD in .env' }, null, 2));
  process.exit(1);
}

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function dumpAllResponses() {
  const output = {};

  let cookie = null;

  try {
    // === 1. Login ===
    const loginRes = await axios.post(
      `${BASE_URL}/users/_login`,
      `username=${encodeURIComponent(USERNAME)}&password=${encodeURIComponent(PASSWORD)}`,
      {
        httpsAgent,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/xml',
          'X-Requested-With': 'OpenAPI'
        },
        withCredentials: true
      }
    );

    cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0] || null;
    output['LOGIN'] = loginRes.data;
  } catch (err) {
    output['LOGIN'] = { error: 'Failed to login', details: err.message };
  }

  // Create authenticated client
  const api = axios.create({
    baseURL: BASE_URL,
    httpsAgent,
    withCredentials: true,
    headers: {
      'X-Requested-With': 'OpenAPI',
      ...(cookie && { Cookie: cookie })
    }
  });

  // === 2. Fetch and append each response ===
  const endpoints = [
    '/channelgroups',
    '/channels',
    '/channels/portsInUse'
  ];

  try {
    const channelsRes = await api.get('/channels');
    output['/channels'] = channelsRes.data;

    output['/channels/{id}/connectors'] = [];
    if (Array.isArray(channelsRes.data)) {
      for (const channel of channelsRes.data) {
        try {
          const connRes = await api.get(`/channels/${channel.id}/connectors`);
          output['/channels/{id}/connectors'].push({
            channelId: channel.id,
            channelName: channel.name,
            connectors: connRes.data
          });
        } catch (err) {
          output['/channels/{id}/connectors'].push({
            channelId: channel.id,
            error: err.message
          });
        }
      }
    }
  } catch (err) {
    output['/channels'] = { error: 'Failed to fetch channels', details: err.message };
  }

  // Fetch other endpoints
  for (const endpoint of endpoints) {
    if (endpoint === '/channels') continue;
    try {
      const res = await api.get(endpoint);
      output[endpoint] = res.data;
    } catch (err) {
      output[endpoint] = { error: 'Request failed', details: err.message };
    }
  }

  // === 3. Write ALL data to output.json ===
  try {
    fs.writeFileSync('output.json', JSON.stringify(output, null, 2));
  } catch (writeError) {
    // Final fallback if writing fails
    try {
      fs.writeFileSync('output.json', '{\n  "FATAL": "Could not write output.json - filesystem error"\n}');
    } catch {
      // If all else fails, do nothing
    }
  }
}

// ✅ Wrap the async call in try/catch
try {
  dumpAllResponses();
} catch (error) {
  // This catches unexpected errors in the function setup (rare)
  const fallback = {
    FATAL: {
      error: 'Unexpected error during execution',
      message: error.message
    }
  };
  try {
    fs.writeFileSync('output.json', JSON.stringify(fallback, null, 2));
  } catch {
    // Do nothing if we can't write
  }
}