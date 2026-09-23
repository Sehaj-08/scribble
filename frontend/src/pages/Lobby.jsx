import { useEffect, useState } from 'react'
import { useRoom } from '../hooks/useRoom.js'
import * as websocketService from '../websocket/websocketService.js'

/**
 * WHAT: The pre-game Lobby screen (Phase 1.2 placeholder).
 * WHY: Confirms that navigation succeeded and that roomId and playerId are
 *      accessible from the shared state without losing values after transition.
 *      It also acts as the session layer that manages the WebSocket connection.
 */
function Lobby() {
  const { roomId, playerId, resetRoom } = useRoom()
  const [wsStatus, setWsStatus] = useState('disconnected')

  // WHAT: Establish WebSocket connection when Lobby mounts.
  // WHY: This is the appropriate time to connect since we now have roomId and playerId.
  //      The websocketService handles duplicate protection, so React StrictMode double-invocations are safe.
  useEffect(() => {
    if (!roomId || !playerId) return

    console.log(`[FRONTEND Lobby] useEffect mount. roomId=${roomId}, playerId=${playerId}`)

    websocketService.setStatusCallback((status) => {
      setWsStatus(status)
    })

    websocketService.setMessageCallback((msg) => {
      console.log('Received WebSocket Message in Lobby:', msg)
      // Future: Handle game-specific messages here or in Context
    })

    // Connect to the room
    websocketService.connect(roomId, playerId)

    // Cleanup when component unmounts
    return () => {
      console.log(`[FRONTEND Lobby] useEffect unmount cleanup called for roomId=${roomId}, playerId=${playerId}`)
      websocketService.setStatusCallback(null)
      websocketService.setMessageCallback(null)
      websocketService.close()
    }
  }, [roomId, playerId])

  const handleLeaveRoom = () => {
    // Ensure we close the connection when voluntarily leaving
    websocketService.close()
    resetRoom()
  }

  return (
    <div className="lobby-container">
      <header className="lobby-header">
        <div className="logo-badge">🎮 Game Lobby</div>
        <h1>Waiting Room</h1>
        <p className="lobby-subtitle">You have successfully joined the room session!</p>
      </header>

      <div className="lobby-card">
        <div className="session-info-grid">
          <div className="info-box">
            <span className="info-label">Room ID</span>
            <div className="info-value-pill" id="lobby-room-id">
              {roomId || '—'}
            </div>
            <span className="info-hint">Share this code with other players</span>
          </div>

          <div className="info-box">
            <span className="info-label">Player ID</span>
            <div className="info-value-pill secondary" id="lobby-player-id">
              {playerId || '—'}
            </div>
            <span className="info-hint">Your unique player session identity</span>
          </div>
        </div>

        <div className="info-box" style={{ marginTop: '1rem' }}>
          <span className="info-label">Connection Status</span>
          <div className={`info-value-pill ${wsStatus === 'open' ? 'success' : 'secondary'}`}>
            {wsStatus.toUpperCase()}
          </div>
        </div>

        <div className="lobby-notice">
          <p>
            ℹ️ <strong>Phase 1.4 Complete:</strong> WebSocket connection established.
            Player list synchronization will be activated in the next phase.
          </p>
        </div>

        <div className="lobby-actions">
          <button
            id="leave-room-btn"
            className="secondary-btn leave-btn"
            onClick={handleLeaveRoom}
          >
            ← Leave Room &amp; Return Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default Lobby
