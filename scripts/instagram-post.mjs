// Publica um post da pasta redes-sociais/ no Instagram do Sonorum (@sonorumapp).
// API do Instagram com login do Instagram (graph.instagram.com).
//
// Uso:
//   node scripts/instagram-post.mjs check
//       confere o token e mostra a conta e a cota de publicação.
//   node scripts/instagram-post.mjs publish "redes-sociais/4 - Cobrar sem climão (carrossel)"
//       ensaio: mostra o que seria publicado e converte as imagens, sem enviar nada.
//   node scripts/instagram-post.mjs publish "<pasta>" --confirm
//       publica de verdade.
//   node scripts/instagram-post.mjs refresh
//       renova o token por mais 60 dias e grava no .env.local.
//
// Pasta do post: imagens numeradas (1.png, 2.png…) ou um vídeo .mp4 (Reel),
// mais legenda.txt. A Meta só aceita JPEG e baixa a mídia de uma URL pública,
// então as imagens são convertidas e sobem para o bucket público "redes-sociais"
// do Supabase; depois da publicação, os arquivos temporários são apagados.
//
// Variáveis no .env.local: INSTAGRAM_ACCESS_TOKEN (obrigatória),
// NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (já existem).

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdtempSync } from 'node:fs'
import { join, basename, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const API = 'https://graph.instagram.com/v27.0'
const BUCKET = 'redes-sociais'
const MAX_CAROUSEL = 20
const POLL_INTERVAL_MS = 4000
const POLL_MAX_TRIES = 75 // ~5 min, suficiente para um Reel curto
const ENV_PATH = new URL('../.env.local', import.meta.url)

function readEnv() {
  return Object.fromEntries(
    readFileSync(ENV_PATH, 'utf8')
      .split('\n')
      .filter((l) => l && !l.trimStart().startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
      }),
  )
}

const env = readEnv()
const token = env.INSTAGRAM_ACCESS_TOKEN

// Lança em vez de sair, para o finally da publicação apagar os arquivos temporários.
class PostError extends Error {}
function fail(msg) {
  throw new PostError(msg)
}

function requireToken() {
  if (!token) fail('INSTAGRAM_ACCESS_TOKEN não está no .env.local. Veja o passo a passo da configuração.')
}

async function ig(method, path, params = {}) {
  const url = new URL(`${API}/${path}`)
  const body = new URLSearchParams({ ...params, access_token: token })
  const res = method === 'GET'
    ? await fetch(`${url}?${body}`)
    : await fetch(url, { method, body })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.error) {
    const e = json.error || {}
    fail(`Instagram respondeu ${res.status} em ${path}: ${e.message || 'erro desconhecido'}${e.error_user_msg ? ` (${e.error_user_msg})` : ''}`)
  }
  return json
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitReady(containerId) {
  for (let i = 0; i < POLL_MAX_TRIES; i++) {
    const { status_code: status } = await ig('GET', containerId, { fields: 'status_code' })
    if (status === 'FINISHED') return
    if (status === 'ERROR' || status === 'EXPIRED') fail(`O container ${containerId} ficou com status ${status}.`)
    await sleep(POLL_INTERVAL_MS)
  }
  fail(`O container ${containerId} não ficou pronto a tempo.`)
}

function readPost(dir) {
  const abs = resolve(dir)
  if (!existsSync(abs)) fail(`Pasta não encontrada: ${abs}`)
  const files = readdirSync(abs)
  const byNumber = (a, b) => parseInt(a, 10) - parseInt(b, 10)
  const images = files.filter((f) => /^\d+\.(png|jpe?g)$/i.test(f)).sort(byNumber)
  const videos = files.filter((f) => /\.mp4$/i.test(f))
  const captionPath = join(abs, 'legenda.txt')
  const caption = existsSync(captionPath) ? readFileSync(captionPath, 'utf8').trim() : ''

  if (videos.length && images.length) fail('A pasta tem imagens e vídeo. Deixe só um tipo.')
  if (videos.length > 1) fail('A pasta tem mais de um vídeo.')
  if (!videos.length && !images.length) fail('Nenhuma imagem numerada (1.png, 2.png…) nem vídeo .mp4 na pasta.')
  if (images.length > MAX_CAROUSEL) fail(`O carrossel aceita até ${MAX_CAROUSEL} imagens.`)
  if (!caption) fail('Falta o legenda.txt na pasta.')

  return { abs, caption, video: videos[0], images }
}

