// Standalone extra PDF books — upstream v59–v63 port (books.html/app books).
// Metadata lives in localStorage (`uytibb_custom_pdf_books`); large uploaded
// PDF blobs live in IndexedDB (`uytibb_pdf_db` / `pdf_files`) so they bypass
// the localStorage quota entirely. Default extra books (kham-dorilar-1/2) are
// seeded automatically and kept in sync with their canonical title/URL.

export const DEFAULT_CUSTOM_PDF_BOOKS = [
  {
    id: '100-keselge-1000-retsip',
    title: 'يۈز كېسەلگە مىڭ رېتسېپ',
    subtitle: '100 كېسەللىك ئۈچۈن 1000 ئەنئەنىۋى رېتسېپ · 2005',
    pdfTitle: 'يۈز كېسەلگە مىڭ رېتسېپ',
    pdfUrl: 'pdf/100-keselge-1000-retsip.pdf',
    type: 'reference',
    when: '2005'
  },
  {
    id: 'kham-dorilar-1',
    title: 'ئۇيغۇر تېبابىتى خام دورىلار ئىلمى (1-قىسىم)',
    subtitle: 'ئۆسۈملۈك دورىلىرى، مەنبەسى، يىغىپ ساقلاش، تەبىئىتى ۋە خۇسۇسىيەتلىرى',
    pdfTitle: 'ئۇيغۇر تېبابىتى خام دورىلار ئىلمى (1-قىسىم)',
    pdfUrl: 'pdf/kham-dorilar-1.pdf',
    type: 'extra',
    when: '2026-09-12'
  },
  {
    id: 'kham-dorilar-2',
    title: 'ئۇيغۇر تېبابىتى خام دورىلار ئىلمى (2-قىسىم)',
    subtitle: 'مەدەن ۋە ھايۋانات دورىلىرى، تەبىئىتى، داۋالاش خۇسۇسىيەتلىرى ۋە تۈزەتكۈچىلىرى',
    pdfTitle: 'ئۇيغۇر تېبابىتى خام دورىلار ئىلمى (2-قىسىم)',
    pdfUrl: 'pdf/kham-dorilar-2.pdf',
    type: 'extra',
    when: '2026-09-12'
  }
]

const LS_CUSTOM_BOOKS = 'uytibb_custom_pdf_books'

function isKham1(item) {
  const id = String((item && item.id) || '')
  if (id.indexOf('kham-dorilar-1') >= 0) return true
  const t = (((item && item.title) || '') + ' ' + ((item && item.pdfUrl) || '')).toLowerCase()
  return t.indexOf('خام دورىلار') >= 0 && (t.indexOf('1') >= 0 || t.indexOf('بىرىنچى') >= 0)
}

function isKham2(item) {
  const id = String((item && item.id) || '')
  if (id.indexOf('kham-dorilar-2') >= 0) return true
  const t = (((item && item.title) || '') + ' ' + ((item && item.pdfUrl) || '')).toLowerCase()
  return t.indexOf('خام دورىلار') >= 0 && (t.indexOf('2') >= 0 || t.indexOf('ئىككىنچى') >= 0)
}

// Resolve the best server/repo URL for a lesson or custom book.
export function resolvePdfUrl(item) {
  if (!item) return ''
  if (item.pdfData && typeof item.pdfData === 'string' && item.pdfData.indexOf('data:') === 0) return item.pdfData
  if (isKham1(item)) return 'pdf/kham-dorilar-1.pdf'
  if (isKham2(item)) return 'pdf/kham-dorilar-2.pdf'
  const idNum = parseInt(item.id, 10)
  if (!isNaN(idNum) && idNum >= 1 && idNum <= 11) return 'pdf/lesson-' + idNum + '.pdf?v=20260909_original'
  return item.pdfUrl || '#'
}

