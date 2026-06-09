import type { Difficulty, Priority, Skippability } from '@shared/types'

export const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard']
export const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Critical']
export const SKIPPABILITIES: Skippability[] = ['Must do', 'Should do', 'Nice to have']

export const PRIORITY_COLOR: Record<Priority, string> = {
  Low: '#6b7280',
  Medium: '#3b82f6',
  High: '#f59e0b',
  Critical: '#ef4444'
}

export const SKIPPABILITY_COLOR: Record<Skippability, string> = {
  'Must do': '#ef4444',
  'Should do': '#f59e0b',
  'Nice to have': '#6b7280'
}
