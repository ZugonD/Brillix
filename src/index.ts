import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

import { GameManager } from './managers/GameManager.js';
import { QueueManager } from './managers/QueueManager.js';
import { ClientToServerEvents, GameSocket, ServerToClientEvents } from './types.js';

const app = express();
const PORT = process.env.PORT || 6970;

const allowedOrigin =
  process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:6969';  // For development purposes

app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST'],
  credentials: true, 
}));


const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST'],
  },
});

const queueManager = new QueueManager(io);
const gameManager = new GameManager(io);

io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  const gameSocket = socket as GameSocket;

  gameSocket.on('joinQueue', () => queueManager.addPlayer(gameSocket));
  gameSocket.on('leaveQueue', () => queueManager.removePlayer(gameSocket));

  gameSocket.on('moveMade', (moveData) => gameManager.handleMove(gameSocket, moveData));
  gameSocket.on('resign', ({ opponentId }) => gameManager.handleResign(gameSocket, opponentId));
  gameSocket.on('undoRequest', ({ opponentId }) => gameManager.handleUndoRequest(gameSocket, opponentId));
  gameSocket.on('undoAccepted', ({ opponentId }) => gameManager.handleUndoResponse(gameSocket, opponentId, true));
  gameSocket.on('undoRejected', ({ opponentId }) => gameManager.handleUndoResponse(gameSocket, opponentId, false));

  gameSocket.on('disconnect', () => {
    queueManager.removePlayer(gameSocket);
    gameManager.handleDisconnect(gameSocket);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});