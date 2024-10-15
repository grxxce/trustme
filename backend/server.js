require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const app = express();
const port = process.env.PORT || 5173;

app.use(express.json());

// Create an HTTP server
const server = http.createServer(app);

// Create a WebSocket server for your frontend clients
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections from clients
wss.on('connection', (clientWs) => {
  console.log('Client connected.');

  // Create a WebSocket connection to OpenAI's Realtime API
  const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
    headers: {
      'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
      'OpenAI-Beta': 'realtime=v1',
    },
  });

  // Relay messages from OpenAI to the client
  openaiWs.on('message', (message) => {
    // Forward the message to the client
    clientWs.send(message);
  });

  // Relay messages from the client to OpenAI
  clientWs.on('message', (message) => {
    openaiWs.send(message);
  });

  // Handle OpenAI WebSocket errors
  openaiWs.on('error', (error) => {
    console.error('OpenAI WebSocket error:', error.message);
    clientWs.send(JSON.stringify({ type: 'error', message: error.message }));
  });

  // Handle client WebSocket errors
  clientWs.on('error', (error) => {
    console.error('Client WebSocket error:', error.message);
  });

  // Clean up when client disconnects
  clientWs.on('close', () => {
    console.log('Client disconnected.');
    openaiWs.close();
  });

  // Clean up when OpenAI WebSocket closes
  openaiWs.on('close', () => {
    console.log('OpenAI WebSocket connection closed.');
    clientWs.close();
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
  
  