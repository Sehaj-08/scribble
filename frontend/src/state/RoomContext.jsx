import { useState } from 'react'
import { RoomContext } from './roomContextInstance.js'

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
  }

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  )
}

export default RoomProvider
