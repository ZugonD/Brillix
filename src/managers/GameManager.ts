import { Server } from 'socket.io';
import { GameSocket, ServerToClientEvents, ClientToServerEvents, ServerGameState } from '../types.js';
import { MoveData } from 'notationix';

export class GameManager {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private activeGames: Map<string, ServerGameState>;
  private playerGameMap: Map<string, string>;

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
    this.activeGames = new Map();
    this.playerGameMap = new Map();
  }

  handleMove(socket: GameSocket, moveData: MoveData): void {

    if (!this.validateMoveData(moveData)) {
      socket.emit('moveError', 'Invalid move data');
      return;
    }

    const opponentSocket = this.io.sockets.sockets.get(moveData.opponentId!) as GameSocket;
    if (!opponentSocket) {
      socket.emit('moveError', 'Opponent not found');
      return;
    }

    const gameId = this.playerGameMap.get(socket.id);
    if (gameId) {
      const gameState = this.activeGames.get(gameId);
      if (gameState) {
        this.activeGames.set(gameId, {
          ...gameState,
          lastMove: moveData,
          clientState: {
            ...gameState.clientState,
            lastMove: {
              from: moveData.from,
              to: moveData.to,
              piece: moveData.piece
            }
          }
        });
      }
    }

    opponentSocket.emit('moveMade', {
      from: moveData.from,
      to: moveData.to,
      piece: moveData.piece
    });
  }

  handleDisconnect(socket: GameSocket): void {
    const gameId = this.playerGameMap.get(socket.id);
    if (gameId) {
      const gameState = this.activeGames.get(gameId);
      if (gameState) {
        this.io.to(gameId).emit('opponentDisconnected');
      }
    }
  }

  handleReconnect(socket: GameSocket, gameId: string, playerId: string): void {
    const gameState = this.activeGames.get(gameId);
    if (gameState) {
      this.playerGameMap.set(socket.id, gameId);
      socket.join(gameId);
  
      socket.emit('gameState', gameState.clientState);
      socket.to(gameId).emit('opponentReconnected', gameState.clientState);
    }
  }

  handleResign(socket: GameSocket, opponentId: string): void {
    socket.to(opponentId).emit('opponentResigned');
  }

  handleUndoRequest(socket: GameSocket, opponentId: string): void {
    socket.to(opponentId).emit('undoRequested');
  }

  handleUndoResponse(socket: GameSocket, opponentId: string, accepted: boolean): void {
    socket.to(opponentId).emit(accepted ? 'undoAccepted' : 'undoRejected');
  }


  private validateMoveData(moveData: MoveData): boolean {
    return Boolean(
      moveData &&
      moveData.opponentId &&
      moveData.from &&
      moveData.from.row !== undefined &&
      moveData.from.col !== undefined &&
      moveData.to &&
      moveData.to.row !== undefined &&
      moveData.to.col !== undefined &&
      moveData.piece &&
      moveData.piece.type &&
      moveData.piece.color
    );
  }
}