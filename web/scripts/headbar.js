(function () {
    'use strict';

    function getRootPrefix() {
        var path = window.location.pathname || '';
        var dir = path.replace(/\/[^\/]*$/, '/');
        if (/\/pages\/?$/.test(dir) || /\/pages\//.test(dir)) {
            return '../';
        }
        return './';
    }

    function detectPageKey() {
        var path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('account') > -1) return 'login';
        if (path.indexOf('signup') > -1) return 'login';
        if (path.indexOf('login') > -1) return 'login';
        if (path.indexOf('leaderboard') > -1) return 'rank';
        if (path.indexOf('profile') > -1) return 'profile';
        return 'problems';
    }

    function fixLinks(root, bar) {
        var links = bar.querySelectorAll('.gotoLink[data-href]');
        for (var i = 0; i < links.length; i++) {
            var el = links[i];
            var rel = el.getAttribute('data-href');
            if (rel) el.setAttribute('href', root + rel);
        }
    }

    function setActive(key, bar) {
        var links = bar.querySelectorAll('.gotoLink');
        for (var i = 0; i < links.length; i++) {
            var el = links[i];
            if (el.getAttribute('data-key') === key) el.classList.add('active');
            else el.classList.remove('active');
        }
    }

    function isLoggedIn() {
        try {
            var raw = localStorage.getItem('quiz_user');
            if (!raw) return false;
            var u = JSON.parse(raw);
            return !!(u && u.username);
        } catch (e) {
            return false;
        }
    }

    /* 登录 → 隐藏；未登录 → 显示 */
    function applyAuthState(bar) {
        var loginLink = bar.querySelector('#loginLink');
        if (!loginLink) return;

        if (isLoggedIn()) {
            loginLink.style.display = 'none';
        } else {
            loginLink.style.display = '';
        }
    }

    function mount(html) {
        var root = getRootPrefix();

        var holder = document.createElement('div');
        holder.innerHTML = html;

        var bar = holder.querySelector('#headbar');
        if (!bar) return;

        document.body.insertBefore(bar, document.body.firstChild);

        fixLinks(root, bar);
        setActive(detectPageKey(), bar);
        applyAuthState(bar);

        document.body.classList.add('has-headbar');

        window.addEventListener('storage', function (e) {
            if (e.key === 'quiz_user') applyAuthState(bar);
        });

        window.addEventListener('auth:change', function () {
            applyAuthState(bar);
        });

        try {
            window.dispatchEvent(new Event('headbar:ready'));
        } catch (e) {}
    }

    function load() {
        var root = getRootPrefix();
        var url = root + 'components/headbar.html';

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status === 200 || xhr.status === 0) {
                mount(xhr.responseText);
            } else {
                console.error('headbar 加载失败:', xhr.status, url);
            }
        };
        xhr.send();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load);
    } else {
        load();
    }
})();