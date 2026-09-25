/* =========================================================
 * filter.js —— 过滤弹窗（fetch 加载 components/filter.html）
 * 流程：
 *   1. fetch 弹层 HTML，插入 body
 *   2. 轮询等待 #filterBtn / #filterOverlay 出现
 *   3. 绑定按钮、关闭、重置、应用
 *
 * 对外接口：
 *   window.FilterPanel.open()
 *   window.FilterPanel.close()
 *   window.FilterPanel.reset()
 *   window.FilterPanel.getActiveTypes()
 *   window.FilterPanel.isFiltering()
 *   window.FilterPanel.onChange = function(activeTypes) {}
 * ========================================================= */
;(() => {
  /* ---------- 类型定义（与 quiz.json 的 problem_type 对齐） ---------- */
  var TYPE_LABELS = {
    infer_type: 'Type Signature',
    find_function: 'Find Function',
    predict_behavior: 'Choice',
    satisfy_law: 'Satisfy Law',
    fix_laziness: 'Fix Laziness'
  }

  var TYPE_ORDER = ['infer_type', 'find_function', 'predict_behavior', 'satisfy_law', 'fix_laziness']

  /* ---------- 状态 ---------- */
  var activeTypes = {}
  var pendingTypes = {}

  for (var i = 0; i < TYPE_ORDER.length; i++) {
    activeTypes[TYPE_ORDER[i]] = true
    pendingTypes[TYPE_ORDER[i]] = true
  }

  function $(id) {
    return document.getElementById(id)
  }

  var api = {
    onChange: null,

    getActiveTypes: () => {
      var copy = {}
      for (var k in activeTypes) {
        if (Object.hasOwn(activeTypes, k)) copy[k] = activeTypes[k]
      }
      return copy
    },

    isFiltering: () => {
      for (var i = 0; i < TYPE_ORDER.length; i++) {
        if (!activeTypes[TYPE_ORDER[i]]) return true
      }
      return false
    },

    open: open,
    close: close,
    reset: resetActive
  }

  /* ---------- 渲染选项 ---------- */
  function renderOptions() {
    var box = $('filterOptions')
    if (!box) return

    var html = ''
    for (var i = 0; i < TYPE_ORDER.length; i++) {
      var key = TYPE_ORDER[i]
      var checked = pendingTypes[key] ? ' checked' : ''
      html +=
        '<label class="filterOption">' +
        '<input type="checkbox" value="' +
        key +
        '"' +
        checked +
        ' />' +
        '<span class="filterOptionLabel">' +
        (TYPE_LABELS[key] || key) +
        '</span>' +
        '<span class="filterOptionKey">' +
        key +
        '</span>' +
        '</label>'
    }
    box.innerHTML = html
  }

  /* ---------- 按钮高亮 ---------- */
  function syncBtn() {
    var btn = $('filterBtn')
    if (!btn) return
    if (api.isFiltering()) btn.classList.add('active')
    else btn.classList.remove('active')
  }

  /* ---------- 打开 / 关闭 ---------- */
  function open() {
    var overlay = $('filterOverlay')
    if (!overlay) {
      console.warn('filter.js: #filterOverlay 尚未注入')
      return
    }

    for (var i = 0; i < TYPE_ORDER.length; i++) {
      pendingTypes[TYPE_ORDER[i]] = !!activeTypes[TYPE_ORDER[i]]
    }
    renderOptions()

    overlay.hidden = false
    document.body.classList.add('no-scroll')

    var applyBtn = $('filterApply')
    if (applyBtn) applyBtn.focus()
  }

  function close() {
    var overlay = $('filterOverlay')
    if (overlay) overlay.hidden = true
    document.body.classList.remove('no-scroll')
  }

  /* ---------- 广播变化 ---------- */
  function emitChange() {
    var detail = { activeTypes: api.getActiveTypes() }

    if (typeof api.onChange === 'function') {
      api.onChange(detail.activeTypes)
    }

    try {
      window.dispatchEvent(new CustomEvent('filter:change', { detail: detail }))
    } catch (e) {
      var ev = document.createEvent('CustomEvent')
      ev.initCustomEvent('filter:change', false, false, detail)
      window.dispatchEvent(ev)
    }
  }

  /* ---------- 应用 / 重置 ---------- */
  function applyPending() {
    for (var i = 0; i < TYPE_ORDER.length; i++) {
      var key = TYPE_ORDER[i]
      activeTypes[key] = pendingTypes[key] !== false
    }
    syncBtn()
    close()
    emitChange()
  }

  function resetPending() {
    for (var i = 0; i < TYPE_ORDER.length; i++) {
      pendingTypes[TYPE_ORDER[i]] = true
    }
    renderOptions()
  }

  function resetActive() {
    for (var i = 0; i < TYPE_ORDER.length; i++) {
      activeTypes[TYPE_ORDER[i]] = true
      pendingTypes[TYPE_ORDER[i]] = true
    }
    syncBtn()
    renderOptions()
    emitChange()
  }

  /* ---------- 绑定 ---------- */
  function bindAll() {
    var btn = $('filterBtn')
    var overlay = $('filterOverlay')

    if (!btn || !overlay) return false
    if (btn.getAttribute('data-bound') === '1') return true

    btn.setAttribute('data-bound', '1')

    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (overlay.hidden) open()
      else close()
    })

    var closeBtn = $('filterClose')
    var applyBtn = $('filterApply')
    var resetBtn = $('filterReset')
    var box = $('filterOptions')

    if (closeBtn && closeBtn.getAttribute('data-bound') !== '1') {
      closeBtn.setAttribute('data-bound', '1')
      closeBtn.addEventListener('click', close)
    }

    if (applyBtn && applyBtn.getAttribute('data-bound') !== '1') {
      applyBtn.setAttribute('data-bound', '1')
      applyBtn.addEventListener('click', applyPending)
    }

    if (resetBtn && resetBtn.getAttribute('data-bound') !== '1') {
      resetBtn.setAttribute('data-bound', '1')
      resetBtn.addEventListener('click', resetPending)
    }

    if (box && box.getAttribute('data-bound') !== '1') {
      box.setAttribute('data-bound', '1')
      box.addEventListener('change', (e) => {
        var t = e.target
        if (t && t.type === 'checkbox') {
          pendingTypes[t.value] = t.checked
        }
      })
    }

    if (overlay.getAttribute('data-bound') !== '1') {
      overlay.setAttribute('data-bound', '1')
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close()
      })
    }

    if (document.body.getAttribute('data-filter-esc') !== '1') {
      document.body.setAttribute('data-filter-esc', '1')
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return
        var ov = $('filterOverlay')
        if (ov && !ov.hidden) close()
      })
    }

    syncBtn()

    try {
      window.dispatchEvent(new Event('filter:ready'))
    } catch (err) {}

    return true
  }

  /* ---------- 轮询绑定 ---------- */
  function tryBindUntilReady(maxMs) {
    var start = Date.now()
    var timer = setInterval(() => {
      if (bindAll()) {
        clearInterval(timer)
        return
      }
      if (Date.now() - start > maxMs) {
        clearInterval(timer)
        console.warn('filter.js: 未找到 #filterBtn 或 #filterOverlay，放弃绑定')
      }
    }, 60)
  }

  /* ---------- 计算 fetch 路径 ---------- */
  function getFilterHtmlPath() {
    // 页面在 /index.html        → './components/filter.html'
    // 页面在 /pages/xxx.html    → '../components/filter.html'
    var path = window.location.pathname || ''
    var dir = path.replace(/\/[^/]*$/, '/')
    if (/\/pages\/?$/.test(dir) || /\/pages\//.test(dir)) {
      return '../components/filter.html'
    }
    return './components/filter.html'
  }

  /* ---------- fetch 注入弹层 ---------- */
  function injectOverlay() {
    if ($('filterOverlay')) return Promise.resolve()

    var url = getFilterHtmlPath()

    return fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url)
        return r.text()
      })
      .then((html) => {
        var holder = document.createElement('div')
        holder.innerHTML = html
        var node = holder.querySelector('#filterOverlay')
        if (!node) throw new Error('filter.html 中找不到 #filterOverlay')
        document.body.appendChild(node)
      })
      .catch((err) => {
        console.error('filter.js: 加载 filter.html 失败 →', err)
      })
  }

  /* ---------- 初始化 ---------- */
  function init() {
    injectOverlay().then(() => {
      if (bindAll()) return
      tryBindUntilReady(5000)
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  /* ---------- 对外暴露 ---------- */
  window.FilterPanel = api
})()
