/**
 * Lazy-loaded i18n feature bundle: advertising
 *
 * Re-exports per-language modules so Vite can split each language into
 * its own chunk; only the active language ships when the feature loads.
 *
 * Contains namespaces: advertisingPage.
 */

import { ru } from './advertising.ru'
import { en } from './advertising.en'

export const advertising = { ru, en } as const
