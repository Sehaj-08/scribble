export const GAME_STATES = {
  WAITING: 'WAITING',
  CHOOSING_WORD: 'CHOOSING_WORD',
  DRAWING: 'DRAWING',
  ROUND_ENDED: 'ROUND_ENDED',
  STARTING_NEW_ROUND: 'STARTING_NEW_ROUND'
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
  notification: null     // Drawer left + if wait or start next round 
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
        word: payload.word
      }

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

    case 'SCORE_UPDATE':
      return {
        ...state,
        // The backend currently only sends the score for the current player
        players: state.players.map(p => 
          p.playerId === payload.myPlayerId ? { ...p, score: payload.score } : p
        )
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
