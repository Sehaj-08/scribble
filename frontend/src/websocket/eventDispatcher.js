// This file separates the identification and routing of WebSocket messages
// from the React component lifecycle and the actual state mutations.

import { resetStrokeId, bufferIncomingStroke, clearStrokeBuffer } from './strokeProtocol.js'

// ---------------------------------------------------------
// SMALL HANDLERS
// ---------------------------------------------------------

function handleInitialPlayers(message, dispatch, playerId) {
    const action = { type: 'SYNC_PLAYERS', payload: { players: message.all_connectedPlayers_list, myPlayerId: playerId } }
    console.log("[HANDLER] Dispatching:", action)
    dispatch(action)
}

function handlePlayerJoined(message, dispatch) {
    const action = { type: 'PLAYER_JOINED', payload: { playerId: message.playerId } }
    console.log("[HANDLER] Dispatching:", action)
    dispatch(action)
}

function handlePlayerLeft(message, dispatch) {
    const action = { type: 'PLAYER_LEFT', payload: { playerId: message.player_id } }
    console.log("[HANDLER] Dispatching:", action)
    dispatch(action)
}

function handleRoundStarted(message, dispatch) {
    const action = { type: 'ROUND_STARTED', payload: { round: message.round } }
    console.log("[HANDLER] Dispatching:", action)
    dispatch(action)
    // Reset stroke counter for the new round to keep drawing sync stable
    resetStrokeId()
    // Clear any historical buffer from the previous round just in case
    clearStrokeBuffer()
}

function handleDrawerSelected(message, dispatch) {
    const action = { type: 'DRAWER_SELECTED', payload: { drawerId: message.drawerId } }
    console.log("[HANDLER] Dispatching:", action)
    dispatch(action)
}

function handleWordChoice(message, dispatch, playerId) {
    const action = { type: 'WORD_CHOICE', payload: { words: message.words, myPlayerId: playerId } }
    console.log("[HANDLER] Dispatching:", action)
    dispatch(action)
}

function handleGameStarted(message, dispatch) {
    const action = { type: 'GAME_STARTED' }
    console.log("[HANDLER] Dispatching:", action)
    dispatch(action)
}

function handleTimer(message, dispatch) {
    const action = { type: 'TIME_TICKING', payload: { time: message.time } }
    console.log("[HANDLER] Dispatching:", action)
    dispatch(action)
}

function handleRoundEnded(message, dispatch) {
    const action = { type: 'ROUND_ENDED', payload: { word: message.word } }
    console.log("[HANDLER] Dispatching:", action)
    dispatch(action)
}

function handleRoomLocked(message, dispatch) {
  const action = {
    type: 'ROOM_LOCKED',
    payload: {
      message: message.message,
    },
  };

  console.log('[HANDLER] Dispatching:', action);
  dispatch(action);
}

function handleCorrectGuess(message, dispatch) {
    const action = { type: 'CORRECT_GUESS', payload: { playerId: message.player } }
    console.log("[HANDLER] Dispatching:", action)
    dispatch(action)
}

function handleGameOver(message, dispatch, playerId) {
    const action = { type: 'GAME_OVER', payload: { score: message.score } }
    console.log("[HANDLER] Dispatching:", action)
    dispatch(action)
}

function handleChat(message, dispatch) {
    const action = { type: 'CHAT_MESSAGE', payload: { text: message.text, playerId: message.playerId } }
    console.log("[HANDLER] Dispatching:", action)
    dispatch(action)
}

function handleWaiting(message, dispatch) {
    console.log("[WebSocket Dispatcher] Room is waiting for players.")
    const action = { type: 'WAITING' }
    console.log("[HANDLER] Dispatching:", action)
    dispatch(action)
}



function handleDrawerLeftWaiting(message, dispatch) {
    console.log("[BHADWE WebSocket Dispatcher] Drawer Left lon da boccho.")
    const action = { type: 'DRAWER_LEFT_WAITING'}
    console.log("[HANDLER] Dispatching:", action)
    dispatch(action)
}

function handleDrawerLeftNewRound(message, dispatch) {
    console.log("[WebSocket Dispatcher] Drawer Left lon da boccho.")
    const action = { type: 'DRAWER_LEFT_NEW_ROUND'}
    
    console.log("[HANDLER] ABOUT TO DISPATCH:", action)
    dispatch(action)
    console.log("[HANDLER] DISPATCH FINISHED")

}

function handleCurrentStateSnapshot(message , dispatch){
    console.log("[#######]" , message.state)
    console.log("time" , message.time)
    console.log("drawerid",message.drawerId)
    console.log("rounds",message.currentRounds)
   const action = {type : "CURRENT_STATE_SNAPSHOT" ,        
    payload : {
        state : message.state,
        currentRounds: message.currentRounds,
        drawerId: message.drawerId,
        // drawerId: message.room_drawerId,
        timer: message.timer        
   }}
    dispatch(action)
}



