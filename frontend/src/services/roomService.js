// Handles HTTP communication with the backend room endpoints.
// Communicates via the Vite dev proxy or base URL to the Express server.

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || ''

/**
 * Creates a new game room on the backend.
 * 
 * WHAT: Sends a GET request to '/api/rooms/rooms'
 * WHY: The backend registers router.get('/rooms', create_room) under '/api/rooms'.
 *      It generates a new roomId and creator playerId and returns status 201.
 * 
 * @returns {Promise<{ roomId: string, playerId: string }>}
 */
export async function createRoom() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rooms/rooms`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      let errorMessage = `Failed to create room (Status: ${response.status})`
      try {
        const errorData = await response.json()
        if (typeof errorData === 'string') errorMessage = errorData
        else if (errorData?.message) errorMessage = errorData.message
      } catch {
        // Fallback to default message if body is not JSON
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()

    // Validate backend response contract
    if (!data || !data.roomId || !data.playerId) {
      throw new Error('Server returned an unexpected response format when creating the room.')
    }

    return {
      roomId: data.roomId,
      playerId: data.playerId,
    }
  } catch (error) {
    // Distinguish network failures from application errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to the game server. Please make sure the backend is running.')
    }
    throw error
  }
}

/**
 * Joins an existing room on the backend.
 * 
 * WHAT: Sends a POST request to '/api/rooms/join_rooms/:room_id'
 * WHY: The backend registers router.post('/join_rooms/:room_id', join_room) under '/api/rooms'.
 *      It validates if the room exists, generates a new playerId, and returns status 201.
 * 
 * @param {string} roomId - The unique room code to join
 * @returns {Promise<{ roomId: string, playerId: string }>}
 */
export async function joinRoom(roomId) {
  const cleanRoomId = roomId ? roomId.trim().toUpperCase() : ''

  if (!cleanRoomId) {
    throw new Error('Please enter a room ID before joining.')
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/rooms/join_rooms/${encodeURIComponent(cleanRoomId)}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      let errorMessage = 'Failed to join room'
      try {
        const errorData = await response.json()
        if (typeof errorData === 'string') {
          errorMessage = errorData
        } else if (errorData?.message) {
          errorMessage = errorData.message
        }
      } catch {
        // Fallback to text parsing
        try {
          const rawText = await response.text()
          if (rawText) errorMessage = rawText
        } catch {
          // Keep default message
        }
      }

      // Map backend-specific error strings into user-friendly feedback
      if (response.status === 400 || errorMessage.toLowerCase().includes('room no longer exists')) {
        throw new Error(`Room "${cleanRoomId}" does not exist or has already closed.`)
      }

      throw new Error(errorMessage || `Failed to join room (Status: ${response.status})`)
    }

    const data = await response.json()

    // Validate backend response contract
    if (!data || !data.playerId) {
      throw new Error('Server returned an unexpected response format: missing player ID.')
    }

    return {
      roomId: cleanRoomId,
      playerId: data.playerId,
    }
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to the game server. Please make sure the backend is running.')
    }
    throw error
  }
}