// A Meta só aceita JPEG: converte com o sips do macOS, sem dependência nova.
function toJpegs(abs, images) {
  const out = mkdtempSync(join(tmpdir(), 'ig-post-'))
  return images.map((f, i) => {
    const dest = join(out, `${i + 1}.jpg`)
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '92', join(abs, f), '--out', dest], { stdio: 'ignore' })
    return dest
  })
}

async function uploadPublic(supabase, prefix, localPaths, contentType) {
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) fail(`Não consegui criar o bucket ${BUCKET}: ${error.message}`)
  }
  const urls = []
  for (const p of localPaths) {
    const key = `${prefix}/${basename(p)}`
    const { error } = await supabase.storage.from(BUCKET).upload(key, readFileSync(p), { contentType, upsert: true })
    if (error) fail(`Falha ao subir ${basename(p)}: ${error.message}`)
    urls.push({ key, url: supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl })
  }
  return urls
}

async function cmdCheck() {
  requireToken()
  const me = await ig('GET', 'me', { fields: 'user_id,username,account_type,media_count' })
  const quota = await ig('GET', `${me.user_id}/content_publishing_limit`, { fields: 'quota_usage,config' })
  const q = quota.data?.[0]
  console.log(`\n✓ Token válido para @${me.username} (${me.account_type}), ${me.media_count} posts.`)
  if (q) console.log(`  Publicações nas últimas 24 h: ${q.quota_usage} de ${q.config?.quota_total ?? '?'}.`)
  console.log('')
}

async function cmdRefresh() {
  requireToken()
  const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`)
  const json = await res.json()
  if (!res.ok || !json.access_token) fail(`Não consegui renovar o token: ${json.error?.message || res.status}`)
  const raw = readFileSync(ENV_PATH, 'utf8')
  writeFileSync(ENV_PATH, raw.replace(/^INSTAGRAM_ACCESS_TOKEN=.*$/m, `INSTAGRAM_ACCESS_TOKEN=${json.access_token}`))
  const days = Math.round(json.expires_in / 86400)
  console.log(`\n✓ Token renovado e gravado no .env.local. Vale por mais ${days} dias.\n`)
}

async function cmdPublish(dir, confirm) {
  const post = readPost(dir)
  const kind = post.video ? 'Reel' : post.images.length > 1 ? `carrossel de ${post.images.length} imagens` : 'imagem única'
  console.log(`\nPost: ${basename(post.abs)}\nTipo: ${kind}\nArquivos: ${post.video || post.images.join(', ')}\n\nLegenda:\n${post.caption}\n`)

  const local = post.video ? [join(post.abs, post.video)] : toJpegs(post.abs, post.images)
  if (!confirm) {
    console.log(`Ensaio: ${local.length} arquivo(s) prontos para envio, nada foi publicado.`)
    console.log('Para publicar de verdade, rode de novo com --confirm.\n')
    return
  }

  requireToken()
  const me = await ig('GET', 'me', { fields: 'user_id,username' })
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const uploaded = await uploadPublic(supabase, `${Date.now()}`, local, post.video ? 'video/mp4' : 'image/jpeg')

  try {
    let creationId
    if (post.video) {
      ;({ id: creationId } = await ig('POST', `${me.user_id}/media`, { media_type: 'REELS', video_url: uploaded[0].url, caption: post.caption }))
    } else if (uploaded.length === 1) {
      ;({ id: creationId } = await ig('POST', `${me.user_id}/media`, { image_url: uploaded[0].url, caption: post.caption }))
    } else {
      const children = []
      for (const { url } of uploaded) {
        const { id } = await ig('POST', `${me.user_id}/media`, { image_url: url, is_carousel_item: 'true' })
        await waitReady(id)
        children.push(id)
      }
      ;({ id: creationId } = await ig('POST', `${me.user_id}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: post.caption }))
    }
    await waitReady(creationId)
    const { id: mediaId } = await ig('POST', `${me.user_id}/media_publish`, { creation_id: creationId })
    const { permalink } = await ig('GET', mediaId, { fields: 'permalink' })
    console.log(`✓ Publicado em @${me.username}: ${permalink}\n`)
  } finally {
    await supabase.storage.from(BUCKET).remove(uploaded.map((u) => u.key))
  }
}

const [cmd, arg, flag] = process.argv.slice(2)
try {
  if (cmd === 'check') await cmdCheck()
  else if (cmd === 'refresh') await cmdRefresh()
  else if (cmd === 'publish' && arg) await cmdPublish(arg, flag === '--confirm')
  else fail('Uso: check | refresh | publish "<pasta do post>" [--confirm]')
} catch (err) {
  console.error(`\n✗ ${err instanceof PostError ? err.message : err.stack}\n`)
  process.exit(1)
}
