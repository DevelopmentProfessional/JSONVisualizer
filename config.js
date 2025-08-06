// config.js

const https = require('https');

// Create an HTTPS agent to allow self-signed certificates (for localhost)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false // ⚠️ Only for development!
});

// Configuration object
const config = {
  baseURL: 'https://localhost:8443/api',
  auth: {
    username: process.env.API_USERNAME,
    password: process.env.API_PASSWORD
  },
  headers: {
    'X-Requested-With': 'XMLHttpRequest'
  },
  httpsAgent: httpsAgent
};

module.exports = config;