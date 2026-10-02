import { useState, useReducer, useEffect, useCallback } from 'react'
import { RoomContext } from './roomContextInstance.js'
import { gameReducer, initialGameState } from './gameReducer.js'
import * as websocketService from '../websocket/websocketService.js'
import { createEventDispatcher } from '../websocket/eventDispatcher.js'
handleWebSocketMessage
/**
 * WHAT: Provider component for managing active room session state (roomId, playerId, currentPage).
 * WHY: Enables persisting roomId and playerId when transitioning between Home, Lobby,
 *      and Game screens without adding third-party state libraries.
 */
export function RoomProvider({ children }) {
  const [roomId, setRoomId] = useState('')
  const [playerId, setPlayerId] = useState('')
  // Minimal routing state for switching between 'home', 'lobby', and 'game' views
  const [currentPage, setCurrentPage] = useState('home')
  
  // Game state
  const [gameState, dispatch] = useReducer(gameReducer, initialGameState)
  
  // Centralized WebSocket Message Handler
  useEffect(() => {
    const handleWebSocketMessage = createEventDispatcher(dispatch, playerId)
    
    websocketService.setMessageCallback((msg) => {
      // Pass the raw parsed message to our new dispatcher
      handleWebSocketMessage(msg)
    })

    return () => {
      // Clear callback on unmount (though RoomProvider usually stays mounted)
      websocketService.setMessageCallback(null)
    }
  }, [playerId]) // Re-bind when playerId changes so we have the correct ID in closure

  // Manage WebSocket connection lifecycle centrally
  useEffect(() => {
    if (roomId && playerId) {
      websocketService.connect(roomId, playerId)
    }

    return () => {
      websocketService.close()
    }
  }, [roomId, playerId])

  // Diagnostic log for state changes
  useEffect(() => {
    console.log("[ROOM CONTEXT] Game state updated:", gameState)
  }, [gameState])

  /**
   * Sets the active room identifier and player identifier
   * @param {{ roomId: string, playerId: string }} data
   */
  const setRoomData = ({ roomId: newRoomId, playerId: newPlayerId }) => {
    setRoomId(newRoomId || '')
    setPlayerId(newPlayerId || '')
    
    if (newRoomId && newPlayerId) {
      sessionStorage.setItem('roomId', newRoomId)
      sessionStorage.setItem('playerId', newPlayerId)
    }
  }

  /**
   * Changes the currently displayed view
   * @param {'home' | 'lobby' | 'game'} page
   */
  const navigate = (page) => {
    setCurrentPage(page)
  }

  /**
   * Clears current session identifiers and navigates back to Home
   */
  const resetRoom = () => {
    setRoomId('')
    setPlayerId('')
    setCurrentPage('home')
    dispatch({ type: 'RESET_GAME' })
    
    //COMMENTING THESE 2 SO THAT WHEN PLAYER WHO LEFT REJOINS GETS THE SAME PLAYER ID !!

    // sessionStorage.removeItem('roomId')
    // sessionStorage.removeItem('playerId')
  }

  const value = {
    roomId,
    playerId,
    setRoomData,
    currentPage,
    navigate,
    resetRoom,
    gameState,
    dispatchGameEvent: dispatch,
  }

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  )
}

export default RoomProvider
