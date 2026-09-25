const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = __dirname
const USERS_FILE = path.join(ROOT, 'datas', 'users.json')
const PORT = 5500

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
}

function send(res, code, type, body) {
  res.writeHead(code, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' })
  res.end(body)
}

const server = http.createServer((req, res) => {
  // 允许跨域预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    })
    return res.end()
  }

  // 注册接口
  if (req.method === 'POST' && req.url === '/api/register') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      let payload
      try {
        payload = JSON.parse(body)
      } catch (e) {
        return send(res, 400, 'application/json', JSON.stringify({ ok: false, error: 'invalid json' }))
      }

      const { name, email, password } = payload || {}
      if (!name || !email || !password) {
        return send(res, 400, 'application/json', JSON.stringify({ ok: false, error: 'missing fields' }))
      }

      let db
      try {
        db = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))
      } catch (e) {
        db = { current: name, users: {} }
      }
      if (!db.users) db.users = {}

      if (db.users[name]) {
        return send(res, 409, 'application/json', JSON.stringify({ ok: false, error: 'user exists' }))
      }

      // 追加新用户
      db.users[name] = {
        username: name,
        email,
        password,
        avatar: '',
        uid: 'U-' + Date.now(),
        joined: new Date().toISOString().slice(0, 10),
        solved: 0,
        total: 0,
        score: 0,
        rank: 0,
        level: 'Lv.0',
        bio: '',
        lastActive: '',
        done: []
      }

      fs.writeFileSync(USERS_FILE, JSON.stringify(db, null, 4), 'utf8')

      return send(res, 200, 'application/json', JSON.stringify({ ok: true }))
    })
    return
  }

  // 静态文件
  let urlPath = req.url.split('?')[0]
  if (urlPath === '/') urlPath = '/index.html'
  const filePath = path.join(ROOT, decodeURIComponent(urlPath))

  // 防目录穿越
  if (!filePath.startsWith(ROOT)) {
    return send(res, 403, 'text/plain; charset=utf-8', 'Forbidden')
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      return send(res, 404, 'text/plain; charset=utf-8', 'Not found')
    }
    const ext = path.extname(filePath).toLowerCase()
    const type = MIME[ext] || 'application/octet-stream'
    send(res, 200, type, data)
  })
})

server.listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT)
})
