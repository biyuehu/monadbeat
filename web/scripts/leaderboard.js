/* 排行榜页面 —— 只读取 datas/leaderboard.json */
(function () {
    'use strict';

    /* ---------- 主题（与其它页面共用 quiz_theme） ---------- */
    var THEME_KEY = 'quiz_theme';

    function applyTheme(theme) {
        if (theme === 'light') document.body.classList.add('theme-light');
        else document.body.classList.remove('theme-light');
        document.documentElement.classList.remove('theme-light-pre');
    }

    function getTheme() {
        try {
            var t = localStorage.getItem(THEME_KEY);
            if (t === 'light' || t === 'dark') return t;
        } catch (e) {}
        return 'dark';
    }

    applyTheme(getTheme());

    window.addEventListener('storage', function (e) {
        if (e.key === THEME_KEY) applyTheme(e.newValue || 'dark');
    });

    /* ---------- DOM ---------- */
    var board = document.getElementById('board');
    var statusText = document.getElementById('statusText');

    /* ---------- 当前用户名（用于标 me） ---------- */
    function getCurrentUsername() {
        try {
            var raw = localStorage.getItem('quiz_user');
            if (raw) {
                var u = JSON.parse(raw);
                if (u && u.username) return u.username;
            }
        } catch (e) {}
        return null;
    }

    /* ---------- 渲染 ---------- */
    function esc(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function render(list) {
        if (!board) return;

        if (!list || list.length === 0) {
            board.innerHTML = '<div class="error-text">No leaderboard data</div>';
            if (statusText) statusText.textContent = 'Empty';
            return;
        }

        var myName = getCurrentUsername();

        var html = '';
        for (var i = 0; i < list.length; i++) {
            var r = list[i];
            var isMe = (myName && r.name === myName);
            var cls = 'row';
            if (i === 0) cls += ' top1';
            else if (i === 1) cls += ' top2';
            else if (i === 2) cls += ' top3';
            if (isMe) cls += ' me';

            html += '<div class="' + cls + '">' +
                '<span class="rank">#' + (i + 1) + '</span>' +
                '<span class="user">' + esc(r.name) +
                    (isMe ? '<span class="meTag">me</span>' : '') +
                '</span>' +
                '<span class="solved">✔ ' + r.solved + '</span>' +
                '<span class="score">' + r.score + ' pt</span>' +
                '</div>';
        }
        board.innerHTML = html;

        if (statusText) {
            statusText.textContent = 'Total ' + list.length + ' players';
        }
    }

    /* ---------- 加载数据 ---------- */
    function loadBoard() {
        if (!board) return;
        board.innerHTML = '<div class="loading-text">Loading...</div>';

        fetch('../datas/leaderboard.json')
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function (data) {
                var list = (data && data.leaderboard) ? data.leaderboard : [];
                render(list);
            })
            .catch(function (err) {
                console.error('leaderboard.json load failed:', err);
                board.innerHTML = '<div class="error-text">⚠️ Load failed: ' + err.message + '</div>';
                if (statusText) statusText.textContent = '❌ Load failed';
            });
    }

    loadBoard();

    /* ---------- 对外暴露 ---------- */
    window.__leaderboard = {
        reload: loadBoard,
        render: render,
        applyTheme: applyTheme,
        getTheme: getTheme
    };
})();