import { useState, useEffect } from 'react'
import { useRoom } from '../hooks/useRoom.js'
import * as websocketService from '../websocket/websocketService.js'
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
    players // Optional: can be used to show scores
  } = globalState

  // Derive if I am the drawer. 
  // No need to create a duplicate `isDrawer` state in the reducer.
  const isDrawer = playerId === drawerId
  const [isWordSelecting, setIsWordSelecting] = useState(false)

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

console.log('[GAME] gameState:', gameState)
console.log('[GAME] notification:', notification)
console.log('[GAME] drawerId:', drawerId)
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
            <div className="canvas-placeholder">
              {isDrawer ? '🎨 You are drawing! (Canvas coming soon)' : '👀 Watch the drawing! (Canvas coming soon)'}
            </div>
            
            {/* Invalid Control Prevention: We only show guessing controls to non-drawers */}
            {!isDrawer && ( 
              <div className="guess-controls-placeholder">
                <input type="text" placeholder="Type your guess here..." disabled={true} />
                <button disabled={true}>Guess</button>
              </div>
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
