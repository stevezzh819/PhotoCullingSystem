export type ActionType = 'keep' | 'delete'

export interface Action {
  type: ActionType
  index: number
  path: string
}

export type AppScreen = 'welcome' | 'culling' | 'summary'

export type EnterFrom = 'scale' | 'undo-left' | 'undo-right' | 'nav-left' | 'nav-right'