// Metadata list: localStorage custom books, merged with the defaults (defaults
// win for their known ids) and scrubbed of "(MB/نۇسخا)" capacity marks.
export function getCustomPdfBooks() {
  let list = []
  try {
    const raw = JSON.parse(localStorage.getItem(LS_CUSTOM_BOOKS) || '[]')
    if (Array.isArray(raw)) list = raw
  } catch (e) {
    list = []
  }

  DEFAULT_CUSTOM_PDF_BOOKS.forEach((def) => {
    const idx = list.findIndex((x) => {
      if (!x) return false
      if (x.id === def.id) return true
      if (def.id === 'kham-dorilar-1') return isKham1(x)
      if (def.id === 'kham-dorilar-2') return isKham2(x)
      return false
    })
    if (idx >= 0) {
      if (list[idx].removed) return // keep the tombstone — don't resurrect
      list[idx].title = def.title
      list[idx].subtitle = def.subtitle
      list[idx].pdfTitle = def.pdfTitle
      list[idx].pdfUrl = def.pdfUrl
      list[idx].id = list[idx].id || def.id
      if (!list[idx].type) list[idx].type = def.type
    } else {
      list.push(Object.assign({}, def))
    }
  })

  list.forEach((b) => {
    b.pdfUrl = resolvePdfUrl(b)
    if (b.subtitle && (b.subtitle.indexOf('MB') >= 0 || b.subtitle.indexOf('نۇسخا') >= 0)) {
      b.subtitle = String(b.subtitle).replace(/\s*\([^)]*(MB|نۇسخا)[^)]*\)/g, '').trim()
    }
  })
  return list.filter((b) => !(b && b.removed))
}

export function saveCustomPdfBooks(list) {
  try {
    localStorage.setItem(LS_CUSTOM_BOOKS, JSON.stringify(list || []))
  } catch (e) { /* quota — caller decides what to do */ }
}

export const LS_CUSTOM_PDF_BOOKS = LS_CUSTOM_BOOKS

// IndexedDB blob store for uploaded PDF files (keyed by book id).
export const pdfDb = (() => {
  const DB_NAME = 'uytibb_pdf_db'
  const STORE = 'pdf_files'

  function open() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB not supported'))
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = (e) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
      }
      req.onsuccess = (e) => resolve(e.target.result)
      req.onerror = (e) => reject(e.target.error)
    })
  }

  function run(mode, fn) {
    return open().then((db) => new Promise((resolve, reject) => {
      try {
        const t = db.transaction(STORE, mode)
        const store = t.objectStore(STORE)
        const req = fn(store)
        req.onsuccess = () => resolve(req.result)
        t.onerror = (e) => reject(e.target.error)
      } catch (err) {
        reject(err)
      }
    }))
  }

  return {
    save(id, blob, fileName) {
      return run('readwrite', (s) => s.put({ id, blob, fileName, updated: Date.now() }))
    },
    get(id) {
      return run('readonly', (s) => s.get(id))
        .then((r) => (r && r.blob) || null)
        .catch(() => null)
    },
    del(id) {
      return run('readwrite', (s) => s.delete(id)).catch(() => {})
    }
  }
})()

export function dataUrlToBlobUrl(dataUrl) {
  try {
    const parts = String(dataUrl).split(',')
    const m = /:(.*?);/.exec(parts[0])
    const mime = m ? m[1] : 'application/pdf'
    const bin = atob(parts[1])
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return URL.createObjectURL(new Blob([bytes], { type: mime }))
  } catch (e) {
    return dataUrl
  }
}

// Best viewable source for a custom book: IndexedDB blob → embedded base64 →
// resolved repo/server URL. Returns '' when nothing is available.
export async function bookSource(b) {
  if (!b) return ''
  if (b.id) {
    const blob = await pdfDb.get(b.id)
    if (blob) {
      try { return URL.createObjectURL(blob) } catch (e) { /* fall through */ }
    }
  }
  if (b.pdfData && typeof b.pdfData === 'string' && b.pdfData.indexOf('data:') === 0) {
    return dataUrlToBlobUrl(b.pdfData)
  }
  const u = resolvePdfUrl(b)
  return u && u !== '#' ? u : ''
}
