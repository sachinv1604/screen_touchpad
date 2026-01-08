// server/server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const os = require('os');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store active sessions
const sessions = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join a session
  socket.on('join-session', ({ sessionId, role }) => {
    socket.join(sessionId);
    
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, { laptop: null, mobile: null });
    }
    
    const session = sessions.get(sessionId);
    session[role] = socket.id;
    
    console.log(`${role} joined session: ${sessionId}`);
    
    // Notify the other device
    socket.to(sessionId).emit('device-connected', { role });
  });

  // Handle cursor movement from mobile
  socket.on('cursor-move', (data) => {
    socket.to(data.sessionId).emit('cursor-move', {
      dx: data.dx,
      dy: data.dy
    });
  });

  // Handle clicks from mobile
  socket.on('cursor-click', (data) => {
    socket.to(data.sessionId).emit('cursor-click');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  const networkInterfaces = os.networkInterfaces();
  let localIP = 'localhost';
  
  // Find local IP address
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    networkInterfaces[interfaceName].forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
      }
    });
  });
  
  console.log('=================================');
  console.log('Server is running!');
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network: http://${localIP}:${PORT}`);
  console.log('=================================');
});