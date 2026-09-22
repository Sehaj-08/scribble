import { RoomProvider } from './state/RoomContext.jsx'
import { useRoom } from './hooks/useRoom.js'
import Home from './pages/Home.jsx'
import Lobby from './pages/Lobby.jsx'
import Game from './pages/Game.jsx'

/**
 * WHAT: Minimal router component switching between views based on active state.
 * WHY: Provides zero-dependency, beginner-friendly view management for Home, Lobby,
 *      and Game screens without adding complex routing libraries.
 */
function AppContent() {
  const { currentPage } = useRoom()

  switch (currentPage) {
    case 'lobby':
      return <Lobby />
    case 'game':
      return <Game />
    case 'home':
    default:
      return <Home />
  }
}

/**
 * WHAT: Root App component.
 * WHY: Injects the global RoomProvider context so room and player state persist across views.
 */
function App() {
  return (
    <RoomProvider>
      <main className="app-main">
        <AppContent />
      </main>
    </RoomProvider>
  )
}

export default App
