import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/test-utils'
import { Calendar } from './calendar'

/**
 * Regression guard for the month-navigation arrows.
 * 1) Arrows must render, be named, and change the visible month.
 * 2) Caption must not steal hits — the full button box (not only the SVG
 *    stroke) is the interactive target (user-detail date picker complaint).
 */
describe('Calendar month navigation', () => {
  it('opens on the selected month and switches months via the nav arrows', async () => {
    const user = userEvent.setup()
    // August 2026 (month index 7).
    renderWithProviders(
      <Calendar mode="single" selected={new Date(2026, 7, 13)} defaultMonth={new Date(2026, 7, 13)} />,
    )

    expect(screen.getByText('August 2026')).toBeInTheDocument()

    // Previous-month arrow → July 2026.
    await user.click(screen.getByRole('button', { name: /previous/i }))
    expect(screen.getByText('July 2026')).toBeInTheDocument()

    // Next-month arrow twice → September 2026.
    const next = screen.getByRole('button', { name: /next/i })
    expect(next.parentElement).toHaveClass('absolute', 'inset-x-0', 'justify-between')
    await user.click(next)
    await user.click(next)
    expect(screen.getByText('September 2026')).toBeInTheDocument()
  })

  it('makes the full nav button the hit target (caption does not capture clicks)', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Calendar mode="single" selected={new Date(2026, 9, 12)} defaultMonth={new Date(2026, 9, 12)} />,
    )

    expect(screen.getByText('October 2026')).toBeInTheDocument()

    const next = screen.getByRole('button', { name: /next/i })
    // Entire 32×32 control is interactive; SVG is non-interactive so edges work.
    expect(next).toHaveClass('pointer-events-auto')
    expect(next.className).toMatch(/\[&_svg\]:pointer-events-none/)
    // Caption layer must not intercept pointer events over the nav row.
    const caption = screen.getByText('October 2026').parentElement
    expect(caption).toHaveClass('pointer-events-none')

    await user.click(next)
    expect(screen.getByText('November 2026')).toBeInTheDocument()
  })
})
