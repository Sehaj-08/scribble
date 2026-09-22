import { useRoom } from '../hooks/useRoom.js'

/**
 * WHAT: The pre-game Lobby screen (Phase 1.2 placeholder).
 * WHY: Confirms that navigation succeeded and that roomId and playerId are
 *      accessible from the shared state without losing values after transition.
 */
function Lobby() {
  const { roomId, playerId, resetRoom } = useRoom()

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

        <div className="lobby-notice">
          <p>
            ℹ️ <strong>Phase 1.2 Complete:</strong> HTTP room creation &amp; join established.
            WebSocket connection and player list synchronization will be activated in the next phase.
          </p>
        </div>

        <div className="lobby-actions">
          <button
            id="leave-room-btn"
            className="secondary-btn leave-btn"
            onClick={resetRoom}
          >
            ← Leave Room &amp; Return Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default Lobby
