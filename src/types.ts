// src/server/types.ts
import { Socket } from 'socket.io';
import { MoveData, GameState as ClientGameState } from 'notationix';

export interface ServerGameState {
  players: { 
    white: string; 
    black: string 
  };
  currentTurn: 'white' | 'black';
  moveHistory: string[];
  lastMove?: MoveData;
  clientState: ClientGameState; 
}

export interface ServerToClientEvents {
  test: (test: string) => void;
  moveError: (message: string) => void;
  moveMade: (moveData: Omit<MoveData, 'opponentId'>) => void;
  opponentResigned: () => void;
  undoRequested: () => void;
  undoAccepted: () => void;
  undoRejected: () => void;
  opponentDisconnected: () => void;
  queueJoined: (data: { playerName: string }) => void;
  queueLeft: () => void;
  gameStarted: (data: { 
    color: 'white' | 'black'; 
    opponentId: string; 
    gameId: string;
    opponentName: string;
  }) => void;
  gameState: (state: ClientGameState) => void;
  opponentReconnected: (state: ClientGameState) => void;
}

export interface ClientToServerEvents {
  joinQueue: () => void;
  leaveQueue: () => void;
  moveMade: (moveData: MoveData) => void;
  resign: (data: { opponentId: string }) => void;
  undoRequest: (data: { opponentId: string }) => void;
  undoAccepted: (data: { opponentId: string }) => void;
  undoRejected: (data: { opponentId: string }) => void;
  reconnectToGame: (data: {
    gameId: string;
    playerId: string;
    currentGameState: ClientGameState;
  }) => void;
}

export interface GameSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  playerName: string;
}