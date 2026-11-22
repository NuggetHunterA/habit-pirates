// Node-Loader fuer die Simulatoren: loest Importe ohne Endung auf .ts auf und
// ersetzt Vite-Eigenheiten (import.meta.glob, import.meta.env), damit der Spielcode in Node laeuft.
import { register } from 'node:module'

register(
  'data:text/javascript,' +
    encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx) } catch (e) {
    if ((spec.startsWith('.') || spec.startsWith('/')) && !/\\.[a-z]+$/.test(spec)) return next(spec + '.ts', ctx)
    throw e
  }
}
export async function load(url, ctx, next) {
  if (/\\.(webp|png|css)$/.test(url)) return { format: 'module', source: 'export default ""', shortCircuit: true }
  const r = await next(url, ctx)
  if (url.includes('/src/') && url.endsWith('.ts')) {
    let s = String(r.source)
    s = s.replace(/import\\.meta\\.glob\\(/g, '((..._a) => ({}))(').replace(/import\\.meta\\.env/g, '({})')
    return { ...r, source: s }
  }
  return r
}
`),
  import.meta.url,
)
