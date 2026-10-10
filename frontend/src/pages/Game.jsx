import { useState, useEffect } from 'react'
import { useRoom } from '../hooks/useRoom.js'
import * as websocketService from '../websocket/websocketService.js'
import Canvas from '../components/Canvas.jsx'
/**
 * WHAT: The main active Game screen (Phase 2.3).
 * WHY: Renders the centralized game state and controls visibility based on the current state.
 */
function Game() {
  const { gameState: globalState, playerId, resetRoom } = useRoom()
  
  // Destructure the actual state shape from gameReducer.js
  const {
    currentRounds,
    totalRounds,
    timeLeft,
    drawerId,
    gameState,
    word,
    candidateWords,
    notification,
    roomMessage,
    chatMessages,
    players // Optional: can be used to show scores
  } = globalState

  // Derive if I am the drawer. 
  // No need to create a duplicate `isDrawer` state in the reducer.
  const isDrawer = playerId === drawerId
  const localPlayer = players.find(p => p.playerId === playerId)
  const hasGuessed = localPlayer ? localPlayer.hasGuessed : false
  const [isWordSelecting, setIsWordSelecting] = useState(false)
  const [guessText, setGuessText] = useState('')

  // Reset selection state when the phase changes
  useEffect(() => {
    if (gameState !== 'CHOOSING_WORD') {
      setIsWordSelecting(false)
    }
  }, [gameState])

  const handleWordSelect = (wordId) => {
    if (isWordSelecting) return
    setIsWordSelecting(true)
    
    websocketService.send({
      type: "choose_word",
      wordId: wordId
    })
  }

  const handleGuessSubmit = (e) => {
    e.preventDefault()
    const cleanedGuess = guessText.trim()
    if (!cleanedGuess) return

    websocketService.send({
      type: "guess",
      text: cleanedGuess
    })
    setGuessText('')
  }

console.log('[GAME] gameState:', gameState)
console.log('[GAME] notification:', notification)
console.log('[GAME] drawerId:', drawerId)
// Show a separate screen when the room is locked
if (gameState === 'ROOM_LOCKED') {
  return (
    <div className="game-container">
      <main className="game-arena">
        <div className="state-panel">
          <h2>🔒 Room is Full</h2>

          <p>
            {roomMessage ||
              'This room is full and the game has already started. Please join another room.'}
          </p>

          <button
            className="secondary-btn"
            onClick={resetRoom}
          >
            ← Back to Home
          </button>
        </div>
      </main>
    </div>
  )
}
  return (
    <div className="game-container">
      {/* Temporary notification when drawer leaves*/}
    {notification && (
      <div className="game-popup">
        {notification}
      </div>
    )}
      {/* 1. Round Header */}
      <header className="game-header">
        <div className="header-stat">
          <span className="stat-label">Round</span>
          <span className="stat-value">
            {currentRounds > 0 ? `${currentRounds} / ${totalRounds}` : '—'}
          </span>
        </div>
        
        <div className="header-stat timer-stat">
          <span className="stat-label">Time</span>
          <span className="stat-value">
            {timeLeft > 0 ? timeLeft : '—'}
          </span>
        </div>
        
        <div className="header-stat">
          <span className="stat-label">Drawer</span>
          <span className="stat-value">
            {!drawerId ? '—' : isDrawer ? 'You' : drawerId}
          </span>
        </div>
      </header>

      {/* 2. Main Game Arena - State-based UI */}
      <main className="game-arena">
        
        {/* State: WAITING */}
        {gameState === 'WAITING' && (
          <div className="state-panel">
            <h3>Waiting for Players</h3>
            <p>The game will begin once enough players join.</p>
          </div>
        )}

        {/* State: CHOOSING_WORD */}
        {gameState === 'CHOOSING_WORD' && (
          <div className="state-panel">
            {isDrawer ? (
              <>
                <h3>Choose a Word</h3>
                <p>Select a word to draw!</p>
                <div className="word-cards-container" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                  {candidateWords && candidateWords.length > 0 ? (
                    candidateWords.map((cand) => (
                      <button 
                        key={cand.wordId}
                        className="primary-btn word-card"
                        onClick={() => handleWordSelect(cand.wordId)}
                        disabled={isWordSelecting}
                        style={{ padding: '1rem 1.5rem', fontSize: '1.1rem', cursor: isWordSelecting ? 'not-allowed' : 'pointer' }}
                      >
                        {cand.word}
                      </button>
                    ))
                  ) : (
                    <p>Loading words...</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <h3>Waiting for Drawer</h3>
                <p>{drawerId} is choosing a word...</p>
              </>
            )}
          </div>
        )}

        {/* State: DRAWING */}
        {gameState === 'DRAWING' && (
          <div className="state-panel active-round">
            <Canvas isDrawer={isDrawer} />
            
            {/* Phase 2.5: Guessing controls for non-drawers */}
            {!isDrawer && ( 
              <form onSubmit={handleGuessSubmit} className="guess-controls" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', width: '100%', maxWidth: '400px', margin: '1rem auto 0' }}>
                <input 
                  type="text" 
                  placeholder={hasGuessed ? "You already guessed it!" : "Type your guess here..."} 
                  value={guessText}
                  maxLength={20}
                  onChange={(e) => setGuessText(e.target.value)}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                  disabled={hasGuessed}
                />
                <button type="submit" className="primary-btn" disabled={hasGuessed}>Guess</button>
              </form>
            )}
          </div>
        )}

        {/* State: ROUND_ENDED */}
        {gameState === 'ROUND_ENDED' && (
          <div className="state-panel">
            <h3>Round Ended!</h3>
            <p>The word was: <strong>{word || '???'}</strong></p>
          </div>
        )}

        {/* State: STARTING_NEW_ROUND */}
        {gameState === 'STARTING_NEW_ROUND' && (
          <div className="state-panel">
            <h3>Get Ready!</h3>
            <p>Starting the next round...</p>
          </div>
        )}
        {/* State: GAME_OVER */}
{gameState === 'GAME_OVER' && (
  <div className="state-panel">
    <h3>🎉 Game Over!</h3>
    <p>Final Scores</p>

    <ul style={{ listStyle: 'none', padding: 0 }}>
      {[...players]
        .sort((a, b) => b.score - a.score)
        .map((player, index) => (
          <li
            key={player.playerId}
            style={{
              fontSize: '1.1rem',
              margin: '0.5rem 0'
            }}
          >
            <strong>#{index + 1}</strong>{' '}
            {player.playerId === playerId ? 'You' : player.playerId}
            {' — '}
            {player.score} pts
          </li>
        ))}
    </ul>
  </div>
)}

        {/* Chat / Event Log */}
        <div className="chat-panel" style={{ marginTop: '2rem', textAlign: 'left', borderTop: '1px solid #ccc', paddingTop: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
          <h4>Chat & Guesses</h4>
          {chatMessages.length === 0 && <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem' }}>No activity yet...</p>}
          <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {chatMessages.map((msg, idx) => (
              <li key={idx} style={{ 
                padding: '4px 8px',
                borderRadius: '4px',
                background: msg.type === 'correct_guess' ? '#ecfdf5' : 'transparent',
                color: msg.type === 'correct_guess' ? '#065f46' : 'inherit',
                fontWeight: msg.type === 'correct_guess' ? 'bold' : 'normal'
              }}>
                {msg.type === 'correct_guess' ? (
                  <span>🟢 {msg.text}</span>
                ) : (
                  <span><strong>{msg.senderId}:</strong> {msg.text}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Footer / Controls */}
      <footer className="game-footer">
        <button className="secondary-btn leave-btn" onClick={resetRoom}>
          ← Leave Game
        </button>
      </footer>
    </div>
  )
}

export default Game
