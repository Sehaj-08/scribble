import { createContext } from 'react'

/**
 * Context instance definition for Room session state.
 * Separated into a non-component file to comply with React Fast Refresh rules.
 */
export const RoomContext = createContext(null)
