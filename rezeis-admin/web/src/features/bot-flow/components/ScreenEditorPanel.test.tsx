import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/test-utils'
import { ScreenEditorPanel } from './ScreenEditorPanel'
import type { BotFlowScreen } from '../types'

describe('ScreenEditorPanel accessibility', () => {
  it('makes the media upload control keyboard-operable and named', () => {
    renderWithProviders(<ScreenEditorPanel screen={screenFixture()} flowName="default" />)

    expect(screen.getByRole('button', { name: 'Choose screen media file' })).toBeInTheDocument()
    expect(screen.getByLabelText('Choose screen media file', { selector: 'input' })).toBeInTheDocument()
  })

  it('names the icon-only media remove action', () => {
    renderWithProviders(
      <ScreenEditorPanel
        screen={screenFixture({ mediaType: 'PHOTO', mediaUrl: 'https://cdn.example.com/screen.png' })}
        flowName="default"
      />,
    )

    expect(screen.getByRole('button', { name: 'Remove screen media' })).toBeInTheDocument()
  })
})

function screenFixture(overrides: Partial<BotFlowScreen> = {}): BotFlowScreen {
  return {
    id: 'screen-1',
    shortId: 'A1',
    flowId: 'flow-1',
    name: 'start',
    textRu: 'Privet',
    textEn: 'Hello',
    parseMode: 'HTML',
    mediaType: null,
    mediaFileId: null,
    mediaUrl: null,
    positionX: 0,
    positionY: 0,
    isRoot: true,
    buttons: [],
    ...overrides,
  }
}
