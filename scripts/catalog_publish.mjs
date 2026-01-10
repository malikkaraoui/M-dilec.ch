#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

function nowIso() {
  return new Date().toISOString()
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

// Format requis par les instructions: YYYYMMDD-HHMMSS
function stampYmdHms(d = new Date()) {
  const yyyy = d.getFullYear()
  const mm = pad2(d.getMonth() + 1)
  const dd = pad2(d.getDate())
  const hh = pad2(d.getHours())
  const mi = pad2(d.getMinutes())
  const ss = pad2(d.getSeconds())
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`
}

function pad6(id) {
  const n = Number(id)
  if (!Number.isFinite(n)) return String(id || '').padStart(6, '0')
  return String(Math.trunc(n)).padStart(6, '0')
}

function slugify(value) {
  const raw = String(value || '').trim()
  if (!raw) return 'produit'
  const noAccents = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const dashed = noAccents.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const out = dashed || 'produit'
  return out.length > 80 ? out.slice(0, 80).replace(/-+$/g, '') : out
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function parseArgs(argv) {
  const args = { draftDir: '', help: false }
  const rest = Array.isArray(argv) ? argv.slice(2) : []

  for (let i = 0; i < rest.length; i += 1) {
    const a = rest[i]
    if (a === '--help' || a === '-h') {
      args.help = true
      continue
    }
    if (a === '--draft-dir') {
      args.draftDir = rest[i + 1] || ''
      i += 1
      continue
    }
    if (a.startsWith('--draft-dir=')) {
      args.draftDir = a.split('=', 2)[1] || ''
      continue
    }
    throw new Error(`Argument inconnu: ${a}`)
  }

  return args
}

function usage() {
  return [
    'Usage:',
    '  npm run catalog:publish -- --draft-dir drafts/draft_<slug>',
    '',
    'Options:',
    '  --draft-dir <path>   Dossier du draft (contient draft.json + fichiers)',
    '  -h, --help           Afficher cette aide',
    '',
    'Notes:',
    '  - Source de vérité: public/catalog (catalogue statique)',
    '  - Le script refuse si le draft est incomplet',
  ].join('\n')
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  try {
    return JSON.parse(raw)
  } catch (err) {
    throw new Error(`JSON invalide: ${filePath}: ${String(err?.message || err)}`)
  }
}

async function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })

  const tmp = `${filePath}.tmp-${Date.now()}-${process.pid}`
  const json = JSON.stringify(data, null, 2) + '\n'
  await fs.writeFile(tmp, json, 'utf8')
  await fs.rename(tmp, filePath)
}

async function writeJsonTemp(filePath, data, tag) {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })

  const tmp = `${filePath}.tmp-${tag}-${process.pid}`
  const json = JSON.stringify(data, null, 2) + '\n'
  await fs.writeFile(tmp, json, 'utf8')
  return tmp
}

async function updateIndexesAtomic({ indexProductsPath, nextIndexProducts, indexSearchPath, nextIndexSearch, tag }) {
  // Objectif: éviter les index partiellement mis à jour (2 fichiers).
  // On écrit d'abord deux fichiers temporaires, puis on replace avec rollback si le 2e échoue.
  const backupProducts = `${indexProductsPath}.bak-${tag}`
  const backupSearch = `${indexSearchPath}.bak-${tag}`

  const hadProducts = await fileExists(indexProductsPath)
  const hadSearch = await fileExists(indexSearchPath)

  let tmpProducts = ''
  let tmpSearch = ''

  try {
    if (hadProducts) await fs.copyFile(indexProductsPath, backupProducts)
    if (hadSearch) await fs.copyFile(indexSearchPath, backupSearch)

    tmpProducts = await writeJsonTemp(indexProductsPath, nextIndexProducts, tag)
    tmpSearch = await writeJsonTemp(indexSearchPath, nextIndexSearch, tag)

    await fs.rename(tmpProducts, indexProductsPath)
    tmpProducts = ''

    await fs.rename(tmpSearch, indexSearchPath)
    tmpSearch = ''

    if (hadProducts) await fs.rm(backupProducts, { force: true })
    if (hadSearch) await fs.rm(backupSearch, { force: true })
  } catch (err) {
    // Cleanup tmp
    if (tmpProducts) {
      try {
        await fs.rm(tmpProducts, { force: true })
      } catch {
        // ignore
      }
    }
    if (tmpSearch) {
      try {
        await fs.rm(tmpSearch, { force: true })
      } catch {
        // ignore
      }
    }

    // Rollback si possible
    try {
      if (hadProducts) await fs.copyFile(backupProducts, indexProductsPath)
    } catch {
      // ignore
    }
    try {
      if (hadSearch) await fs.copyFile(backupSearch, indexSearchPath)
      else await fs.rm(indexSearchPath, { force: true })
    } catch {
      // ignore
    }

    try {
      if (hadProducts) await fs.rm(backupProducts, { force: true })
      if (hadSearch) await fs.rm(backupSearch, { force: true })
    } catch {
      // ignore
    }

    throw err
  }
}

async function fileExists(p) {
  try {
    await fs.stat(p)
    return true
  } catch {
    return false
  }
}

function buildLogger(logFile) {
  const lines = []

  async function append(line) {
    lines.push(line)
    process.stdout.write(line + '\n')
    await fs.appendFile(logFile, line + '\n', 'utf8')
  }

  async function log(level, { step, progress, message, meta }) {
    const prefix = `${nowIso()} ${level.padEnd(5)} step=${step} progress=${String(progress).padStart(3)} message=${JSON.stringify(message)}`
    const metaStr = meta ? ` meta=${JSON.stringify(meta)}` : ''
    await append(prefix + metaStr)
  }

  return { log, lines }
}

function resolveHomeCategoryId(categories) {
  const all = Array.isArray(categories) ? categories : []
  const home = all.find((c) => String(c?.slug || '') === 'home')
  if (home?.id != null) {
    const n = Number(home.id)
    if (Number.isFinite(n)) return n
  }

  const root = all.find((c) => String(c?.slug || '') === 'root')
  const child = Array.isArray(root?.children_ids) ? root.children_ids[0] : null
  const n = Number(child)
  return Number.isFinite(n) ? n : null
}

function buildCategoryPath({ categoryId, categoriesById, homeId }) {
  const id = Number(categoryId)
  if (!Number.isFinite(id)) return null

  const cat = categoriesById.get(id)
  if (!cat) return null

  const chain = []
  let cur = cat
  let guard = 0
  while (cur && guard < 50) {
    const curId = Number(cur?.id)
    const name = String(cur?.name || '').trim()
    if (Number.isFinite(curId) && name) {
      chain.push({ id: curId, name })
    }

    const pid = Number(cur?.id_parent)
    if (!Number.isFinite(pid) || pid <= 0) break
    if (homeId != null && pid === homeId) break

    cur = categoriesById.get(pid)
    guard += 1
  }

  const pathFromHome = chain.reverse()

  // On ajoute un "Accueil" en tête pour une UX cohérente (sans afficher Root).
  if (homeId != null) {
    pathFromHome.unshift({ id: homeId, name: 'Accueil' })
  }

  return pathFromHome
}

function buildSearchHaystack({ name, manufacturerName, categoriesNames, shortHtml }) {
  const parts = [name, manufacturerName, ...(Array.isArray(categoriesNames) ? categoriesNames : []), stripHtml(shortHtml)]
  return normalizeSpaces(parts.filter(Boolean).join(' ')).toLowerCase()
}

async function main() {
  const args = parseArgs(process.argv)

  if (args.help) {
    process.stdout.write(usage() + '\n')
    process.exit(0)
  }

  const draftDir = String(args.draftDir || '').trim()
  if (!draftDir) {
    process.stderr.write('Erreur: --draft-dir est requis\n\n' + usage() + '\n')
    process.exit(1)
  }

  const root = process.cwd()
  const catalogDir = path.join(root, 'public', 'catalog')

  const indexProductsPath = path.join(catalogDir, 'index.products.json')
  const indexSearchPath = path.join(catalogDir, 'index.search.json')
  const manufacturersPath = path.join(catalogDir, 'taxonomies', 'manufacturers.json')
  const categoriesPath = path.join(catalogDir, 'taxonomies', 'categories.json')

  const reportsDir = path.join(catalogDir, 'reports')
  await fs.mkdir(reportsDir, { recursive: true })

  const ts = stampYmdHms(new Date())
  const logPath = path.join(reportsDir, `publish_${ts}.log`)
  const summaryLatestPath = path.join(reportsDir, 'publish_summary_latest.json')

  const logger = buildLogger(logPath)

  const summary = {
    started_at: nowIso(),
    draft_dir: draftDir,
    ok: false,
    new_id: null,
    new_slug: null,
    product_file: null,
    cover_image: null,
    pdf: null,
    errors: [],
  }

  try {
    await logger.log('INFO', { step: 'load', progress: 5, message: 'Chargement des indexes et taxonomies…' })

    if (!(await fileExists(indexProductsPath))) {
      throw new Error(`index.products.json introuvable: ${indexProductsPath}`)
    }

    const indexProducts = await readJson(indexProductsPath)
    if (!Array.isArray(indexProducts)) {
      throw new Error('index.products.json: format inattendu (tableau attendu)')
    }

    let indexSearch = []
    if (await fileExists(indexSearchPath)) {
      indexSearch = await readJson(indexSearchPath)
      if (!Array.isArray(indexSearch)) {
        throw new Error('index.search.json: format inattendu (tableau attendu)')
      }
    }

    const manufacturersJson = await readJson(manufacturersPath)
    const manufacturers = Array.isArray(manufacturersJson?.manufacturers) ? manufacturersJson.manufacturers : []

    const categoriesJson = await readJson(categoriesPath)
    const categories = Array.isArray(categoriesJson?.categories) ? categoriesJson.categories : []

    const categoriesById = new Map()
    for (const c of categories) {
      const id = Number(c?.id)
      if (!Number.isFinite(id)) continue
      categoriesById.set(id, c)
    }

    const manufacturersById = new Map()
    for (const m of manufacturers) {
      const id = Number(m?.id)
      const name = String(m?.name || '').trim()
      if (!Number.isFinite(id) || !name) continue
      manufacturersById.set(id, { id, name })
    }

    await logger.log('INFO', { step: 'load', progress: 10, message: 'OK' })

    await logger.log('INFO', { step: 'draft', progress: 15, message: 'Lecture du draft…' })

    const absDraftDir = path.isAbsolute(draftDir) ? draftDir : path.join(root, draftDir)
    const draftJsonPath = path.join(absDraftDir, 'draft.json')

    if (!(await fileExists(draftJsonPath))) {
      throw new Error(`draft.json introuvable: ${draftJsonPath}`)
    }

    const draft = await readJson(draftJsonPath)

    // Validation contrat
    const name = normalizeSpaces(draft?.name)
    const manufacturerId = Number(draft?.manufacturer_id)
    const categoryIds = Array.isArray(draft?.category_ids) ? draft.category_ids.map((x) => Number(x)).filter(Number.isFinite) : []
    const priceHt = Number(draft?.price_ht)
    const currency = normalizeSpaces(draft?.currency) || 'CHF'
    const active = Boolean(draft?.active)
    const shortHtml = String(draft?.short_html || '').trim()
    const longHtml = String(draft?.long_html || '').trim()

    const imageFilename = normalizeSpaces(draft?.image_filename)
    const pdfFilename = normalizeSpaces(draft?.pdf_filename)

    const errors = []
    if (!name) errors.push('Champ requis manquant: name')
    if (!Number.isFinite(manufacturerId)) errors.push('Champ requis manquant/invalide: manufacturer_id')
    if (!categoryIds.length) errors.push('Champ requis manquant: category_ids (au moins 1)')
    if (!Number.isFinite(priceHt) || priceHt < 0) errors.push('Champ requis manquant/invalide: price_ht (>= 0)')
    if (!stripHtml(shortHtml)) errors.push('Champ requis manquant: short_html')
    if (!stripHtml(longHtml)) errors.push('Champ requis manquant: long_html')
    if (!imageFilename) errors.push('Champ requis manquant: image_filename')

    const manufacturer = manufacturersById.get(manufacturerId) || null
    if (!manufacturer) errors.push(`manufacturer_id inconnu: ${manufacturerId}`)

    for (const id of categoryIds) {
      if (!categoriesById.has(id)) errors.push(`category_id inconnu: ${id}`)
    }

    const imageSrc = imageFilename ? path.join(absDraftDir, imageFilename) : ''
    if (imageSrc && !(await fileExists(imageSrc))) errors.push(`Fichier image introuvable: ${imageFilename}`)

    const pdfSrc = pdfFilename ? path.join(absDraftDir, pdfFilename) : ''
    if (pdfFilename && !(await fileExists(pdfSrc))) errors.push(`Fichier PDF introuvable: ${pdfFilename}`)

    if (errors.length) {
      for (const e of errors) await logger.log('ERROR', { step: 'validate', progress: 20, message: e })
      throw new Error('Draft invalide: ' + errors.join(' | '))
    }

    await logger.log('INFO', { step: 'validate', progress: 25, message: 'Draft valide' })

    // ID + slug uniques
    const maxId = indexProducts.reduce((acc, p) => {
      const id = Number(p?.id)
      return Number.isFinite(id) && id > acc ? id : acc
    }, 0)

    const newId = maxId + 1

    const baseSlug = slugify(name)
    const taken = new Set(indexProducts.map((p) => String(p?.slug || '').trim()).filter(Boolean))
    let newSlug = baseSlug
    if (taken.has(newSlug)) {
      let k = 2
      while (k < 5000) {
        const candidate = `${baseSlug}-${k}`
        if (!taken.has(candidate)) {
          newSlug = candidate
          break
        }
        k += 1
      }
    }

    if (taken.has(newSlug)) {
      throw new Error(`Impossible de générer un slug unique (base=${baseSlug})`)
    }

    summary.new_id = newId
    summary.new_slug = newSlug

    await logger.log('INFO', { step: 'resolve', progress: 25, message: 'ID/slug résolus', meta: { newId, newSlug } })

    // Paths
    const productFile = path.join(catalogDir, 'products', `${pad6(newId)}.json`)
    const assetBaseRel = `assets/products/${newId}__${newSlug}`

    const imageExt = path.extname(imageFilename) || '.jpg'
    const coverRel = `${assetBaseRel}/images/cover-large_default${imageExt}`
    const coverDst = path.join(catalogDir, coverRel)

    const pdfRel = pdfFilename ? `${assetBaseRel}/pdf/fiche.pdf` : null
    const pdfDst = pdfRel ? path.join(catalogDir, pdfRel) : null

    summary.product_file = path.relative(root, productFile)
    summary.cover_image = coverRel
    summary.pdf = pdfRel

    await logger.log('INFO', { step: 'copy_assets', progress: 35, message: 'Copie des assets…' })

    await fs.mkdir(path.dirname(coverDst), { recursive: true })
    await fs.copyFile(imageSrc, coverDst)
    await logger.log('INFO', { step: 'copy_image', progress: 45, message: 'Image copiée', meta: { src: imageSrc, dst: coverDst } })

    if (pdfSrc && pdfDst) {
      await fs.mkdir(path.dirname(pdfDst), { recursive: true })
      await fs.copyFile(pdfSrc, pdfDst)
      await logger.log('INFO', { step: 'copy_pdf', progress: 55, message: 'PDF copié', meta: { src: pdfSrc, dst: pdfDst } })
    } else {
      await logger.log('INFO', { step: 'copy_pdf', progress: 55, message: 'Pas de PDF (optionnel)' })
    }

    // Catégories + category_paths
    await logger.log('INFO', { step: 'build', progress: 60, message: 'Génération JSON produit…' })

    const selectedCategories = categoryIds.map((id) => {
      const c = categoriesById.get(id)
      return { id, name: String(c?.name || '').trim() }
    })

    const homeId = resolveHomeCategoryId(categories)
    const categoryPaths = []
    for (const id of categoryIds) {
      const p = buildCategoryPath({ categoryId: id, categoriesById, homeId })
      if (p && p.length) categoryPaths.push(p)
    }

    const productJson = {
      id: newId,
      slug: newSlug,
      active,
      reference: normalizeSpaces(draft?.reference) || undefined,
      name,
      descriptions: {
        short_html: shortHtml,
        long_html: longHtml,
      },
      pricing: {
        currency,
        price_ht: priceHt,
        price_ttc: null,
        promo: null,
      },
      manufacturer: {
        id: manufacturer.id,
        name: manufacturer.name,
      },
      categories: selectedCategories,
      category_paths: categoryPaths,
      specs: Array.isArray(draft?.specs)
        ? draft.specs
            .map((s) => ({
              name: normalizeSpaces(s?.name),
              value: normalizeSpaces(s?.value),
            }))
            .filter((s) => s.name && s.value)
        : [],
      media: {
        images: [
          {
            type: 'admin',
            source_id_image: null,
            files: [coverRel],
          },
        ],
        pdfs: pdfRel ? [pdfRel] : [],
        attachments_meta: [],
        // Le PDF est optionnel: on ne doit pas afficher "indisponible" quand il n'y en a pas.
        pdfs_missing: false,
      },
      relations: {
        accessories: [],
      },
    }

    // Cleanup undefined
    if (!productJson.reference) delete productJson.reference

    await logger.log('INFO', { step: 'write_product', progress: 80, message: 'Écriture du produit…' })
    await writeJsonAtomic(productFile, productJson)

    // Indexes
    const indexProductsEntry = {
      id: newId,
      slug: newSlug,
      active,
      name,
      price_ht: priceHt,
      manufacturer_name: manufacturer.name,
      category_ids: categoryIds,
      cover_image: coverRel,
    }

    const haystack = buildSearchHaystack({
      name,
      manufacturerName: manufacturer.name,
      categoriesNames: selectedCategories.map((c) => c.name).filter(Boolean),
      shortHtml,
    })

    const indexSearchEntry = { id: newId, haystack }

    const nextIndexProducts = [...indexProducts, indexProductsEntry]
    const nextIndexSearch = [...indexSearch, indexSearchEntry]

    await logger.log('INFO', { step: 'write_indexes', progress: 92, message: 'Mise à jour des index…' })

    await updateIndexesAtomic({
      indexProductsPath,
      nextIndexProducts,
      indexSearchPath,
      nextIndexSearch,
      tag: ts,
    })

    summary.ok = true
    summary.finished_at = nowIso()

    await writeJsonAtomic(summaryLatestPath, summary)

    await logger.log('INFO', { step: 'done', progress: 100, message: 'Publish terminé', meta: { newId, newSlug } })

    process.exit(0)
  } catch (err) {
    summary.ok = false
    summary.finished_at = nowIso()
    summary.errors.push(String(err?.message || err))

    try {
      await writeJsonAtomic(summaryLatestPath, summary)
    } catch {
      // ignore
    }

    try {
      await logger.log('ERROR', { step: 'fail', progress: 100, message: String(err?.message || err) })
    } catch {
      // ignore
    }

    process.stderr.write(`\nErreur: ${String(err?.message || err)}\n`)
    process.exit(1)
  }
}

main()
