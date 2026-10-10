export const GAME_STATES = {
  WAITING: 'WAITING',
  CHOOSING_WORD: 'CHOOSING_WORD',
  DRAWING: 'DRAWING',
  ROUND_ENDED: 'ROUND_ENDED',
  STARTING_NEW_ROUND: 'STARTING_NEW_ROUND',
  GAME_OVER: 'GAME_OVER',
  ROOM_LOCKED: 'ROOM_LOCKED'
}

export const initialGameState = {
  players: [],           // Array of { playerId, score, hasGuessed, ... }
  gameState: GAME_STATES.WAITING,
  drawerId: null,
  currentRounds: 0,
  totalRounds: 5,        // Default
  timeLeft: 0,
  candidateWords: [],    // Words the drawer can choose from
  word: '',              // The word revealed at the end of a round
  chatMessages: [],      // Array of { senderId, text, type }
  notification: null,     // Drawer left + if wait or start next round
  word: '',
  wordLength: 0, 
}

export function gameReducer(state, action) {
  const { type, payload } = action
  console.log("[REDUCER] Action received:", type, payload)

  switch (type) {
    case 'SYNC_PLAYERS': {
      const nextPlayers = [
        { playerId: payload.myPlayerId, score: 0, hasGuessed: false },
        ...payload.players.map(p => ({
          ...p,
          score: p.score || 0,
          hasGuessed: p.hasGuessed || false
        }))
      ]
      console.log("[REDUCER] SYNC_PLAYERS:", state.players.length, "→", nextPlayers.length)
      return {
        ...state,
        players: nextPlayers
      }
    }

    case 'PLAYER_JOINED': {
      if (state.players.some(p => p.playerId === payload.playerId)) return state
      const nextPlayers = [...state.players, { 
        playerId: payload.playerId, 
        score: 0, 
        hasGuessed: false 
      }]
      console.log("[REDUCER] PLAYER_JOINED:", state.players.length, "→", nextPlayers.length)
      return {
        ...state,
        players: nextPlayers
      }
    }

    case 'PLAYER_LEFT': {
      const nextPlayers = state.players.filter(p => p.playerId !== payload.playerId)
      console.log("[REDUCER] PLAYER_LEFT:", state.players.length, "→", nextPlayers.length)
      return {
        ...state,
        players: nextPlayers
      }
    }

    case 'ROUND_STARTED':
      return {
        ...state,
        currentRounds: payload.round,
        gameState: GAME_STATES.STARTING_NEW_ROUND,
        drawerId: null,
        word: '',
        candidateWords: [],
        notification: null,  // so that the waiting or assigning new drawer message disappears the moment a round starts 
        players: state.players.map(p => ({ ...p, hasGuessed: false }))
      }

    case 'DRAWER_SELECTED':
      return {
        ...state,
        drawerId: payload.drawerId,
        gameState: GAME_STATES.CHOOSING_WORD
      }

    case 'WORD_CHOICE':
      return {
        ...state,
        drawerId: payload.myPlayerId, // The drawer receives this message directly
        candidateWords: payload.words,
        gameState: GAME_STATES.CHOOSING_WORD
      }

    case 'GAME_STARTED':
      return {
        ...state,
        gameState: GAME_STATES.DRAWING
      }

    case 'TIME_TICKING':
      return {
        ...state,
        timeLeft: payload.time
      }

    case 'ROUND_ENDED':
      return {
        ...state,
        gameState: GAME_STATES.ROUND_ENDED,
        word: payload.word,
        chatMessages: [],
        timeLeft: 0
      }

    case 'ROOM_LOCKED':
      return {
        ...state,
        gameState: GAME_STATES.ROOM_LOCKED,
        roomMessage:
          payload?.message ??
          'This room is full and the game has already started. Please join another room.',
      };

    case 'ROOM_WORD':
    return {
        ...state,
        word: payload.word
    };

    case 'ROOM_WORD_LENGTH':
        return {
            ...state,
            wordLength: payload.wordLength
        };

    case 'CORRECT_GUESS':
      return {
        ...state,
        players: state.players.map(p => 
          p.playerId === payload.playerId ? { ...p, hasGuessed: true } : p
        ),
        chatMessages: [...state.chatMessages, {
          senderId: 'System',
          text: `${payload.playerId} guessed correctly!`,
          type: 'correct_guess'
        }]
      }

    case 'GAME_OVER':
    return {
        ...state,
        gameState: GAME_STATES.GAME_OVER,
        players: state.players.map(player => {
            const finalPlayer = payload.score.find(
                score => score.playerId === player.playerId
            )

            return finalPlayer
                ? { ...player, score: finalPlayer.score }
                : player
        })
    }

    case 'CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: [...state.chatMessages, {
          senderId: payload.playerId, 
          text: payload.text,
          type: 'chat'
        }]
      }

    case 'WAITING':
      return {
        ...state,
        gameState: GAME_STATES.WAITING,
        drawerId: null,
        word: '',
        notification: null,
        candidateWords: [],
        players: state.players.map(p => ({ ...p, hasGuessed: false }))
      }

    case 'DRAWER_LEFT_WAITING':
    return {
        ...state,
        gameState: GAME_STATES.WAITING,
        drawerId: null,
        word: '',
        candidateWords: [],
        notification: 'Drawer left. Waiting for players to join...'
    }

    case 'DRAWER_LEFT_NEW_ROUND':
    return {
        ...state,
        // gameState: GAME_STATES.STARTING_NEW_ROUND,
        drawerId: null,
        word: '',
        candidateWords: [],
        notification: 'Drawer left. Starting a new round...'
    }

    case 'RESET_GAME':
      return initialGameState

    default:
      return state

    case 'CURRENT_STATE_SNAPSHOT':
      return {
    ...state,
    gameState: payload.state,
    currentRounds: payload.currentRounds,
    drawerId: payload.drawerId,
    timeLeft: payload.timer
  }
  }
}
