// Stackboard theme boot (0.5.0). A plain, render-blocking script in <head> of newtab.html and
// popup.html: it puts the saved palette, scheme, density and background on <html> before the
// first frame, so a dark board never flashes cream. Extension pages allow no inline script, hence
// this file. It reads the localStorage mirror that store/useAppearance.ts writes (the settings
// themselves live in chrome.storage.local, which is async and too late for the first paint).
;(function () {
  var root = document.documentElement
  var saved = null
  try {
    saved = JSON.parse(localStorage.getItem('stackable:appearance') || 'null')
  } catch (e) {
    saved = null
  }
  var a = saved && typeof saved === 'object' ? saved : {}
  var mode = a.mode === 'light' || a.mode === 'dark' ? a.mode : 'system'
  var prefersDark = false
  try {
    prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch (e) {
    prefersDark = false
  }
  var scheme = a.only === 'light' || a.only === 'dark' ? a.only : mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode
  root.setAttribute('data-palette', typeof a.palette === 'string' ? a.palette : 'stackboard')
  root.setAttribute('data-mode', mode)
  root.setAttribute('data-scheme', scheme)
  root.setAttribute('data-density', a.density === 'compact' || a.density === 'spacious' ? a.density : 'comfortable')
  // Fork: style, corners, font and motion, already worked out by the store (bootMirror().attrs).
  var attrs = a.attrs && typeof a.attrs === 'object' ? a.attrs : {}
  for (var k in attrs) {
    if (/^data-[a-z0-9-]+$/.test(k) && typeof attrs[k] === 'string') root.setAttribute(k, attrs[k])
  }
  // Backgrounds belong to the board only, never the toolbar popup. The Y2K strengths
  // (--sb-y2k-*) style panels, so they apply everywhere.
  var vars = a.vars && typeof a.vars === 'object' ? a.vars : {}
  var board = root.hasAttribute('data-board')
  if (board) {
    root.setAttribute('data-bg', a.bg === 'gradient' || a.bg === 'image' ? a.bg : 'solid')
    root.setAttribute('data-gradient', a.gradient >= 1 && a.gradient <= 9 ? String(a.gradient) : '1')
  }
  for (var v in vars) {
    if (/^--sb-[a-z0-9-]+$/.test(v) && typeof vars[v] === 'string' && (board || v.indexOf('--sb-y2k-') === 0)) root.style.setProperty(v, vars[v])
  }
})()
