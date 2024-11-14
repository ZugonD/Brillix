import { Server } from 'socket.io';
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';
import { GameSocket, ServerToClientEvents, ClientToServerEvents } from '../types.js';

export class QueueManager {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private waitingPlayers: GameSocket[];
  private messageCount: number;

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
    this.waitingPlayers = [];
    this.messageCount = 0;
  }

  addPlayer(socket: GameSocket): void {
    const alreadyInQueue = this.waitingPlayers.some(player => player.id === socket.id);
    if (alreadyInQueue) return;

    const playerName = uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: '-',
      style: 'lowerCase',
    });

    socket.playerName = playerName;
    this.waitingPlayers.push(socket);
    socket.emit('queueJoined', { playerName });

    this.checkForMatch();
  }

  removePlayer(socket: GameSocket): void {
    this.waitingPlayers = this.waitingPlayers.filter(player => player.id !== socket.id);
    socket.emit('queueLeft');
  }

  private checkForMatch(): void {
    if (this.waitingPlayers.length >= 2) {
      const player1 = this.waitingPlayers.shift()!;
      const player2 = this.waitingPlayers.shift()!;

      if (this.io.sockets.sockets.has(player1.id) && this.io.sockets.sockets.has(player2.id)) {
        const gameId = uniqueNamesGenerator({
          dictionaries: [adjectives, colors, animals],
          separator: '-',
          style: 'lowerCase',
        });

        player1.emit('gameStarted', {
          color: 'white',
          opponentId: player2.id!,
          gameId,
          opponentName: player2.playerName,
        });

        player2.emit('gameStarted', {
          color: 'black',
          opponentId: player1.id!,
          gameId,
          opponentName: player1.playerName,
        });

      } else {
        if (this.io.sockets.sockets.has(player1.id)) {
          this.waitingPlayers.push(player1);
        }
        if (this.io.sockets.sockets.has(player2.id)) {
          this.waitingPlayers.push(player2);
        }
      }
    }
  }
}