// ---------------------------------------------------------
// DISPATCHER ENTRY POINT
// ---------------------------------------------------------

export function createEventDispatcher(dispatch, playerId) {
    return function handleWebSocketMessage(message) {
        console.log("[DISPATCHER] Received event:", message.type || message.message || 'unknown', message)

        // 0. Handle raw strings (Backend sends some messages as plain strings)
        // if (typeof message === 'string') {
        //     if (message === "Drawer humara kayar tha leave krr gya bitch!!!") {
        //         console.log("[DISPATCHER] Routing → DRAWER_LEFT")
        //         return handleDrawerLeft(message, dispatch)
        //     }
        //     console.warn("[WebSocket Dispatcher] Unknown raw string event:", message)
        //     return
        // }

        // 1. Handle events without a type/message identifier
        if (message.all_connectedPlayers_list) {
            console.log("[DISPATCHER] Routing → SYNC_PLAYERS")
            return handleInitialPlayers(message, dispatch, playerId)
        }

        // 2. Route by `type`
        if (message.type) {
            switch (message.type) {
                case 'stroke_point':
                    console.log("🔥🔥🔥areey bhadwe we have received ths fucking stroke_point message")
                    // Phase 3.5: Send it through the buffer in case Canvas isn't mounted yet
                    bufferIncomingStroke(message)
                    return
                case 'player_joined': 
                    console.log("[DISPATCHER] Routing → PLAYER_JOINED")
                    return handlePlayerJoined(message, dispatch)
                case 'STARTING_NEW_ROUND': 
                    console.log("[DISPATCHER] Routing → ROUND_STARTED")
                    return handleRoundStarted(message, dispatch)
                case 'word_choice': 
                    console.log("[DISPATCHER] Routing → WORD_CHOICE")
                    return handleWordChoice(message, dispatch, playerId)
                case 'time-ticking': 
                    console.log("[DISPATCHER] Routing → TIME_TICKING")
                    return handleTimer(message, dispatch)
                case 'correct_guess': 
                    console.log("[DISPATCHER] Routing → CORRECT_GUESS")
                    return handleCorrectGuess(message, dispatch)
                case 'GAME_OVER': 
                    console.log("[DISPATCHER] Routing → GAME_OVER")
                    return handleGameOver(message, dispatch, playerId)
                case 'chat': 
                    console.log("[DISPATCHER] Routing → CHAT_MESSAGE")
                    return handleChat(message, dispatch)
                case 'current_state_snapshot':
                    console.log("[DISPATCHER] Routing → CURRENT_STATE_SNAPSHOT")
                    return handleCurrentStateSnapshot(message, dispatch)
                // case 'drawer_left':
                //     console.log("[DISPATCHER] Routing → DRAWER_LEFT")
                //     return handleDrawerLeft(message, dispatch)
                case 'drawer_left_waiting':
                    console.log("[DISPATCHER] Routing → DRAWER_LEFT_WAITING")
                    return handleDrawerLeftWaiting(message, dispatch)

                case 'drawer_left_new_round':
                    console.log("[DISPATCHER] Routing → DRAWER_LEFT_NEW_ROUND")
                    return handleDrawerLeftNewRound(message, dispatch)
                case 'ROUND_ENDED': 
                    console.log("[DISPATCHER] Routing → ROUND_ENDED")
                    return handleRoundEnded(message, dispatch)
                case 'ROOM_LOCKED': 
                    console.log("[DISPATCHER] Routing → ROOM_LOCKED")
                    return handleRoomLocked(message, dispatch)
                default:
                    console.warn("[WebSocket Dispatcher] Unknown event type:", message.type, message)
                    return
            }
        }

        // 3. Route by `message` (Legacy backend pattern)
        if (message.message) {
            switch (message.message) {
                case 'Player_left': 
                    console.log("[DISPATCHER] Routing → PLAYER_LEFT")
                    return handlePlayerLeft(message, dispatch)
                case "This is our drawer's Id": 
                    console.log("[DISPATCHER] Routing → DRAWER_SELECTED")
                    return handleDrawerSelected(message, dispatch)
                case 'Game has fucking started': 
                    console.log("[DISPATCHER] Routing → GAME_STARTED")
                    return handleGameStarted(message, dispatch)
                
                case 'Waiting for players to fucking join': 
                    console.log("[DISPATCHER] Routing → WAITING")
                    return handleWaiting(message, dispatch)
                
                
                default:
                    console.warn("[WebSocket Dispatcher] Unknown event message text:", message.message, message)
                    return
            }
        }

        // 4. Fallback for completely unknown object payloads
        console.warn("[WebSocket Dispatcher] Unknown WebSocket payload structure:", message)
    }
}
