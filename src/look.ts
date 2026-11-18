export type Look = 'klassisch' | 'a' | 'b'
const KEY = 'hp.look'

export function currentLook(): Look {
  const q = new URLSearchParams(location.search).get('look')
  if (q === 'a' || q === 'b' || q === 'klassisch') return q
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'a' || v === 'b' || v === 'klassisch') return v
  } catch {
    /* egal */
  }
  return 'klassisch'
}

/** Setzt den Look (Design-Variante) am <html>-Element und merkt ihn sich */
export function applyLook(l: Look = currentLook()) {
  if (l === 'klassisch') delete document.documentElement.dataset.look
  else document.documentElement.dataset.look = l
  try {
    localStorage.setItem(KEY, l)
  } catch {
    /* egal */
  }
  const meta = document.querySelector('meta[name=theme-color]')
  meta?.setAttribute('content', l === 'a' ? '#16206B' : l === 'b' ? '#F2FBFD' : '#3B2414')
}
