import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

function repoRoot() {
  return process.cwd()
}

function parseEnvFile(text) {
  const out = {}
  const lines = String(text || '').split(/\r?\n/)
  for (const line of lines) {
    const raw = String(line || '').trim()
    if (!raw || raw.startsWith('#')) continue

    const idx = raw.indexOf('=')
    if (idx <= 0) continue

    const key = raw.slice(0, idx).trim()
    let val = raw.slice(idx + 1).trim()

    // Support simple quotes/double quotes.
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }

    if (!key) continue
    out[key] = val
  }
  return out
}

function loadEnvLocal() {
  const p = path.join(repoRoot(), '.env.local')
  if (!fs.existsSync(p)) return { path: p, env: {} }
  try {
    const txt = fs.readFileSync(p, 'utf8')
    return { path: p, env: parseEnvFile(txt) }
  } catch {
    return { path: p, env: {} }
  }
}

function pickPython() {
  const candidate = path.join(repoRoot(), '.venv', 'bin', 'python')
  if (fs.existsSync(candidate)) return candidate
  return 'python3'
}

function spawnProc(label, cmd, args, extraEnv = {}) {
  const p = spawn(cmd, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...extraEnv,
    },
  })

  p.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[dev:full] ${label} exited with signal ${signal}`)
      return
    }
    if (code === 0) {
      console.log(`[dev:full] ${label} exited (ok)`)
      return
    }
    console.log(`[dev:full] ${label} exited with code ${code}`)
  })

  return p
}

function main() {
  const { env: envLocal } = loadEnvLocal()

  const viteAdminToken = String(envLocal.VITE_ADMIN_TOKEN || '').trim()
  const adminToken = viteAdminToken || process.env.ADMIN_TOKEN || 'dev-token'

  if (!viteAdminToken) {
    console.log('[dev:full] INFO: VITE_ADMIN_TOKEN non trouvé dans .env.local → fallback dev-token (dev uniquement).')
    console.log('[dev:full]       Pour le mode “propre-propre”, définis VITE_ADMIN_TOKEN dans .env.local et redémarre.')
  }

  const python = pickPython()

  console.log('[dev:full] Starting publisher (FastAPI/uvicorn) on http://127.0.0.1:8787 …')
  const publisher = spawnProc(
    'publisher',
    python,
    ['-m', 'uvicorn', 'publisher.app:app', '--host', '127.0.0.1', '--port', '8787', '--reload'],
    {
      ADMIN_TOKEN: String(adminToken),
      PYTHONUNBUFFERED: '1',
    },
  )

  console.log('[dev:full] Starting Vite on http://localhost:5173 …')
  const vite = spawnProc('vite', process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'])

  const shutdown = (signal) => {
    console.log(`\n[dev:full] Shutting down (${signal})…`)
    try {
      publisher.kill('SIGTERM')
    } catch {
      // ignore
    }
    try {
      vite.kill('SIGTERM')
    } catch {
      // ignore
    }
    // Give them a moment, then hard-exit.
    setTimeout(() => process.exit(0), 800).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main()
