import { useContext } from 'react'
import { RoomContext } from '../state/roomContextInstance.js'

/**
 * Custom hook to consume the active Room session state and page navigation.
 * 
 * WHAT: Provides access to roomId, playerId, setRoomData, currentPage, navigate, resetRoom.
 * WHY: Decouples components from context consumers and enforces usage within RoomProvider.
 * 
 * @returns {{
 *   roomId: string,
 *   playerId: string,
 *   setRoomData: (data: { roomId: string, playerId: string }) => void,
 *   currentPage: string,
 *   navigate: (page: string) => void,
 *   resetRoom: () => void
 * }}
 */
export function useRoom() {
  const context = useContext(RoomContext)
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider')
  }
  return context
}

export default useRoom
