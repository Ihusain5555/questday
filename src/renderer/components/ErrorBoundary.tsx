import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** What failed (e.g. 'QuestDay', 'this view') — woven into the message. */
  label?: string
}
interface State {
  error: Error | null
}

/**
 * Catches render-time crashes so one failing view shows a small recovery card
 * instead of blanking the whole window. There is no crash reporting here, so a
 * silent blank window would be the worst outcome; the saved data is never touched
 * by a render error, so "Try again / Reload" is always safe.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[questday] render error caught by boundary:', error, info.componentStack)
  }

  private reset = (): void => this.setState({ error: null })

  render(): ReactNode {
    if (this.state.error) {
      const where = this.props.label ? ` in ${this.props.label}` : ''
      return (
        <div className="crash-card" role="alert">
          <div className="crash-title">Something went wrong{where}.</div>
          <div className="crash-sub">Your data is safe. Try again, or reload the window.</div>
          <div className="crash-actions">
            <button className="ghost" onClick={this.reset}>
              Try again
            </button>
            <button className="primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
