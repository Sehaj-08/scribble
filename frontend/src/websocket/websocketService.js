// WHAT: Centralized WebSocket connection manager.
// WHY: Ensures only ONE connection exists per session, preventing duplicate sockets
//      from React re-renders, StrictMode, or component remounts.

const WS_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_BASE_URL) 
  || 'ws://localhost:3000'

let socket = null
let currentRoomId = null
let currentPlayerId = null
let connCounter = 0

// Callbacks for React to listen to state changes and messages
let statusCallback = null
let messageCallback = null

/**
 * Builds the dynamic WebSocket URL safely.
 * 
 * WHAT: Constructs the full URL with query parameters.
 * WHY: The backend expects roomId and playerId as query params to authenticate the session.
 */
function buildWebSocketUrl(roomId, playerId) {
    const url = new URL(WS_BASE_URL)
    url.searchParams.append('roomId', roomId)
    url.searchParams.append('playerId', playerId)
    return url.toString()
}

/**
 * Connects to the WebSocket server.
 */
export function connect(roomId, playerId) {
    // WHAT: Duplicate connection protection.
    // WHY: If React remounts (e.g., StrictMode) with the same IDs, we don't want to create
    //      a new socket and abandon the old one. We just reuse the existing one.
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        if (currentRoomId === roomId && currentPlayerId === playerId) {
            console.log(`[FRONTEND websocketService] connect() called. Socket #${socket.connId} already connected/connecting. Skipping.`)
            return
        } else {
            // Different session, close the old one safely
            close()
        }
    }

    currentRoomId = roomId
    currentPlayerId = playerId

    connCounter++
    const wsUrl = buildWebSocketUrl(roomId, playerId)
    
    // WHAT: Native browser WebSocket creation.
    // WHY: We don't need Socket.IO; native WS is sufficient and supported by the backend.
    const newSocket = new WebSocket(wsUrl)
    newSocket.connId = connCounter
    console.log(`[FRONTEND websocketService] connect() creating socket #${newSocket.connId} for roomId=${roomId}, playerId=${playerId}`)
    
    socket = newSocket // Assign to module-level variable

    if (statusCallback) statusCallback('connecting')

    newSocket.onopen = () => {
        const isCurrent = (socket === newSocket)
        console.log(`[FRONTEND websocketService] Socket #${newSocket.connId} onopen. isCurrent=${isCurrent}`)
        if (!isCurrent) return // Ignore events from stale sockets
        if (statusCallback) statusCallback('open')
    }

    newSocket.onclose = (event) => {
        const isCurrent = (socket === newSocket)
        console.log(`[FRONTEND websocketService] Socket #${newSocket.connId} onclose. code=${event.code}, reason='${event.reason}', isCurrent=${isCurrent}`)
        if (!isCurrent) return // Ignore events from stale sockets
        if (statusCallback) statusCallback('closed')
        socket = null
    }

    newSocket.onerror = (error) => {
        const isCurrent = (socket === newSocket)
        console.log(`[FRONTEND websocketService] Socket #${newSocket.connId} onerror. isCurrent=${isCurrent}`)
        if (!isCurrent) return // Ignore events from stale sockets
        if (statusCallback) statusCallback('error')
    }

    // WHAT: Centralized message parsing.
    // WHY: Handles malformed JSON gracefully in one place, preventing the app from crashing.
    newSocket.onmessage = (event) => {
        if (socket !== newSocket) return // Ignore events from stale sockets
        try {
            const message = JSON.parse(event.data)
            if (messageCallback) {
                messageCallback(message)
            }
        } catch (err) {
            console.error('Failed to parse incoming WebSocket message:', err)
        }
    }
}

/**
 * Sends a message to the backend.
 */
export function send(messageObject) {
    // WHAT: Reusable send mechanism.
    // WHY: Ensures we only send if the socket is open and handles JSON stringification centrally.
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn('Cannot send message: WebSocket is not open.')
        return
    }
    
    try {
        socket.send(JSON.stringify(messageObject))
    } catch (err) {
        console.error('Failed to send WebSocket message:', err)
    }
}

/**
 * Closes the WebSocket connection safely.
 */
export function close() {
    // WHAT: Safe cleanup of the connection.
    // WHY: Needed when the user leaves the room or unmounts the session layer to free up resources.
    if (socket) {
        console.log(`[FRONTEND websocketService] close() called. Closing socket #${socket.connId}`)
        socket.close()
        socket = null
        currentRoomId = null
        currentPlayerId = null
        if (statusCallback) statusCallback('closed')
    }
}

/**
 * Registers a callback for connection status updates.
 */
export function setStatusCallback(callback) {
    statusCallback = callback
    // Immediately report current status if a socket exists
    if (socket && typeof callback === 'function') {
        if (socket.readyState === WebSocket.CONNECTING) callback('connecting')
        else if (socket.readyState === WebSocket.OPEN) callback('open')
        else if (socket.readyState === WebSocket.CLOSING || socket.readyState === WebSocket.CLOSED) callback('closed')
    }
}

/**
 * Registers a callback for incoming parsed messages.
 */
export function setMessageCallback(callback) {
    messageCallback = callback
}
