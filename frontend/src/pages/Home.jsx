import { useState, useRef } from 'react'
import { createRoom, joinRoom } from '../services/roomService.js'
import { useRoom } from '../hooks/useRoom.js'

/**
 * WHAT: The Home screen / landing page for players to create or join a game room.
 * WHY: Serves as the starting point, coordinating room creation, room joining,
 *      input validation, loading feedback, and navigation to the Lobby.
 * STYLE: Skribbl-inspired playful browser game aesthetic.
 */
function Home() {
  const { setRoomData, navigate } = useRoom()

  const [roomIdInput, setRoomIdInput] = useState('')
  const [loadingAction, setLoadingAction] = useState(null) // 'create' | 'join' | null
  const [errorMessage, setErrorMessage] = useState('')

  // Ref-based lock to prevent rapid double-clicks bypassing async state updates
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
   * WHY: Triggers roomService.createRoom(), stores returned roomId & playerId,
   *      and navigates to the Lobby screen.
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
   * WHY: Validates input, triggers roomService.joinRoom(roomId),
   *      stores roomId & playerId, and navigates to the Lobby.
   */
  const handleJoinRoom = async (e) => {
    if (e) e.preventDefault()
    if (isBusy || isActionLocked.current) return
    isActionLocked.current = true

    const trimmedId = roomIdInput.trim().toUpperCase()

    // Client-side validation for empty room code
    if (!trimmedId) {
      setErrorMessage('Please enter a valid Room ID to join.')
      isActionLocked.current = false
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
      {/* Full-viewport Skribbl Doodle Background Wallpaper */}
      <div className="home-bg-canvas" aria-hidden="true" />

      {/* Playful Game Branding / Header */}
      <header className="home-header">
        <div className="home-logo-wrap">
          <h1 className="skribbl-logo" aria-label="Scribble">
            <span className="logo-letter l-1">S</span>
            <span className="logo-letter l-2">c</span>
            <span className="logo-letter l-3">r</span>
            <span className="logo-letter l-4">i</span>
            <span className="logo-letter l-5">b</span>
            <span className="logo-letter l-6">b</span>
            <span className="logo-letter l-7">l</span>
            <span className="logo-letter l-8">e</span>
            <span className="logo-pencil" aria-hidden="true">✏️</span>
          </h1>
          <p className="skribbl-tagline">Multiplayer Drawing &amp; Guessing Game</p>
        </div>
      </header>

      {/* Main Action Panel */}
      <div className="home-card">
        {errorMessage && (
          <div className="error-alert" role="alert" id="home-error-banner">
            <span className="error-icon" aria-hidden="true">⚠️</span>
            <span className="error-text">{errorMessage}</span>
          </div>
        )}

        {/* Create Room Section - Primary Action */}
        <section className="action-section create-section">
          <button
            id="create-room-btn"
            type="button"
            className="primary-btn create-btn"
            onClick={handleCreateRoom}
            disabled={isBusy}
          >
            {loadingAction === 'create' ? (
              <span className="btn-content">
                <span className="spinner" aria-hidden="true" />
                <span>Creating Room...</span>
              </span>
            ) : (
              <span className="btn-content">
                <span className="btn-icon plus-icon" aria-hidden="true">+</span>
                <span>Create Room</span>
              </span>
            )}
          </button>
        </section>

        {/* Visual Divider */}
        <div className="divider" role="separator">
          <span>OR</span>
        </div>

        {/* Join Room Section - Secondary Action */}
        <section className="action-section join-section">
          <form className="join-form" onSubmit={handleJoinRoom} noValidate>
            <div className="input-group">
              <label htmlFor="room-id-input" className="sr-only">Room Code</label>
              <input
                id="room-id-input"
                type="text"
                className="room-input"
                placeholder="Enter room code"
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
                    <span className="spinner" aria-hidden="true" />
                    <span>Joining...</span>
                  </span>
                ) : (
                  <span className="btn-content">
                    <span className="btn-icon" aria-hidden="true">🚀</span>
                    <span>Join Room</span>
                  </span>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Compact Footer Note */}
        <footer className="home-card-footer">
          <span>Instant Play &bull; No Login Required</span>
        </footer>
      </div>
    </div>
  )
}

export default Home