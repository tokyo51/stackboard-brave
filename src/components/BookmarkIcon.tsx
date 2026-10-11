import { useEffect, useState } from 'react'
import { faviconUrl, monogram, peekFavicon, resolveFavicon, type ResolvedIcon } from '../lib/favicon'

interface Props {
  /** Leading emoji from the title; wins over the favicon. */
  emoji: string | null
  /** Display title, for the monogram letter. */
  title: string
  url: string
}

// Every icon sits in the same tile: 28px with a hairline ring and the glyph at 20px (24px and
// 16px in compact), so favicons of any shape line up as a calm column.
const TILE =
  'flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-md ring-1 ring-inset ring-line compact:h-6 compact:w-6'

export function BookmarkIcon({ emoji, title, url }: Props) {
  if (emoji) {
    return (
      <span data-tile className={`${TILE} bg-card text-[15px] leading-none compact:text-[13px]`}>
        {emoji}
      </span>
    )
  }
  const src = faviconUrl(url, 32)
  // Keyed by src so an edited URL starts a fresh check.
  return <Favicon key={src} src={src} title={title} url={url} />
}

function Favicon({ src, title, url }: { src: string; title: string; url: string }) {
  const [icon, setIcon] = useState<ResolvedIcon | undefined>(() => peekFavicon(src))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (icon) return
    let live = true
    void resolveFavicon(src).then((r) => live && setIcon(r))
    return () => {
      live = false
    }
  }, [src, icon])

  // Until resolved, hold the space so the title doesn't shift; a site with no icon never
  // flashes Chrome's grey globe on its way to the monogram.
  if (!icon) return <span aria-hidden data-tile className={TILE} />

  if (icon.generic || failed) {
    const m = monogram(title, url)
    // A neutral letter tile: colour stays for favicons. The colours go through variables so a
    // style can retint every monogram (terminal, in polish.css); the e2e suite also finds the
    // monogram by this style attribute.
    return (
      <span
        aria-hidden
        data-tile
        data-monogram
        className={`${TILE} text-[12px] font-semibold leading-none compact:text-[11px]`}
        style={{
          backgroundColor: 'var(--sb-mono-bg, color-mix(in srgb, var(--sb-fg) 7%, var(--sb-card)))',
          color: 'var(--sb-mono-fg, var(--sb-soft))',
        }}
      >
        {m.letter}
      </span>
    )
  }

  return (
    <span data-tile className={`${TILE} bg-card`}>
      <img
        src={icon.src}
        alt=""
        width={20}
        height={20}
        draggable={false}
        className={`h-5 w-5 rounded-sm compact:h-4 compact:w-4 ${icon.glyph ? `glyph-${icon.glyph}` : ''}`}
        onError={() => setFailed(true)}
      />
    </span>
  )
}
