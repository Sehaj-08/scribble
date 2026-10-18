import { useEffect, useState } from 'react'
import { useRoom } from '../hooks/useRoom.js'
import * as websocketService from '../websocket/websocketService.js'

/**
 * WHAT: The pre-game Lobby screen.
 * WHY: Confirms that navigation succeeded and that roomId and playerId are
 *      accessible from the shared state without losing values after transition.
 *      It also acts as the session layer that manages the WebSocket connection.
 * STYLE: Skribbl-inspired playful browser game aesthetic matching Home page.
 */
function Lobby() {
  const { roomId, playerId, resetRoom, gameState, navigate } = useRoom()
  const [wsStatus, setWsStatus] = useState('disconnected')
  const [copySuccess, setCopySuccess] = useState('')

  // Derive values for the Lobby UI
  const isGameStarted = gameState.gameState !== 'WAITING'

  // Map players to include isMe property for UI styling
  const lobbyPlayers = gameState.players.map(p => ({
    ...p,
    isMe: p.playerId === playerId
  }))

  useEffect(() => {
    console.log("[LOBBY] Rendering players:", lobbyPlayers)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyPlayers.length]) // Only log when player count changes to avoid spam

  // Navigate to Game view when round starts
  useEffect(() => {
    if (isGameStarted) {
      // Small timeout to allow users to read "Redirecting..."
      const t = setTimeout(() => {
        navigate('game')
      }, 1500)
      return () => clearTimeout(t)
    }
  }, [isGameStarted, navigate])

  // WHAT: Establish WebSocket connection when Lobby mounts.
  useEffect(() => {
    if (!roomId || !playerId) return

    console.log(`[FRONTEND Lobby] useEffect mount. roomId=${roomId}, playerId=${playerId}`)

    websocketService.setStatusCallback((status) => {
      setWsStatus(status)
    })

    // The actual WebSocket message parsing is now centralized in RoomContext.jsx!
    // Connection lifecycle is also centralized in RoomContext.jsx to persist across screens!

    // Cleanup when component unmounts
    return () => {
      console.log(`[FRONTEND Lobby] useEffect unmount cleanup called for roomId=${roomId}, playerId=${playerId}`)
      websocketService.setStatusCallback(null)
    }
  }, [roomId, playerId])

  const handleLeaveRoom = () => {
    // Ensure we close the connection when voluntarily leaving
    websocketService.close()
    resetRoom()
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      setCopySuccess('Copied!')
      setTimeout(() => setCopySuccess(''), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  return (
    <div className="lobby-container">
      {/* Full-viewport Skribbl Doodle Background Wallpaper */}
      <div className="lobby-bg-canvas" aria-hidden="true" />

      <header className="lobby-header">
        <div className="logo-badge">🎮 Game Lobby</div>
        <h1 className="lobby-title">Waiting Room</h1>
        <p className="lobby-subtitle">You have successfully joined the room session!</p>
      </header>

      <div className="lobby-card">
        <div className="session-info-grid">
          <div className="info-box">
            <span className="info-label">Room ID</span>
            <div className="info-value-pill" id="lobby-room-id">
              <span className="room-code-text">{roomId || '—'}</span>
              {roomId && (
                <button 
                  type="button"
                  onClick={handleCopyCode} 
                  className={`copy-code-btn ${copySuccess ? 'copied' : ''}`}
                  title="Copy room code to clipboard"
                >
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
            <span className="info-hint">Share this code with other players</span>
          </div>

          <div className="info-box">
            <span className="info-label">Connection Status</span>
            <div className={`info-value-pill status-pill ${wsStatus === 'open' ? 'status-open' : 'status-secondary'}`}>
              {wsStatus.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="lobby-players-box">
          <span className="info-label">Connected Players: {lobbyPlayers.length}</span>
          <ul className="lobby-player-list">
            {lobbyPlayers.map((p, idx) => (
              <li 
                key={idx} 
                className={`lobby-player-row ${p.isMe ? 'is-me' : ''}`}
              >
                <span className="player-name">👤 {p.playerId}</span>
                {p.isMe && <span className="player-you-badge">You</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className={`lobby-notice ${isGameStarted ? 'game-starting' : 'waiting'}`}>
          <p>
            {isGameStarted ? "🚀 Game Started! Redirecting to game..." : "⏳ Waiting for more players..."}
          </p>
        </div>

        <div className="lobby-actions">
          <button
            id="leave-room-btn"
            type="button"
            className="secondary-btn leave-btn lobby-leave-btn"
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
