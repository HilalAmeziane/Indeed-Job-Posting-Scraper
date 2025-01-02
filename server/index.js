import express from 'express';
import multer from 'multer';
import cors from 'cors';
import csv from 'csv-parser';
import { scrapeJobs } from './scraper.js';
import { getProxy } from './proxyRotator.js';
import { WebSocketServer } from 'ws';
import http from 'http';
import { Readable } from 'stream';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const upload = multer({ storage: multer.memoryStorage() });

// Map to store active scraping sessions
const activeSessions = new Map();

// Configure CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3000'],
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received WebSocket message:', data);
      
      if (data.type === 'stop' && data.sessionId) {
        console.log('Stop request received for session:', data.sessionId);
        const session = activeSessions.get(data.sessionId);
        if (session) {
          console.log('Stopping session:', data.sessionId);
          session.stop = true;
          ws.send(JSON.stringify({
            type: 'info',
            message: 'Stopping...',
            sessionId: data.sessionId
          }));
        } else {
          console.log('Session not found:', data.sessionId);
        }
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    // Clean up any active sessions for this connection
    for (const [sessionId, session] of activeSessions.entries()) {
      if (session.ws === ws) {
        console.log('Cleaning up session on disconnect:', sessionId);
        session.stop = true;
        activeSessions.delete(sessionId);
      }
    }
  });
});

// Broadcast progress to all connected clients
const broadcastProgress = (data) => {
  console.log('Broadcasting data:', data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      console.log('Sending to client:', data);
      client.send(JSON.stringify(data));
    }
  });
};

app.post('/api/scrape', upload.single('csvFile'), async (req, res) => {
  try {
    console.log('Received file:', req.file.originalname);
    
    const results = [];
    const links = [];
    
    // Create a new session
    const sessionId = Date.now().toString();
    console.log('Created new session:', sessionId);
    
    // Lire le fichier CSV
    const stream = Readable.from(req.file.buffer.toString())
      .pipe(csv({
        skipLines: 0,
        headers: false,
        separator: ',',
      }))
      .on('data', (data) => {
        const values = Object.values(data);
        for (const value of values) {
          if (typeof value === 'string' && value.trim().startsWith('http')) {
            const cleanUrl = value.trim().split(';')[0];
            console.log('Found URL:', cleanUrl);
            links.push(cleanUrl);
            break;
          }
        }
      });

    await new Promise((resolve, reject) => {
      stream.on('end', () => {
        console.log('Finished reading CSV. Total URLs found:', links.length);
        resolve();
      });
      stream.on('error', reject);
    });

    if (links.length === 0) {
      throw new Error('No valid links found in the CSV file.');
    }

    console.log(`Found ${links.length} links to process:`, links);

    // Get the WebSocket client for this request
    const ws = Array.from(wss.clients).find(client => client.readyState === 1);
    if (!ws) {
      throw new Error('No active WebSocket connection found');
    }

    // Create session object
    const session = {
      stop: false,
      ws: ws
    };
    activeSessions.set(sessionId, session);
    console.log('Session created:', { sessionId, activeSessionsCount: activeSessions.size });

    // Send sessionId to client
    ws.send(JSON.stringify({
      type: 'sessionStart',
      sessionId: sessionId
    }));

    // Envoyer la réponse immédiatement
    res.json({ success: true, message: 'Processing started', sessionId });

    // Continuer le traitement en arrière-plan
    try {
      await scrapeJobs(links, (data) => {
        if (session.stop) {
          console.log('Session stopped:', sessionId);
          throw new Error('STOP_REQUESTED');
        }
        console.log('Progress callback received for session', sessionId);
        broadcastProgress({ ...data, sessionId });
      }, session);
    } catch (error) {
      console.error('Error during scraping:', error);
      if (error.message === 'STOP_REQUESTED') {
        console.log('Broadcasting stop message for session:', sessionId);
        broadcastProgress({ 
          type: 'info', 
          message: 'Scraping stopped by user',
          sessionId
        });
      } else {
        broadcastProgress({ 
          type: 'error', 
          message: 'An error occurred during scraping: ' + error.message,
          sessionId
        });
      }
    } finally {
      console.log('Cleaning up session:', sessionId);
      activeSessions.delete(sessionId);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});