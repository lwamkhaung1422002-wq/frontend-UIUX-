import { createContext, useContext } from 'react'

export const AppHeaderActionsContext = createContext(() => {})

export const useAppHeaderActions = () => useContext(AppHeaderActionsContext)
