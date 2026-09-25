;(() => {
  var THEME_KEY = 'quiz_theme'

  function applyTheme(theme) {
    if (theme === 'light') document.body.classList.add('theme-light')
    else document.body.classList.remove('theme-light')
  }
  function getTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY)
      if (t === 'light' || t === 'dark') return t
    } catch (e) {}
    return 'dark'
  }
  applyTheme(getTheme())

  /* ---------- 登录态 ---------- */
  function getCurrentUser() {
    try {
      var raw = localStorage.getItem('quiz_user')
      if (raw) {
        var u = JSON.parse(raw)
        if (u && u.username) return u
      }
    } catch (e) {}
    return null
  }

  var grid = document.getElementById('problemGrid')
  var count = document.getElementById('problemCount')
  var statusText = document.getElementById('statusText')

  var TYPE_LABELS = {
    infer_type: 'Type Signature',
    find_function: 'Find Function',
    predict_behavior: 'Choice',
    satisfy_law: 'Satisfy Law',
    fix_laziness: 'Fix Laziness'
  }
  var STATE_MAP = { undo: 'Todo', done: 'Passed', error: 'Failed' }
  var STATE_CLASS = { undo: 'undo', done: 'done', error: 'error' }

  var allQuiz = []
  var DONE_IDS = [] // 当前用户已完成的题号，从 users.json 读取

  /* ---------- 已完成的判断：查 users.json 里的 done 数组 ---------- */
  function getState(id) {
    return DONE_IDS.indexOf(id) > -1 ? 'done' : 'undo'
  }

  function stars(diff) {
    var s = ''
    for (var i = 0; i < diff; i++) s += '★'
    for (var i = diff; i < 3; i++) s += '☆'
    return s
  }

  function getVisibleQuiz() {
    var active = window.FilterPanel && window.FilterPanel.getActiveTypes ? window.FilterPanel.getActiveTypes() : {}
    var out = []
    for (var i = 0; i < allQuiz.length; i++) {
      var p = allQuiz[i]
      if (Object.hasOwn(active, p.problem_type) && !active[p.problem_type]) continue
      out.push(p)
    }
    return out
  }

  /* ---------- 未登录占位 ---------- */
  function showSignInRequired() {
    if (!grid) return

    grid.innerHTML =
      '<div class="emptyNotice">' +
      '<div class="emptyTitle">Sign in required</div>' +
      '<div class="emptyText">Please sign in to browse the question list.</div>' +
      '<a class="emptyBtn" href="./pages/account.html">Sign in</a>' +
      '</div>'

    if (count) count.textContent = '--'
    if (statusText) statusText.textContent = 'Not signed in'
  }

  /* ---------- 渲染 ---------- */
  function renderList(list) {
    if (!grid) return
    var total = allQuiz.length
    var shown = list ? list.length : 0

    if (total === 0) {
      grid.innerHTML = '<div class="error-text">No questions</div>'
      count.textContent = '0 questions'
      statusText.textContent = 'Haskell Practice'
      return
    }
    if (shown === 0) {
      grid.innerHTML = '<div class="loading-text">🔍 No questions match the filter</div>'
      count.textContent = '0 / ' + total + ' questions'
      statusText.textContent = 'No results after filtering'
      return
    }

    count.textContent = shown === total ? total + ' questions' : shown + ' / ' + total + ' questions'
    statusText.textContent =
      shown === total ? 'Total ' + total + ' questions' : 'Showing ' + shown + ' / ' + total + ' questions'

    var html = ''
    for (var i = 0; i < list.length; i++) {
      var p = list[i]
      var cfg = p.judge_config || {}
      var state = getState(p.id)
      var typeLabel = TYPE_LABELS[p.problem_type] || (p.problem_type ? String(p.problem_type).slice(0, 2) : '--')
      var diff = p.difficulty || ((p.id * 7 + 3) % 3) + 1
      var icon = state === 'done' ? '✓' : state === 'error' ? '✗' : '○'
      var title = cfg.display_snippet || cfg.display_code || p.functionName || cfg.question || 'Question ' + p.id
      var index = typeof p.__index === 'number' ? p.__index : i

      html +=
        '<div class="problemItem" data-index="' +
        index +
        '">' +
        '<span class="p-status">' +
        icon +
        '</span>' +
        '<span class="p-id">' +
        p.id +
        '</span>' +
        '<span class="p-title">' +
        title +
        '</span>' +
        '<div class="p-tags"><span class="p-tag">' +
        typeLabel +
        '</span></div>' +
        '<span class="p-diff">Difficulty: ' +
        stars(diff) +
        '</span>' +
        '<span class="p-state ' +
        STATE_CLASS[state] +
        '">' +
        STATE_MAP[state] +
        '</span>' +
        '</div>'
    }
    grid.innerHTML = html

    var items = grid.querySelectorAll('.problemItem')
    for (var j = 0; j < items.length; j++) {
      ;((el) => {
        el.addEventListener('click', function () {
          window.location.href = 'pages/quiz.html?index=' + this.dataset.index
        })
      })(items[j])
    }
  }

  /* ---------- 加载 users.json，取当前用户的 done ---------- */
  function loadDoneIds() {
    var user = getCurrentUser()
    if (!user) {
      DONE_IDS = []
      return Promise.resolve([])
    }

    return fetch('./datas/users.json')
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.json()
      })
      .then((data) => {
        var users = data && data.users ? data.users : {}
        var me = users[user.username]
        DONE_IDS = me && me.done ? me.done.slice() : []
        return DONE_IDS
      })
      .catch((err) => {
        console.error('users.json load failed:', err)
        DONE_IDS = []
        return DONE_IDS
      })
  }

  /* ---------- 加载题目 ---------- */
  function loadProblems() {
    if (!getCurrentUser()) {
      showSignInRequired()
      return
    }

    var params = new URLSearchParams(window.location.search)
    var url = params.get('data') || './datas/quiz.json'

    grid.innerHTML = '<div class="loading-text">⏳ Loading...</div>'

    Promise.all([
      loadDoneIds(),
      fetch(url).then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.json()
      })
    ])
      .then((results) => {
        var data = results[1]
        if (!data.quiz || data.quiz.length === 0) throw new Error('Invalid data')
        allQuiz = data.quiz
        for (var i = 0; i < allQuiz.length; i++) allQuiz[i].__index = i
        renderList(getVisibleQuiz())
      })
      .catch((e) => {
        console.error('Load failed:', e)
        grid.innerHTML = '<div class="error-text">⚠️ Load failed: ' + e.message + '</div>'
        count.textContent = 'Load failed'
        statusText.textContent = '❌ Load failed'
      })
  }

  loadProblems()

  window.addEventListener('filter:change', () => {
    if (allQuiz.length) renderList(getVisibleQuiz())
  })

  window.__main = {
    renderList: renderList,
    loadProblems: loadProblems,
    getVisibleQuiz: getVisibleQuiz,
    applyTheme: applyTheme,
    getTheme: getTheme,
    loadDoneIds: loadDoneIds
  }
})()
