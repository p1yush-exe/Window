/**
 * Resolves 1-2 relevant, freely licensed photos per catalog product from
 * Wikimedia Commons and writes scripts/seed-images.json. Run once when the
 * catalog changes:  node scripts/resolve-images.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
const catalog = JSON.parse(readFileSync(new URL('./catalog.json', import.meta.url), 'utf8'))
const outPath = new URL('./seed-images.json', import.meta.url)
const existing = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : {}
const UA = { 'User-Agent': 'WindowSeed/0.1 (UCS503P course project)' }

async function search(q) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=10&gsrsearch=${encodeURIComponent(q + ' filetype:bitmap')}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=800`
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) })
      const text = await r.text()
      if (!r.ok || !text.startsWith('{')) throw new Error(`throttled (${r.status})`)
      const j = JSON.parse(text)
      return Object.values(j.query?.pages ?? {}).sort((a, b) => a.index - b.index)
    } catch (e) {
      if (attempt === 3) throw e
      await new Promise((res) => setTimeout(res, 15000 * (attempt + 1)))
    }
  }
  return []
}

const words = (s) => s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2)
// Skip scans, drawings, patterns, museum plates and anything that is not a photo of the item.
const BAD = /diagram|map|logo|icon|svg|chart|drawing|engraving|illustration|coat of arms|flag|screenshot|poster|scan|newspaper|pattern|book|page|plate|catalog|advert|museum|manuscript|print\b|lithograph|sketch|painting of|18\d\d|19[0-5]\d|stamp|statue|sculpture/i

function pick(pages, q) {
  const kw = words(q)
  const ok = pages.filter((p) => {
    const ii = p.imageinfo?.[0]
    return ii && ii.mime === 'image/jpeg' && ii.width >= 640 && ii.height >= 640 && !BAD.test(p.title)
  })
  const score = (p) => words(p.title).filter((w) => kw.some((k) => w.startsWith(k) || k.startsWith(w))).length
  return ok
    .map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s || a.p.index - b.p.index)
    .filter((x) => x.s > 0)
    .slice(0, 2)
    .map((x) => x.p.imageinfo[0].thumburl.split('?')[0])
}

const out = {}
for (const [slug, urls] of Object.entries(existing)) {
  const kept = urls.filter((u) => !BAD.test(decodeURIComponent(u.split('/').pop() ?? '')))
  if (kept.length) out[slug] = kept
}
let n = 0
for (const v of catalog.vendors) {
  for (const prod of v.products) {
    if (out[prod.slug]?.length) continue
    let urls = []
    for (const q of prod.query) {
      urls = pick(await search(q), q)
      if (urls.length) break
    }
    out[prod.slug] = urls
    n++
    await new Promise((res) => setTimeout(res, 2000))
    console.log(`${urls.length ? '✔' : '✖'} ${prod.slug}: ${urls.length} image(s)`)
    writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n')
  }
}
console.log(`done, resolved ${n} products`)
