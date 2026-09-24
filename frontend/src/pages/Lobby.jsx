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
  const [players, setPlayers] = useState([{ playerId, isMe: true }])
  const [gameStarted, setGameStarted] = useState(false)
  const [copySuccess, setCopySuccess] = useState('')

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
      
      // Initial list of other players
      if (msg.all_connectedPlayers_list) {
        setPlayers(prev => {
          const currentMe = prev.find(p => p.isMe)
          const others = msg.all_connectedPlayers_list.map(p => ({
            playerId: p.playerId,
            isMe: false
          }))
          return [currentMe, ...others].filter(Boolean)
        })
      }

      // New player joined
      if (msg.type === 'player_joined') {
        setPlayers(prev => {
          // Avoid duplicates
          if (prev.some(p => p.playerId === msg.playerId)) return prev
          return [...prev, { playerId: msg.playerId, isMe: false }]
        })
      }

      // Player left
      if (msg.message === 'Player_left') {
        setPlayers(prev => prev.filter(p => p.playerId !== msg.player_id))
      }

      // Game start detection
      if (msg.type === 'round_started' || msg.message === 'Game has fucking started') {
        setGameStarted(true)
      }
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
      <header className="lobby-header">
        <div className="logo-badge">🎮 Game Lobby</div>
        <h1>Waiting Room</h1>
        <p className="lobby-subtitle">You have successfully joined the room session!</p>
      </header>

      <div className="lobby-card">
        <div className="session-info-grid">
          <div className="info-box">
            <span className="info-label">Room ID</span>
            <div className="info-value-pill" id="lobby-room-id" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
              {roomId || '—'}
              {roomId && (
                <button 
                  onClick={handleCopyCode} 
                  style={{ background: 'transparent', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', fontSize: '0.8rem' }}
                >
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
            <span className="info-hint">Share this code with other players</span>
          </div>

          <div className="info-box">
            <span className="info-label">Connection Status</span>
            <div className={`info-value-pill ${wsStatus === 'open' ? 'success' : 'secondary'}`}>
              {wsStatus.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="info-box" style={{ marginTop: '1.5rem', textAlign: 'left' }}>
          <span className="info-label">Connected Players: {players.length}</span>
          <ul style={{ listStyleType: 'none', padding: 0, marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {players.map((p, idx) => (
              <li 
                key={idx} 
                style={{ 
                  padding: '0.75rem 1rem', 
                  background: p.isMe ? '#eef2ff' : '#f8f9fa', 
                  border: p.isMe ? '1px solid #c7d2fe' : '1px solid #e9ecef',
                  borderRadius: '6px',
                  fontWeight: '500',
                  color: p.isMe ? '#4338ca' : '#495057',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>👤 {p.playerId}</span>
                {p.isMe && <span style={{ fontSize: '0.85rem', background: '#4338ca', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>You</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="lobby-notice" style={{ marginTop: '1.5rem', background: gameStarted ? '#ecfdf5' : '#fffbeb', borderLeft: gameStarted ? '4px solid #10b981' : '4px solid #f59e0b' }}>
          <p style={{ margin: 0, fontWeight: '500', color: gameStarted ? '#065f46' : '#92400e' }}>
            {gameStarted ? "🚀 Game Started! Redirecting to game..." : "⏳ Waiting for more players..."}
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
