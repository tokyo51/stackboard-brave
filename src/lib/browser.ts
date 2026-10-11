// Which Chromium browser runs the extension, for the words on screen ("your Brave bookmarks",
// brave://bookmarks). Brave exposes navigator.brave and a "Brave" UA-CH brand; neither needs a call.

type Nav = Navigator & { brave?: unknown; userAgentData?: { brands?: Array<{ brand: string }> } }

const nav: Nav | undefined = typeof navigator !== 'undefined' ? (navigator as Nav) : undefined

export const IS_BRAVE =
  !!nav?.brave || !!nav?.userAgentData?.brands?.some((b) => b.brand === 'Brave')

export const BROWSER_NAME = IS_BRAVE ? 'Brave' : 'Chrome'

/** brave://bookmarks or chrome://bookmarks */
export const BOOKMARKS_PAGE = `${IS_BRAVE ? 'brave' : 'chrome'}://bookmarks`
