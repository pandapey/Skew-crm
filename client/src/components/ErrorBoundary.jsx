import { Component } from 'react'
import { ServerError } from '@/pages/error/ErrorPage'

export class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {

    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) return <ServerError />
    return this.props.children
  }
}
