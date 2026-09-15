#!/usr/bin/env node
/* Explicit opt-in seed for generated raw-herb books. Records stay needs_review. */
import fs from 'node:fs'
import path from 'node:path'
import mysql from 'mysql2/promise'

const files = (process.env.HERB_DATA || '').split(',').map(v => v.trim()).filter(Boolean)
if (!files.length) throw new Error('Set HERB_DATA=herbData-book-a.js,herbData-book-b.js')
const books = []
for (const file of files) {
  if (!fs.existsSync(file)) throw new Error(`Herb dataset not found: ${file}`)
  books.push((await import(path.resolve(file))).HERB_BOOK)
}
const bookRow = b => ({ id:b.id, title:b.title, subtitle:b.subtitle || null, language:b.language || 'ug', total_pages:b.totalPages || null, copyright_status:b.copyrightStatus || 'pending' })
const herbRow = (h, b) => ({ id:h.id, book_id:b.id, name:h.name, aliases:Array.isArray(h.aliases) ? h.aliases : [], latin_name:h.latinName || null, used_part:h.usedPart || null, properties:h.properties || null, preparation:h.preparation || null, warnings:h.warnings || null, image_url:h.imageUrl || null, original_text:h.originalText || '', source_page_start:h.sourcePageStart || null, source_page_end:h.sourcePageEnd || null, review_status:'needs_review' })
const driver = String(process.env.DB_DRIVER || (process.env.SUPABASE_URL ? 'supabase' : 'mysql')).toLowerCase()

if (driver === 'mysql') {
  const db = await mysql.createConnection({ host:process.env.MYSQL_HOST, port:Number(process.env.MYSQL_PORT || 3306), user:process.env.MYSQL_USER, password:process.env.MYSQL_PASSWORD, database:process.env.MYSQL_DATABASE })
  try {
    for (const b of books) {
      const x = bookRow(b)
      await db.execute('INSERT INTO herb_books (id,title,subtitle,language,total_pages,copyright_status) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title),subtitle=VALUES(subtitle),total_pages=VALUES(total_pages)', Object.values(x))
      for (const h of b.herbs || []) {
        const y = herbRow(h, b)
        await db.execute('INSERT INTO herbs (id,book_id,name,aliases,latin_name,used_part,properties,preparation,warnings,image_url,original_text,source_page_start,source_page_end,review_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),original_text=VALUES(original_text),aliases=VALUES(aliases)', [y.id,y.book_id,y.name,JSON.stringify(y.aliases),y.latin_name,y.used_part,y.properties,y.preparation,y.warnings,y.image_url,y.original_text,y.source_page_start,y.source_page_end,y.review_status])
      }
    }
  } finally { await db.end() }
} else if (driver === 'supabase') {
  const base = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  const headers = { apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates,return=minimal' }
  const call = async (table, body) => { const r = await fetch(`${base}/rest/v1/${table}`, { method:'POST', headers, body:JSON.stringify(body) }); if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`) }
  for (const b of books) { await call('herb_books', [bookRow(b)]); await call('herbs', (b.herbs || []).map(h => herbRow(h, b))) }
} else throw new Error('DB_DRIVER must be mysql or supabase')

console.log(`Seeded ${books.reduce((n, b) => n + (b.herbs || []).length, 0)} raw herbs from ${books.length} book(s) into ${driver}; all remain needs_review`)
