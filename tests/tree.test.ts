// Nested stacks (0.8.0): the bookmark-folder mapping, the tree helpers, search, and the
// colours a stack, link or space can take. Run like the unit suite:
//   npx esbuild tests/tree.test.ts --bundle --platform=node --format=esm --outfile=$TMPDIR/tree.mjs && node $TMPDIR/tree.mjs
// (from the repo root: the palette check reads src/styles/palettes.css from there)
import fs from 'node:fs'
import path from 'node:path'
import { locateStack, mapTree, stackLinks, stackOfBookmark, subtreeIds, walkStacks, type TreeNode } from '../src/lib/bookmarks'
import { searchTree } from '../src/lib/search'
import { ITEM_COLORS } from '../src/store/useItemMeta'
import { contrastRatio, mix, over, readPalettes } from './contrast'

let fails = 0
function eq(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`)
}

// Chrome hands children back in index order, but nothing promises it: shuffle them here.
const T0 = Date.UTC(2026, 9, 1)
const link = (id: string, index: number, title: string, url: string, dateAdded = T0 + index * 60_000): TreeNode => ({ id, index, title, url, dateAdded })
const folder = (id: string, index: number, title: string, children: TreeNode[]): TreeNode => ({ id, index, title, children })

const root = folder('r', 0, 'Stackboard', [
  folder('sp2', 1, '🏠 Home', [folder('h1', 0, 'Chores', [link('hb1', 0, 'Rota', 'https://rota.example/')])]),
  folder('sp1', 0, '🧪 Work', [
    link('stray', 0, 'Straight in a space', 'https://stray.example/'),
    folder('japan', 2, 'Japan', [
      folder('food', 3, 'Food', [
        link('ramen', 1, 'Ramen guide', 'https://ramen.example/'),
        folder('kyoto', 2, 'Kyoto', [link('nishiki', 0, 'Nishiki Market', 'https://nishiki.example/')]),
        link('sushi', 0, 'Sushi map', 'https://sushi.example/'),
      ]),
      link('jr', 0, 'JR Pass', 'https://jrpass.example/'),
      folder('empty', 2, 'Empty', []),
      link('untitled', 1, '', 'https://untitled.example/'),
    ]),
    folder('big', 1, 'Big', [link('b0', 0, 'Link 0', 'https://example.org/0')]),
  ]),
])

const tree = mapTree(root)
eq('map: spaces in index order', tree.spaces.map((s) => s.name), ['Work', 'Home'])
eq('map: the root id and the space emoji', [tree.rootId, tree.spaces[0].emoji], ['r', '🧪'])
eq('map: stacks in index order, links straight in a space left out', tree.spaces[0].stacks.map((s) => s.title), ['Big', 'Japan'])
const japan = tree.spaces[0].stacks[1]
eq('map: a stack keeps its own links in order', japan.bookmarks.map((b) => b.title), ['JR Pass', 'https://untitled.example/'])
eq('map: folders inside a stack become sub-stacks, in order', japan.children?.map((c) => c.title), ['Empty', 'Food'])
const food = japan.children![1]
eq('map: a sub-stack has its links', food.bookmarks.map((b) => b.id), ['sushi', 'ramen'])
eq('map: a sub-stack knows its space and its parent', [food.parentSpaceId, food.parentStackId], ['sp1', 'japan'])
eq('map: a sub-stack link points at the sub-stack', food.bookmarks[0].parentStackId, 'food')
eq('map: sub-stacks nest to any depth', food.children?.map((c) => [c.title, c.parentStackId, c.bookmarks.map((b) => b.title)]), [['Kyoto', 'food', ['Nishiki Market']]])
eq('map: a top-level stack has no parent stack', 'parentStackId' in japan, false)
eq('map: an empty folder is an empty sub-stack', [japan.children![0].bookmarks.length, japan.children![0].children?.length], [0, 0])
eq('map: a leaf stack has no sub-stacks', tree.spaces[0].stacks[0].children, [])
eq('map: links saved a minute apart are not a batch', food.bookmarks.map((b) => b.batch), [false, false])

// Helpers
eq('walk: depth first, board order', walkStacks(tree.spaces[0].stacks).map((s) => s.title), ['Big', 'Japan', 'Empty', 'Food', 'Kyoto'])
eq('links: a stack with everything below it', stackLinks(japan).map((b) => b.title), ['JR Pass', 'https://untitled.example/', 'Sushi map', 'Ramen guide', 'Nishiki Market'])
eq('subtree: a stack and every sub-stack below it', [...subtreeIds(food)], ['food', 'kyoto'])
eq('locate: a deep sub-stack with its path', (() => { const l = locateStack(tree, 'kyoto'); return [l?.space.name, l?.stack.title, l?.path.map((p) => p.title)] })(), ['Work', 'Kyoto', ['Japan', 'Food']])
eq('locate: a top-level stack has an empty path', locateStack(tree, 'h1')?.path, [])
eq('locate: unknown ids and no tree', [locateStack(tree, 'nope'), locateStack(null, 'japan')], [null, null])
eq('bookmark: finds the sub-stack holding a link', [stackOfBookmark(tree, 'nishiki')?.id, stackOfBookmark(tree, 'jr')?.id, stackOfBookmark(tree, 'nope')], ['kyoto', 'japan', null])

// Search reaches into sub-stacks.
const nishiki = searchTree(tree, 'nishiki')
eq('search: finds a link two levels down', nishiki.map((g) => [g.stack.title, g.path.map((p) => p.title), g.hits.map((h) => h.title)]), [['Kyoto', ['Japan', 'Food'], ['Nishiki Market']]])
eq('search: a parent stack name matches the links below it', searchTree(tree, 'japan').flatMap((g) => g.hits.map((h) => h.title)).sort(), ['JR Pass', 'Nishiki Market', 'Ramen guide', 'Sushi map', 'https://untitled.example/'])
eq('search: every term must match somewhere', searchTree(tree, 'kyoto sushi'), [])
eq('search: Enter opens the best hit, wherever it sits', searchTree(tree, 'ramen')[0]?.hits[0]?.title, 'Ramen guide')

// Colours (useItemMeta's ITEM_COLORS) in every palette. Real text on a tint is --sb-strong /
// --sb-fg / --sb-soft (items.css maps --sb-muted to --sb-soft inside a coloured stack), so it must
// stay AA on the header pill and on the soft pane wash. Tint fg (chevrons, icon letters) needs 3:1.
// Keep these in step with items.css.
const PILL = 0.8 // --item-pill: the tint at 80% over the card
const WASH = 0.32 // --item-wash, light schemes: the tint bg at 32% over the pane
const WASH_DARK = 0.08 // --item-wash, dark schemes: the tint fg at 8% over the pane
const css = fs.readFileSync(path.resolve('src/styles/palettes.css'), 'utf8')
const blocks = readPalettes(css)
eq('palettes: read for the colour checks', blocks.length > 20, true)
const tokenOf = (v: string) => /var\(--sb-([a-z0-9-]+)\)/.exec(v)?.[1] ?? ''
for (const b of blocks) {
  const tok = (k: string) => b.tokens.get(k) ?? '#ff00ff'
  const card = tok('card').length === 9 ? over(tok('card'), tok('canvas')) : tok('card')
  const opaque = (c: string) => (c.length === 9 ? over(c, card) : c)
  const r = (a: string, z: string) => Math.round(contrastRatio(a, z) * 100) / 100
  const misses: string[] = []
  for (const c of ITEM_COLORS) {
    const bg = opaque(tok(tokenOf(c.bg)))
    const fg = opaque(tok(tokenOf(c.fg)))
    const pill = mix(bg, card, PILL)
    const wash = b.scheme === 'dark' ? mix(fg, card, WASH_DARK) : mix(bg, card, WASH)
    if (r(tok('strong'), pill) < 4.5) misses.push(`${c.id}: strong on pill ${r(tok('strong'), pill)}`)
    for (const t of ['strong', 'fg', 'soft']) if (r(tok(t), wash) < 4.5) misses.push(`${c.id}: ${t} on wash ${r(tok(t), wash)}`)
    if (r(fg, bg) < 3) misses.push(`${c.id}: tint fg on tint ${r(fg, bg)}`)
    if (r(fg, pill) < 3) misses.push(`${c.id}: tint fg on pill ${r(fg, pill)}`)
  }
  eq(`colours: ${b.palette}/${b.scheme} text stays AA on every tint`, misses, [])
}

console.log(fails ? `\n${fails} FAILED` : '\nALL PASS')
process.exit(fails ? 1 : 0)
