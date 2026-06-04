import { describe, expect, it } from 'vitest'

import { createBrandingFormSchema, createInitialBrandingDraft } from './branding-form-schema'

const messages = {
  hexInvalid: 'hex invalid',
  imageUrlInvalid: 'image url invalid',
} as const

describe('branding form schema', () => {
  it('normalizes cleared branding URLs before submit', () => {
    const result = createBrandingFormSchema(messages).safeParse({
      ...createInitialBrandingDraft(),
      logoUrl: '   ',
      cardPattern: '   ',
      cardLogoUrl: '',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.logoUrl).toBeNull()
    expect(result.data.cardPattern).toBeNull()
    expect(result.data.cardLogoUrl).toBeNull()
  })

  it('accepts HTTP(S) and data:image branding URLs', () => {
    const result = createBrandingFormSchema(messages).safeParse({
      ...createInitialBrandingDraft(),
      logoUrl: ' https://cdn.example.com/logo.png ',
      cardLogoUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.logoUrl).toBe('https://cdn.example.com/logo.png')
    expect(result.data.cardLogoUrl).toBe('data:image/svg+xml;base64,PHN2Zy8+')
  })

  it('rejects non-image data URLs and non-HTTP protocols', () => {
    const result = createBrandingFormSchema(messages).safeParse({
      ...createInitialBrandingDraft(),
      logoUrl: 'ftp://cdn.example.com/logo.png',
      cardLogoUrl: 'data:text/html;base64,PHNjcmlwdD4=',
    })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ['logoUrl'], message: 'image url invalid' }),
        expect.objectContaining({ path: ['cardLogoUrl'], message: 'image url invalid' }),
      ]),
    )
  })
})
