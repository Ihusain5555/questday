// Throwaway static file server for previewing offline mockups in Playwright
// (the MCP browser blocks file://). Serves the project root on :8777.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const ROOT = process.cwd()
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' }

createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
    const rel = normalize(urlPath).replace(/^([/\\])+/, '')
    const file = join(ROOT, rel)
    const body = await readFile(file)
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404); res.end('not found')
  }
}).listen(8777, () => console.log('mock server on http://localhost:8777'))
