const http = require('http');
const fs = require('fs');
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname)); // Serve static files (HTML, JS, etc.)

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

// Start HTTP server
http.createServer(app).listen(8081, () => {
  console.log('HTTP server running on port 8080');
});
