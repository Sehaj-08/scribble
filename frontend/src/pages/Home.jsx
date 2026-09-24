import { useState, useRef } from 'react'
import { createRoom, joinRoom } from '../services/roomService.js'
import { useRoom } from '../hooks/useRoom.js'

/**
 * WHAT: The Home screen / landing page for players to create or join a game room.
 * WHY: Serves as the starting point (Phase 1.2), coordinating room creation,
 *      room joining, input validation, loading feedback, and navigation to Lobby.
 */
function Home() {
  const { setRoomData, navigate } = useRoom()

  const [roomIdInput, setRoomIdInput] = useState('')
  const [loadingAction, setLoadingAction] = useState(null) // 'create' | 'join' | null
  const [errorMessage, setErrorMessage] = useState('')

  // Add a ref-based lock to prevent double-clicks bypassing async state updates
  const isActionLocked = useRef(false)

  const isBusy = loadingAction !== null

  /**
   * Clears existing error message when the user begins typing.
   */
  const handleInputChange = (e) => {
    setRoomIdInput(e.target.value.toUpperCase())
    if (errorMessage) {
      setErrorMessage('')
    }
  }

  /**
   * WHAT: Handles clicking the "Create Room" button.
   * WHY: Triggers GET /api/rooms/rooms, stores returned roomId & playerId,
   *      and redirects to the Lobby screen.
   */
  const handleCreateRoom = async () => {
    if (isBusy || isActionLocked.current) return
    isActionLocked.current = true

    setErrorMessage('')
    setLoadingAction('create')

    try {
      const room = await createRoom()
      // Store session data and transition to Lobby
      setRoomData({ roomId: room.roomId, playerId: room.playerId })
      navigate('lobby')
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create room. Please try again.')
    } finally {
      setLoadingAction(null)
      isActionLocked.current = false
    }
  }

  /**
   * WHAT: Handles clicking the "Join Room" button or pressing Enter.
   * WHY: Validates input, triggers POST /api/rooms/join_rooms/:room_id,
   *      stores roomId & playerId, and redirects to Lobby.
   */
  const handleJoinRoom = async (e) => {
    if (e) e.preventDefault()
    if (isBusy || isActionLocked.current) return
    isActionLocked.current = true

    const trimmedId = roomIdInput.trim().toUpperCase()

    // Client-side validation for empty room code
    if (!trimmedId) {
      setErrorMessage('Please enter a valid Room ID to join.')
      return
    }

    setErrorMessage('')
    setLoadingAction('join')

    const savedRoomId = sessionStorage.getItem('roomId')
    const savedPlayerId = sessionStorage.getItem('playerId')
    let reconnectPlayerId = null
    if (savedRoomId === trimmedId && savedPlayerId) {
      reconnectPlayerId = savedPlayerId
    }

    try {
      const room = await joinRoom(trimmedId, reconnectPlayerId)
      // Store session data and transition to Lobby
      setRoomData({ roomId: room.roomId, playerId: room.playerId })
      navigate('lobby')
    } catch (err) {
      if (err.message === 'STALE_PLAYER_ID') {
        sessionStorage.removeItem('playerId')
        setErrorMessage('Your previous session in this room expired. Please click Join Room again to enter as a new player.')
        return
      }
      setErrorMessage(err.message || 'Unable to join room. Please check the ID and try again.')
    } finally {
      setLoadingAction(null)
      isActionLocked.current = false
    }
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="logo-badge">✏️ Draw &amp; Guess</div>
        <h1 className="game-title">Scribble</h1>
        <p className="game-subtitle">Play real-time multiplayer drawing and guessing with friends!</p>
      </header>

      {errorMessage && (
        <div className="error-alert" role="alert" id="home-error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{errorMessage}</span>
        </div>
      )}

      <div className="home-card">
        {/* Create Room Section */}
        <section className="action-section create-section">
          <h2>Host a New Game</h2>
          <p className="section-desc">Create a private room and invite your friends to join.</p>
          <button
            id="create-room-btn"
            className="primary-btn create-btn"
            onClick={handleCreateRoom}
            disabled={isBusy}
          >
            {loadingAction === 'create' ? (
              <span className="btn-content">
                <span className="spinner" aria-hidden="true"></span>
                Creating Room...
              </span>
            ) : (
              <span className="btn-content">
                <span>➕</span> Create Room
              </span>
            )}
          </button>
        </section>

        <div className="divider">
          <span>OR</span>
        </div>

        {/* Join Room Section */}
        <section className="action-section join-section">
          <h2>Join Existing Game</h2>
          <p className="section-desc">Have a room code? Enter it below to join the match.</p>
          
          <form className="join-form" onSubmit={handleJoinRoom}>
            <div className="input-group">
              <label htmlFor="room-id-input" className="sr-only">Room ID</label>
              <input
                id="room-id-input"
                type="text"
                className="room-input"
                placeholder="Enter 5-character Room ID"
                value={roomIdInput}
                onChange={handleInputChange}
                disabled={isBusy}
                maxLength={10}
                autoComplete="off"
                spellCheck="false"
              />
              <button
                id="join-room-btn"
                type="submit"
                className="secondary-btn join-btn"
                disabled={isBusy}
              >
                {loadingAction === 'join' ? (
                  <span className="btn-content">
                    <span className="spinner" aria-hidden="true"></span>
                    Joining...
                  </span>
                ) : (
                  <span className="btn-content">
                    <span>🚀</span> Join Room
                  </span>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

export default Home
