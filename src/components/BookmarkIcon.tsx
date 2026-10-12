import { useEffect, useState, type CSSProperties } from 'react'
import { faviconUrl, monogram, peekFavicon, resolveFavicon, type ResolvedIcon } from '../lib/favicon'
import { colorOf, type ItemColor } from '../store/useItemMeta'

/**
 * The hooks items.css styles a coloured space, stack or link by: data-color plus the palette's
 * tint pair as --item-bg / --item-fg. Spread on the element that carries the colour.
 */
export function tint(color: ItemColor | undefined): { 'data-color'?: ItemColor; style?: CSSProperties } {
  const c = colorOf(color)
  if (!c) return {}
  return { 'data-color': c.id, style: { '--item-bg': c.bg, '--item-fg': c.fg } as CSSProperties }
}

/** md: a link row. sm: a compact row. lg: a Tiles layout tile, like Brave's top sites. */
export type IconSize = 'sm' | 'md' | 'lg'

interface Props {
  /** Leading emoji from the title; wins over the favicon. */
  emoji: string | null
  /** Display title, for the monogram letter. */
  title: string
  url: string
  size?: IconSize
}

// Every icon sits in the same tile: 28px with a hairline ring and the glyph at 20px (24px and
// 16px in compact), so favicons of any shape line up as a calm column. Compact rows use 20px,
// tiles 56px with a 32px glyph.
const TILE: Record<IconSize, string> = {
  sm: 'flex h-5 w-5 shrink-0 select-none items-center justify-center rounded-[5px] ring-1 ring-inset ring-line',
  md: 'flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-md ring-1 ring-inset ring-line compact:h-6 compact:w-6',
  lg: 'flex h-14 w-14 shrink-0 select-none items-center justify-center rounded-2xl ring-1 ring-inset ring-line',
}
const EMOJI: Record<IconSize, string> = {
  sm: 'text-[12px] leading-none',
  md: 'text-[15px] leading-none compact:text-[13px]',
  lg: 'text-[28px] leading-none',
}
const LETTER: Record<IconSize, string> = {
  sm: 'text-[10px] font-semibold leading-none',
  md: 'text-[12px] font-semibold leading-none compact:text-[11px]',
  lg: 'text-[22px] font-semibold leading-none',
}
const GLYPH: Record<IconSize, string> = {
  sm: 'h-3.5 w-3.5 rounded-[3px]',
  md: 'h-5 w-5 rounded-sm compact:h-4 compact:w-4',
  lg: 'h-8 w-8 rounded-md',
}

export function BookmarkIcon({ emoji, title, url, size = 'md' }: Props) {
  if (emoji) {
    return (
      <span data-tile className={`${TILE[size]} bg-card ${EMOJI[size]}`}>
        {emoji}
      </span>
    )
  }
  // Always checked at 32px: that is the size the generic-globe check knows. A tile shows the
  // 64px version of whatever passed.
  const src = faviconUrl(url, 32)
  // Keyed by src so an edited URL starts a fresh check.
  return <Favicon key={src} src={src} title={title} url={url} size={size} />
}

function Favicon({ src, title, url, size }: { src: string; title: string; url: string; size: IconSize }) {
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
  if (!icon) return <span aria-hidden data-tile className={TILE[size]} />

  if (icon.generic || failed) {
    const m = monogram(title, url)
    // A neutral letter tile: colour stays for favicons. The colours go through variables so a
    // style can retint every monogram (terminal, in polish.css; a coloured link, in items.css);
    // the e2e suite also finds the monogram by this style attribute.
    return (
      <span
        aria-hidden
        data-tile
        data-monogram
        className={`${TILE[size]} ${LETTER[size]}`}
        style={{
          backgroundColor: 'var(--sb-mono-bg, color-mix(in srgb, var(--sb-fg) 7%, var(--sb-card)))',
          color: 'var(--sb-mono-fg, var(--sb-soft))',
        }}
      >
        {m.letter}
      </span>
    )
  }

  const px = size === 'lg' ? 32 : size === 'sm' ? 14 : 20
  return (
    <span data-tile className={`${TILE[size]} bg-card`}>
      <img
        src={size === 'lg' ? icon.src.replace('size=32', 'size=64') : icon.src}
        alt=""
        width={px}
        height={px}
        draggable={false}
        className={`${GLYPH[size]} ${icon.glyph ? `glyph-${icon.glyph}` : ''}`}
        onError={() => setFailed(true)}
      />
    </span>
  )
}
