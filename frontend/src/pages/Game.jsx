import { useState, useEffect } from 'react'
import { useRoom } from '../hooks/useRoom.js'
import * as websocketService from '../websocket/websocketService.js'
import Canvas from '../components/Canvas.jsx'

/**
 * WHAT: The main active Game screen.
 * WHY: Renders the centralized game state, Canvas drawing workspace,
 *      player leaderboard, and guess/chat panel.
 * STYLE: Skribbl-inspired playful browser game aesthetic matching Home & Lobby.
 */
function Game() {
  const { gameState: globalState, playerId, resetRoom } = useRoom()
  
  // Destructure the actual state shape from gameReducer.js
  const {
    currentRounds = 0,
    totalRounds = 5,
    timeLeft = 0,
    drawerId = null,
    gameState = 'WAITING',
    word = '',
    wordLength = 0,
    candidateWords = [],
    notification = null,
    roomMessage = '',
    chatMessages = [],
    players = []
  } = globalState || {}

  // Derive if I am the drawer.
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
      <div className="game-container room-locked-container">
        {/* Full-viewport Skribbl Doodle Background Wallpaper */}
        <div className="game-bg-canvas" aria-hidden="true" />
        <main className="game-arena room-locked-arena">
          <div className="state-panel room-locked-card">
            <div className="state-icon">🔒</div>
            <h2 className="room-locked-title">Room is Full</h2>
            <p className="room-locked-msg">
              {roomMessage ||
                'This room is full and the game has already started. Please join another room.'}
            </p>
            <button
              type="button"
              className="secondary-btn leave-btn"
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
      {/* Full-viewport Skribbl Doodle Background Wallpaper */}
      <div className="game-bg-canvas" aria-hidden="true" />

      {/* Temporary notification when drawer leaves */}
      {notification && (
        <div className="game-popup">
          {notification}
        </div>
      )}

      {/* 1. Round Header */}
      <header className="game-header">
        <div className="header-left">
          <div className="header-stat round-stat">
            <span className="stat-label">Round</span>
            <span className="stat-value">
              {currentRounds > 0 ? `${currentRounds} / ${totalRounds}` : '—'}
            </span>
          </div>
        </div>

        <div className="header-center">
          {gameState === 'DRAWING' ? (
            isDrawer || hasGuessed ? (
              <div className="header-word-display is-revealed">
                <span className="word-label">WORD:</span>
                <span className="word-text">{word || 'Loading...'}</span>
              </div>
            ) : wordLength > 0 ? (
              <div className="header-word-display is-blanks">
                <span className="word-label">GUESS THIS:</span>
                <span className="word-blanks">
                  {Array.from({ length: wordLength }, (_, index) => (
                    <span key={index} className="blank-char">_</span>
                  ))}
                </span>
                <span className="word-len-hint">({wordLength})</span>
              </div>
            ) : null
          ) : gameState === 'CHOOSING_WORD' ? (
            <div className="header-status-pill">
              {isDrawer ? '🎨 Pick a word to draw below!' : `⏳ ${drawerId} is choosing a word...`}
            </div>
          ) : gameState === 'ROUND_ENDED' ? (
            <div className="header-status-pill round-ended-pill">
              Round Ended! The word was: <strong>{word || '???'}</strong>
            </div>
          ) : gameState === 'STARTING_NEW_ROUND' ? (
            <div className="header-status-pill">
              Get Ready! Starting the next round...
            </div>
          ) : gameState === 'GAME_OVER' ? (
            <div className="header-status-pill game-over-pill">
              🎉 Game Over!
            </div>
          ) : (
            <div className="header-status-pill">
              Waiting for Players...
            </div>
          )}
        </div>

        <div className="header-right">
          <div className="header-stat timer-stat">
            <span className="stat-label">Time</span>
            <span className="stat-value">
              {timeLeft > 0 ? `${timeLeft}s` : '—'}
            </span>
          </div>
          
          <div className="header-stat drawer-stat">
            <span className="stat-label">Drawer</span>
            <span className="stat-value">
              {!drawerId ? '—' : isDrawer ? 'You' : drawerId}
            </span>
          </div>

          <button
            type="button"
            className="secondary-btn leave-btn header-leave-btn"
            onClick={resetRoom}
            title="Leave game and return home"
          >
            ← Leave
          </button>
        </div>
      </header>

      {/* 2. Main Game Arena - 3-Column Skribbl Layout */}
      <main className="game-arena">
        {/* Left Column: Player Leaderboard */}
        <aside className="game-players-sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">👥 Players</span>
            <span className="player-count-badge">{players.length}</span>
          </div>
          <ul className="game-player-list">
            {[...players]
              .sort((a, b) => (b.score || 0) - (a.score || 0))
              .map((player, index) => {
                const isMe = player.playerId === playerId
                const isCurrentDrawer = player.playerId === drawerId
                return (
                  <li
                    key={player.playerId}
                    className={`game-player-item ${isMe ? 'is-me' : ''} ${isCurrentDrawer ? 'is-drawer' : ''}`}
                  >
                    <div className="player-rank">#{index + 1}</div>
                    <div className="player-details">
                      <div className="player-name-line">
                        <span className="player-name">{player.playerId}</span>
                        {isMe && <span className="player-you-tag">You</span>}
                      </div>
                      <div className="player-status-line">
                        <span className="player-score">{player.score || 0} pts</span>
                        {isCurrentDrawer && (
                          <span className="player-role-badge" title="Currently drawing">✏️ Drawer</span>
                        )}
                        {player.hasGuessed && (
                          <span className="player-guessed-badge" title="Guessed correctly">✓ Guessed</span>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
          </ul>
        </aside>

        {/* Center Column: Drawing Canvas or Active Phase Panel */}
        <section className="game-center-stage">
          {/* State: WAITING */}
          {gameState === 'WAITING' && (
            <div className="state-panel waiting-panel">
              <div className="state-icon">⏳</div>
              <h3>Waiting for Players</h3>
              <p>The game will begin once enough players join.</p>
            </div>
          )}

          {/* State: CHOOSING_WORD */}
          {gameState === 'CHOOSING_WORD' && (
            <div className="state-panel choose-word-panel">
              {isDrawer ? (
                <>
                  <div className="state-icon">🎨</div>
                  <h3>Choose a Word</h3>
                  <p>Select a word to draw!</p>
                  <div className="word-cards-container">
                    {candidateWords && candidateWords.length > 0 ? (
                      candidateWords.map((cand) => (
                        <button 
                          key={cand.wordId}
                          type="button"
                          className="primary-btn word-card"
                          onClick={() => handleWordSelect(cand.wordId)}
                          disabled={isWordSelecting}
                        >
                          {cand.word}
                        </button>
                      ))
                    ) : (
                      <p className="loading-words-text">Loading words...</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="state-icon">⏳</div>
                  <h3>Waiting for Drawer</h3>
                  <p>{drawerId} is choosing a word...</p>
                </>
              )}
            </div>
          )}

          {/* State: DRAWING */}
          {gameState === 'DRAWING' && (
            <div className="state-panel active-round">
              {/* Visible on narrow screens when header word display stacks */}
              <div className="canvas-word-banner">
                {isDrawer || hasGuessed ? (
                  <div className="word-hint">
                    <span className="hint-label">Your word:</span>{' '}
                    <strong className="hint-word">{word || 'Loading...'}</strong>
                  </div>
                ) : wordLength > 0 ? (
                  <div className="word-hint">
                    <span className="hint-label">GUESS THIS</span>
                    <div className="word-blanks-inline">
                      {Array.from({ length: wordLength }, (_, index) => (
                        <span key={index} className="blank-char">_</span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="canvas-wrapper">
                <Canvas isDrawer={isDrawer} />
              </div>
            </div>
          )}

          {/* State: ROUND_ENDED */}
          {gameState === 'ROUND_ENDED' && (
            <div className="state-panel round-ended-panel">
              <div className="state-icon">🏁</div>
              <h3>Round Ended!</h3>
              <p>The word was: <strong className="revealed-word">{word || '???'}</strong></p>
            </div>
          )}

          {/* State: STARTING_NEW_ROUND */}
          {gameState === 'STARTING_NEW_ROUND' && (
            <div className="state-panel starting-round-panel">
              <div className="state-icon">⚡</div>
              <h3>Get Ready!</h3>
              <p>Starting the next round...</p>
            </div>
          )}

          {/* State: GAME_OVER */}
          {gameState === 'GAME_OVER' && (
            <div className="state-panel game-over-panel">
              <div className="state-icon">🏆</div>
              <h3>🎉 Game Over!</h3>
              <p className="game-over-subtitle">Final Scores</p>

              <ul className="game-over-podium-list">
                {[...players]
                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                  .map((player, index) => (
                    <li
                      key={player.playerId}
                      className={`podium-item ${player.playerId === playerId ? 'is-me' : ''}`}
                    >
                      <span className="podium-rank">#{index + 1}</span>{' '}
                      <span className="podium-name">{player.playerId === playerId ? 'You' : player.playerId}</span>
                      <span className="podium-divider"> — </span>
                      <strong className="podium-pts">{player.score || 0} pts</strong>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>

        {/* Right Column: Chat & Guesses */}
        <aside className="game-chat-sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">💬 Chat &amp; Guesses</span>
          </div>

          <div className="chat-panel">
            <div className="chat-messages-container">
              {chatMessages.length === 0 ? (
                <p className="no-chat-text">No activity yet...</p>
              ) : (
                <ul className="chat-messages-list">
                  {chatMessages.map((msg, idx) => (
                    <li 
                      key={idx} 
                      className={`chat-message-item ${msg.type === 'correct_guess' ? 'is-correct-guess' : ''}`}
                    >
                      {msg.type === 'correct_guess' ? (
                        <span className="correct-guess-text">🟢 {msg.text}</span>
                      ) : (
                        <span className="user-guess-text">
                          <strong className="chat-sender">{msg.senderId}:</strong> {msg.text}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Guessing controls for non-drawers */}
            {!isDrawer && gameState === 'DRAWING' ? (
              <form onSubmit={handleGuessSubmit} className="guess-controls">
                <input 
                  type="text" 
                  placeholder={hasGuessed ? "You already guessed it!" : "Type your guess here..."} 
                  value={guessText}
                  maxLength={20}
                  onChange={(e) => setGuessText(e.target.value)}
                  disabled={hasGuessed}
                  className="guess-input"
                  aria-label="Type your guess"
                />
                <button 
                  type="submit" 
                  className="primary-btn guess-submit-btn" 
                  disabled={hasGuessed || !guessText.trim()}
                >
                  Guess
                </button>
              </form>
            ) : isDrawer && gameState === 'DRAWING' ? (
              <div className="chat-drawer-disabled">
                ✏️ You are drawing! Guessing is disabled.
              </div>
            ) : (
              <div className="chat-idle-hint">
                {gameState === 'CHOOSING_WORD' ? 'Word selection in progress...' : 'Game in progress...'}
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Footer / Controls */}
      <footer className="game-footer">
        <button 
          type="button"
          className="secondary-btn leave-btn" 
          onClick={resetRoom}
        >
          ← Leave Game
        </button>
      </footer>
    </div>
  )
}

export default Game
