import type { Difficulty, Importance, Urgency } from '@shared/types'

export const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard']
export const IMPORTANCES: Importance[] = ['Low', 'Medium', 'High']
export const URGENCIES: Urgency[] = ['Low', 'Medium', 'High']

export const IMPORTANCE_COLOR: Record<Importance, string> = {
  Low: '#6b7280',
  Medium: '#f59e0b',
  High: '#ef4444'
}

export const URGENCY_COLOR: Record<Urgency, string> = {
  Low: '#6b7280',
  Medium: '#f59e0b',
  High: '#3b82f6'
}
