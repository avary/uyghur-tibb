#!/usr/bin/env node
/* Explicit opt-in seed: point DATA at the private generated recipeData.js. */
import fs from 'node:fs'
import path from 'node:path'
import mysql from 'mysql2/promise'

const envPath = path.resolve('.env')
if (fs.existsSync(envPath)) for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
}

const dataPath = process.env.RECIPE_DATA || 'vite/src/data/recipeData.js'
if (!fs.existsSync(dataPath)) throw new Error(`Recipe dataset not found: ${dataPath}`)
const { RECIPE_BOOK } = await import(path.resolve(dataPath))
const recipes = Array.isArray(RECIPE_BOOK?.recipes) ? RECIPE_BOOK.recipes : []
if (!recipes.length) throw new Error('Recipe dataset is empty; run scripts/import-recipes.mjs first')
const driver = String(process.env.DB_DRIVER || (process.env.SUPABASE_URL ? 'supabase' : 'mysql')).toLowerCase()

function bookRow(){ return { id: RECIPE_BOOK.id, title: RECIPE_BOOK.title, subtitle: RECIPE_BOOK.subtitle, source_year: RECIPE_BOOK.sourceYear, language: RECIPE_BOOK.language || 'ug', pdf_url: RECIPE_BOOK.sourcePdf || null, total_pages: RECIPE_BOOK.totalPages || null, copyright_status: RECIPE_BOOK.copyrightStatus || 'pending' } }
function recipeRow(r){ return { id:r.id, book_id:r.bookId, category:r.category || null, disease_name:r.disease, recipe_number:r.recipeNumber || null, original_text:r.originalText, cleaned_text:r.cleanedText || null, source_page_start:r.sourcePageStart || null, source_page_end:r.sourcePageEnd || null, ocr_confidence:r.ocrConfidence ?? null, review_status:r.reviewStatus || 'needs_review', safety_status:r.safetyStatus || 'unreviewed' } }

if(driver === 'mysql'){
  const db = await mysql.createConnection({ host:process.env.MYSQL_HOST, port:Number(process.env.MYSQL_PORT || 3306), user:process.env.MYSQL_USER, password:process.env.MYSQL_PASSWORD, database:process.env.MYSQL_DATABASE })
  try {
    const b=bookRow(); await db.execute('INSERT INTO recipe_books (id,title,subtitle,source_year,language,pdf_url,total_pages,copyright_status) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title), subtitle=VALUES(subtitle), pdf_url=VALUES(pdf_url), total_pages=VALUES(total_pages)', [b.id,b.title,b.subtitle,b.source_year,b.language,b.pdf_url,b.total_pages,b.copyright_status])
    for(const r of recipes){const x=recipeRow(r); await db.execute('INSERT INTO recipes (id,book_id,category,disease_name,recipe_number,original_text,cleaned_text,source_page_start,source_page_end,ocr_confidence,review_status,safety_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE original_text=VALUES(original_text), cleaned_text=VALUES(cleaned_text), category=VALUES(category)', Object.values(x))}
  } finally { await db.end() }
} else if(driver === 'supabase'){
  const base=String(process.env.SUPABASE_URL||'').replace(/\/+$/,''); const key=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!base || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'}
  const call=async(table, body)=>{const res=await fetch(`${base}/rest/v1/${table}`,{method:'POST',headers,body:JSON.stringify(body)});if(!res.ok)throw new Error(`${table}: ${res.status} ${await res.text()}`)}
  await call('recipe_books',[bookRow()]); for(let i=0;i<recipes.length;i+=100) await call('recipes',recipes.slice(i,i+100).map(recipeRow))
} else throw new Error('DB_DRIVER must be mysql or supabase')
console.log(`Seeded ${recipes.length} recipes from ${dataPath} into ${driver}`)
