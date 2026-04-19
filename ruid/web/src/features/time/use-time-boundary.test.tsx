import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTimeBoundary } from '@/features/time/use-time-boundary'

function TimeBoundaryProbe({ boundary }: { readonly boundary: string }): React.ReactElement {
  const now = useTimeBoundary([boundary])
  return <div data-testid="now">{String(now)}</div>
}

describe('useTimeBoundary', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('updates after the next boundary passes', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-17T12:00:00.000Z'))

    render(<TimeBoundaryProbe boundary="2026-04-17T12:05:00.000Z" />)

    expect(screen.getByTestId('now')).toHaveTextContent(String(Date.parse('2026-04-17T12:00:00.000Z')))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1)
    })

    expect(screen.getByTestId('now')).toHaveTextContent(String(Date.parse('2026-04-17T12:05:00.001Z')))
  })
})
