;(() => {
  /* ---------- DOM ---------- */
  var navBox = document.getElementById('profileNav')
  var navBtns = navBox ? navBox.querySelectorAll('.profileNavBtn') : []
  var content = document.getElementById('profileContent')
  var logoutBtn = document.getElementById('logoutBtn')

  var avatarBox = document.getElementById('profileAvatar')
  var nameEl = document.getElementById('profileName')
  var emailEl = document.getElementById('profileEmail')

  /* ---------- 从 JSON 加载的数据 ---------- */
  var ALL_USERS = {}
  var QUIZ_MAP = {}
  var LEADERBOARD_DATA = []

  var USER_PROFILE = null
  var DONE_IDS = []
  var DONE_DATA = []

  var TYPE_LABELS = {
    infer_type: 'Type Signature',
    find_function: 'Find Function',
    predict_behavior: 'Choice',
    satisfy_law: 'Satisfy Law',
    fix_laziness: 'Fix Laziness'
  }

  var THEME_KEY = 'quiz_theme'

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  function stars(diff) {
    var s = ''
    for (var i = 0; i < diff; i++) s += '★'
    for (var i = diff; i < 3; i++) s += '☆'
    return s
  }

  function quizTitle(q) {
    if (!q) return 'Unknown'
    var cfg = q.judge_config || {}
    if (cfg.display_snippet) return cfg.display_snippet
    if (cfg.display_code) return cfg.display_code
    if (q.functionName) return q.functionName
    if (cfg.question) return cfg.question
    return 'Question ' + q.id
  }

  function quizDiff(q) {
    if (!q) return 1
    if (typeof q.difficulty === 'number') return q.difficulty
    return ((q.id * 7 + 3) % 3) + 1
  }

  function buildDoneData() {
    DONE_DATA = []
    for (var i = 0; i < DONE_IDS.length; i++) {
      var id = DONE_IDS[i]
      var q = QUIZ_MAP[id]
      if (!q) continue
      DONE_DATA.push({
        id: q.id,
        title: quizTitle(q),
        type: q.problem_type,
        diff: quizDiff(q)
      })
    }
  }

  /* ---------- 未登录占位 ---------- */
  function renderEmpty(title, text) {
    return (
      '' +
      '<div class="viewHeader">' +
      '<span class="viewTitle">' +
      title +
      '</span>' +
      '<span class="viewSub">' +
      title +
      '</span>' +
      '</div>' +
      '<div class="emptyNotice">' +
      '<div class="emptyTitle">Not signed in</div>' +
      '<div class="emptyText">' +
      text +
      '</div>' +
      '<a class="emptyBtn" href="./account.html">Sign in</a>' +
      '</div>'
    )
  }

  /* ---------- 视图：个人信息 ---------- */
  function renderInfo() {
    var u = USER_PROFILE
    if (!u) return renderEmpty('Profile', 'Please sign in to view your profile.')

    return (
      '' +
      '<div class="viewHeader">' +
      '<span class="viewTitle">Profile</span>' +
      '<span class="viewSub">Profile</span>' +
      '</div>' +
      '<div class="infoGrid">' +
      '<div class="infoKey">Username</div><div class="infoVal mono">' +
      esc(u.username) +
      '</div>' +
      '<div class="infoKey">Email</div><div class="infoVal">' +
      esc(u.email) +
      '</div>' +
      '<div class="infoKey">User ID</div><div class="infoVal mono">' +
      esc(u.uid) +
      '</div>' +
      '<div class="infoKey">Joined</div><div class="infoVal">' +
      esc(u.joined) +
      '</div>' +
      '<div class="infoKey">Level</div><div class="infoVal mono">' +
      esc(u.level) +
      '</div>' +
      '<div class="infoKey">Solved</div><div class="infoVal">' +
      DONE_IDS.length +
      ' / ' +
      u.total +
      '</div>' +
      '<div class="infoKey">Score</div><div class="infoVal mono">' +
      u.score +
      '</div>' +
      '<div class="infoKey">Rank</div><div class="infoVal">#' +
      u.rank +
      '</div>' +
      '<div class="infoKey">Bio</div><div class="infoVal">' +
      esc(u.bio) +
      '</div>' +
      '<div class="infoKey">Last Active</div><div class="infoVal">' +
      esc(u.lastActive) +
      '</div>' +
      '</div>'
    )
  }

  /* ---------- 视图：排行榜（不需要登录） ---------- */
  function renderLeaderboard() {
    var myName = USER_PROFILE ? USER_PROFILE.username : null

    var html =
      '' +
      '<div class="viewHeader">' +
      '<span class="viewTitle">Leaderboard</span>' +
      '<span class="viewSub">Leaderboard</span>' +
      '</div>' +
      '<div class="rankList">'

    if (LEADERBOARD_DATA.length === 0) {
      html += '<div class="loading-text">Loading...</div>'
    } else {
      for (var i = 0; i < LEADERBOARD_DATA.length; i++) {
        var r = LEADERBOARD_DATA[i]
        var isMe = myName && r.name === myName
        var cls = 'rankRow'
        if (i === 0) cls += ' top1'
        else if (i === 1) cls += ' top2'
        else if (i === 2) cls += ' top3'
        if (isMe) cls += ' me'

        html +=
          '<div class="' +
          cls +
          '">' +
          '<span class="rankNo">#' +
          (i + 1) +
          '</span>' +
          '<span class="rankUser">' +
          esc(r.name) +
          (isMe ? '  ← me' : '') +
          '</span>' +
          '<span class="rankSolved">✔ ' +
          r.solved +
          ' solved</span>' +
          '<span class="rankScore">' +
          r.score +
          ' pt</span>' +
          '</div>'
      }
    }

    html += '</div>'
    return html
  }

  /* ---------- 视图：已完成题目 ---------- */
  function renderDone() {
    if (!USER_PROFILE) {
      return renderEmpty('Solved', 'Please sign in to view your solved questions.')
    }

    var total = USER_PROFILE.total
    var html =
      '' +
      '<div class="viewHeader">' +
      '<span class="viewTitle">Solved</span>' +
      '<span class="viewSub">' +
      DONE_DATA.length +
      ' / ' +
      total +
      ' Solved</span>' +
      '</div>' +
      '<div class="doneList">'

    if (DONE_DATA.length === 0) {
      html += '<div class="loading-text">No solved questions yet</div>'
    } else {
      for (var i = 0; i < DONE_DATA.length; i++) {
        var d = DONE_DATA[i]
        html +=
          '<div class="doneRow">' +
          '<span class="doneCheck">✓</span>' +
          '<span class="doneId">#' +
          d.id +
          '</span>' +
          '<span class="doneTitle">' +
          esc(d.title) +
          '</span>' +
          '<span class="doneType">' +
          esc(TYPE_LABELS[d.type] || d.type) +
          '</span>' +
          '<span class="doneStars">' +
          stars(d.diff) +
          '</span>' +
          '</div>'
      }
    }

    html += '</div>'
    return html
  }

  /* ---------- 视图：外观设置（不需要登录） ---------- */
  function getTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY)
      if (t === 'light' || t === 'dark') return t
    } catch (e) {}
    return 'dark'
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('theme-light')
    } else {
      document.body.classList.remove('theme-light')
    }
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch (e) {}
  }

  function renderTheme() {
    var cur = getTheme()
    return (
      '' +
      '<div class="viewHeader">' +
      '<span class="viewTitle">Appearance</span>' +
      '<span class="viewSub">Appearance</span>' +
      '</div>' +
      '<div class="themeSection">' +
      '<div class="themeLabel">Theme Mode</div>' +
      '<div class="themeOptions">' +
      '<button type="button" class="themeCard' +
      (cur === 'light' ? ' active' : '') +
      '" data-theme="light">' +
      '<span class="themePreview light">λ</span>' +
      '<span class="themeCardName">Light</span>' +
      '<span class="themeCardDesc">Light background · dark text</span>' +
      '</button>' +
      '<button type="button" class="themeCard' +
      (cur === 'dark' ? ' active' : '') +
      '" data-theme="dark">' +
      '<span class="themePreview dark">λ</span>' +
      '<span class="themeCardName">Dark</span>' +
      '<span class="themeCardDesc">Dark background · light text</span>' +
      '</button>' +
      '</div>' +
      '</div>'
    )
  }

  /* ---------- 视图切换 ---------- */
  var RENDERERS = {
    info: renderInfo,
    leaderboard: renderLeaderboard,
    done: renderDone,
    theme: renderTheme
  }

  var currentView = 'info'

  function setActiveView(view) {
    if (!RENDERERS[view]) view = 'info'
    currentView = view

    for (var i = 0; i < navBtns.length; i++) {
      var btn = navBtns[i]
      if (btn.dataset.view === view) btn.classList.add('active')
      else btn.classList.remove('active')
    }

    if (content) {
      content.innerHTML = RENDERERS[view]()
      content.scrollTop = 0
    }

    if (view === 'theme') bindThemeCards()
  }

  function bindThemeCards() {
    var cards = content ? content.querySelectorAll('.themeCard') : []
    for (var i = 0; i < cards.length; i++) {
      ;((card) => {
        card.addEventListener('click', function () {
          var theme = this.dataset.theme
          applyTheme(theme)
          for (var j = 0; j < cards.length; j++) {
            cards[j].classList.remove('active')
          }
          this.classList.add('active')
        })
      })(cards[i])
    }
  }

  if (navBox) {
    navBox.addEventListener('click', (e) => {
      var btn = e.target.closest ? e.target.closest('.profileNavBtn') : null
      if (!btn) return
      setActiveView(btn.dataset.view)
    })
  }

  /* ---------- 决定当前用户：只认 localStorage.quiz_user ---------- */
  function pickCurrentUsername() {
    var want = null
    try {
      var raw = localStorage.getItem('quiz_user')
      if (raw) {
        var u = JSON.parse(raw)
        if (u && u.username) want = String(u.username).trim()
      }
    } catch (e) {}
    if (!want) return null
    if (!ALL_USERS || !ALL_USERS.users) return null

    if (ALL_USERS.users[want]) return want

    var lower = want.toLowerCase()
    for (var k in ALL_USERS.users) {
      if (Object.hasOwn(ALL_USERS.users, k)) {
        if (String(k).trim().toLowerCase() === lower) return k
      }
    }
    return null
  }

  function applyCurrentUser() {
    var name = pickCurrentUsername()
    if (!name || !ALL_USERS.users || !ALL_USERS.users[name]) {
      USER_PROFILE = null
      DONE_IDS = []
      DONE_DATA = []
      return
    }
    USER_PROFILE = ALL_USERS.users[name]
    DONE_IDS = USER_PROFILE.done || []
    buildDoneData()
  }

  /* ---------- 头像 ---------- */
  function resolveAvatar(user) {
    if (!user) return null

    try {
      var raw = localStorage.getItem('quiz_user')
      if (raw) {
        var u = JSON.parse(raw)
        if (u && u.avatar) return u.avatar
      }
    } catch (e) {}

    if (user.avatar) return user.avatar
    return null
  }

  function renderAvatar(user) {
    if (!avatarBox) return

    var src = resolveAvatar(user)

    if (!src) {
      avatarBox.innerHTML = '<span class="profileAvatarFallback">λ</span>'
      return
    }

    var img = document.createElement('img')
    img.alt = 'avatar'
    img.src = src
    img.onerror = () => {
      var span = document.createElement('span')
      span.className = 'profileAvatarFallback'
      span.textContent = user && user.username ? user.username.charAt(0).toUpperCase() : 'λ'
      avatarBox.innerHTML = ''
      avatarBox.appendChild(span)
    }

    avatarBox.innerHTML = ''
    avatarBox.appendChild(img)
  }

  /* ---------- 顶部头像区 ---------- */
  function loadUser() {
    if (!USER_PROFILE) {
      if (nameEl) nameEl.textContent = 'Guest'
      if (emailEl) emailEl.textContent = '--'
      if (avatarBox) {
        avatarBox.innerHTML = '<span class="profileAvatarFallback">λ</span>'
      }
      return
    }

    if (nameEl) nameEl.textContent = USER_PROFILE.username
    if (emailEl) emailEl.textContent = USER_PROFILE.email
    renderAvatar(USER_PROFILE)
  }

  /* ---------- 退出登录：清 state + 刷新页面 ---------- */
  function logout() {
    try {
      localStorage.removeItem('quiz_user')
    } catch (e) {}
    window.location.reload()
  }

  if (logoutBtn) logoutBtn.addEventListener('click', logout)

  /* ---------- 加载数据 ---------- */
  function loadJSON(url) {
    return fetch(url).then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url)
      return r.json()
    })
  }

  function loadAllData() {
    var pUsers = loadJSON('../datas/users.json').catch(() => ({}))
    var pBoard = loadJSON('../datas/leaderboard.json').catch(() => ({ leaderboard: [] }))
    var pQuiz = loadJSON('../datas/quiz.json').catch(() => ({ quiz: [] }))

    return Promise.all([pUsers, pBoard, pQuiz])
      .then((results) => {
        ALL_USERS = results[0] || {}
        LEADERBOARD_DATA = results[1] && results[1].leaderboard ? results[1].leaderboard : []

        QUIZ_MAP = {}
        var quizList = results[2] && results[2].quiz ? results[2].quiz : []
        for (var i = 0; i < quizList.length; i++) {
          QUIZ_MAP[quizList[i].id] = quizList[i]
        }

        applyCurrentUser()
        loadUser()
        setActiveView(currentView || 'info')
      })
      .catch((err) => {
        console.error('profile data load failed:', err)
        if (content) {
          content.innerHTML = '<div class="error-text">⚠️ Failed to load data</div>'
        }
      })
  }

  /* ---------- 初始化 ---------- */
  applyTheme(getTheme())
  setActiveView('info')
  loadAllData()

  window.__profile = {
    setActiveView: setActiveView,
    loadUser: loadUser,
    applyTheme: applyTheme,
    getTheme: getTheme,
    reload: loadAllData
  }
})()
