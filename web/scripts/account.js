(function () {
    'use strict';

    /* ---------- 主题 ---------- */
    var THEME_KEY = 'quiz_theme';

    function applyTheme(theme) {
        if (theme === 'light') document.body.classList.add('theme-light');
        else document.body.classList.remove('theme-light');
    }
    function getTheme() {
        try {
            var t = localStorage.getItem(THEME_KEY);
            if (t === 'light' || t === 'dark') return t;
        } catch (e) {}
        return 'dark';
    }
    applyTheme(getTheme());

    /* ---------- DOM ---------- */
    var loginForm = document.getElementById('loginForm');
    var signupForm = document.getElementById('signupForm');

    var loginUsername = document.getElementById('loginUsername');
    var loginPassword = document.getElementById('loginPassword');
    var loginUsernameError = document.getElementById('loginUsernameError');
    var loginPasswordError = document.getElementById('loginPasswordError');
    var loginMsg = document.getElementById('loginMsg');
    var toSignup = document.getElementById('toSignup');

    var signupName = document.getElementById('signupName');
    var signupEmail = document.getElementById('signupEmail');
    var signupPassword = document.getElementById('signupPassword');
    var signupCaptcha = document.getElementById('signupCaptcha');
    var signupNameError = document.getElementById('signupNameError');
    var signupEmailError = document.getElementById('signupEmailError');
    var signupPasswordError = document.getElementById('signupPasswordError');
    var signupCaptchaError = document.getElementById('signupCaptchaError');
    var signupMsg = document.getElementById('signupMsg');
    var toLogin = document.getElementById('toLogin');
    var captchaCanvas = document.getElementById('captchaCanvas');

    var welcomeTitle = document.getElementById('welcomeTitle');
    var welcomeLine1 = document.getElementById('welcomeLine1');
    var welcomeLine2 = document.getElementById('welcomeLine2');
    var welcomeLine3 = document.getElementById('welcomeLine3');

    /* ---------- 视图切换 ---------- */
    var currentView = 'login';

    function showLogin() {
        currentView = 'login';
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        welcomeTitle.textContent = 'WELCOME';
        welcomeLine1.textContent = 'Hello, dear visitor.';
        welcomeLine2.textContent = 'A quiet place for Haskell practice.';
        welcomeLine3.textContent = 'Sign in to keep track of every question you solve.';
        clearLoginErrors();
        if (loginUsername) loginUsername.focus();
    }

    function showSignup() {
        currentView = 'signup';
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        welcomeTitle.textContent = 'SIGN UP';
        welcomeLine1.textContent = 'Create your account to save your progress.';
        welcomeLine2.textContent = 'Everything stays on this machine.';
        welcomeLine3.textContent = 'Fill in the captcha to prove you are human.';
        clearSignupErrors();
        drawCaptcha();
        if (signupName) signupName.focus();
    }

    /* ---------- 工具 ---------- */
    function setFieldError(inputEl, errorEl, message) {
        if (errorEl) errorEl.textContent = message || '';
        if (inputEl) {
            if (message) inputEl.classList.add('invalid');
            else inputEl.classList.remove('invalid');
        }
    }
    function setFormMsg(msgEl, message, type) {
        if (!msgEl) return;
        msgEl.textContent = message || '';
        msgEl.className = 'formMsg' + (type ? ' ' + type : '');
    }
    function isValidEmail(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }

    function clearLoginErrors() {
        setFieldError(loginUsername, loginUsernameError, '');
        setFieldError(loginPassword, loginPasswordError, '');
        setFormMsg(loginMsg, '');
    }
    function clearSignupErrors() {
        setFieldError(signupName, signupNameError, '');
        setFieldError(signupEmail, signupEmailError, '');
        setFieldError(signupPassword, signupPasswordError, '');
        setFieldError(signupCaptcha, signupCaptchaError, '');
        setFormMsg(signupMsg, '');
    }

    /* ---------- 验证码 ---------- */
    var captchaCode = '';
    var CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    function randomCode(len) {
        var s = '';
        for (var i = 0; i < len; i++) {
            s += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
        }
        return s;
    }

    function drawCaptcha() {
        if (!captchaCanvas) return;
        var ctx = captchaCanvas.getContext('2d');
        var W = captchaCanvas.width;
        var H = captchaCanvas.height;
        var light = document.body.classList.contains('theme-light');

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = light ? '#f5f3fa' : '#120d1c';
        ctx.fillRect(0, 0, W, H);

        for (var i = 0; i < 5; i++) {
            ctx.strokeStyle = light ? 'rgba(124,92,191,0.25)' : 'rgba(180,150,230,0.25)';
            ctx.beginPath();
            ctx.moveTo(Math.random() * W, Math.random() * H);
            ctx.lineTo(Math.random() * W, Math.random() * H);
            ctx.stroke();
        }

        for (var j = 0; j < 30; j++) {
            ctx.fillStyle = light ? 'rgba(124,92,191,0.30)' : 'rgba(200,180,240,0.35)';
            ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
        }

        captchaCode = randomCode(4);
        var colorsLight = ['#6b4fa0', '#4b3a70', '#7c5cbf', '#3a5fbf'];
        var colorsDark  = ['#d4a0ff', '#b380e6', '#8fb3ff', '#f0c6ff'];

        for (var k = 0; k < captchaCode.length; k++) {
            ctx.save();
            ctx.font = 'bold ' + (22 + Math.random() * 6).toFixed(0) + 'px JetBrains Mono, monospace';
            ctx.fillStyle = light ? colorsLight[k % 4] : colorsDark[k % 4];
            ctx.textBaseline = 'middle';

            var x = 12 + k * 26 + (Math.random() * 4 - 2);
            var y = H / 2 + (Math.random() * 6 - 3);
            var rot = (Math.random() * 0.4 - 0.2);

            ctx.translate(x, y);
            ctx.rotate(rot);
            ctx.fillText(captchaCode[k], 0, 0);
            ctx.restore();
        }
    }

    /* ---------- users.json 加载与匹配（登录用） ---------- */
    var USERS_DB = null;

    function loadUsers() {
        if (USERS_DB) return Promise.resolve(USERS_DB);

        return fetch('../datas/users.json')
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function (data) {
                USERS_DB = (data && data.users) ? data.users : {};
                return USERS_DB;
            });
    }

    function findUser(db, key) {
        key = String(key || '').trim();
        if (!key) return null;

        if (db[key]) return db[key];

        for (var k in db) {
            if (Object.prototype.hasOwnProperty.call(db, k)) {
                var u = db[k];
                if (u && u.email && u.email.toLowerCase() === key.toLowerCase()) {
                    return u;
                }
            }
        }
        return null;
    }

    /* ---------- 登录 ---------- */
    function handleLogin(e) {
        if (e) e.preventDefault();

        var key = loginUsername ? loginUsername.value.trim() : '';
        var password = loginPassword ? loginPassword.value : '';
        var ok = true;

        setFormMsg(loginMsg, '');

        if (!key) {
            setFieldError(loginUsername, loginUsernameError, 'Please enter your username or email');
            ok = false;
        } else {
            setFieldError(loginUsername, loginUsernameError, '');
        }

        if (!password) {
            setFieldError(loginPassword, loginPasswordError, 'Please enter your password');
            ok = false;
        } else {
            setFieldError(loginPassword, loginPasswordError, '');
        }

        if (!ok) return;

        setFormMsg(loginMsg, 'Checking...', 'info');

        loadUsers().then(function (db) {
            var user = findUser(db, key);

            if (!user) {
                setFieldError(loginUsername, loginUsernameError, 'User does not exist');
                setFormMsg(loginMsg, 'Login failed: user not found', 'error');
                return;
            }

            if (user.password !== password) {
                setFieldError(loginPassword, loginPasswordError, 'Wrong password');
                setFormMsg(loginMsg, 'Login failed: incorrect password', 'error');
                return;
            }

            try {
                localStorage.setItem('quiz_user', JSON.stringify({
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar || ''
                }));
            } catch (err) {}

            setFormMsg(loginMsg, 'Signed in. Redirecting...', 'ok');

            setTimeout(function () {
                window.location.href = './profile.html';
            }, 600);
        }).catch(function (err) {
            console.error('login failed:', err);
            setFormMsg(loginMsg, 'Login failed: could not load users', 'error');
        });
    }

    /* ---------- 注册：POST 到 /api/register，由 server.js 写入 users.json ---------- */
    function handleSignup(e) {
        if (e) e.preventDefault();

        var name = signupName ? signupName.value.trim() : '';
        var email = signupEmail ? signupEmail.value.trim() : '';
        var password = signupPassword ? signupPassword.value : '';
        var captcha = signupCaptcha ? signupCaptcha.value.trim().toUpperCase() : '';
        var ok = true;

        setFormMsg(signupMsg, '');

        if (!name) {
            setFieldError(signupName, signupNameError, 'Please enter your name');
            ok = false;
        } else {
            setFieldError(signupName, signupNameError, '');
        }

        if (!email) {
            setFieldError(signupEmail, signupEmailError, 'Please enter your email');
            ok = false;
        } else if (!isValidEmail(email)) {
            setFieldError(signupEmail, signupEmailError, 'Email format is invalid');
            ok = false;
        } else {
            setFieldError(signupEmail, signupEmailError, '');
        }

        if (!password) {
            setFieldError(signupPassword, signupPasswordError, 'Please enter your password');
            ok = false;
        } else if (password.length < 6) {
            setFieldError(signupPassword, signupPasswordError, 'Password must be at least 6 characters');
            ok = false;
        } else {
            setFieldError(signupPassword, signupPasswordError, '');
        }

        if (!captcha) {
            setFieldError(signupCaptcha, signupCaptchaError, 'Please enter the captcha');
            ok = false;
        } else if (captcha !== captchaCode) {
            setFieldError(signupCaptcha, signupCaptchaError, 'Captcha is incorrect');
            drawCaptcha();
            if (signupCaptcha) signupCaptcha.value = '';
            ok = false;
        } else {
            setFieldError(signupCaptcha, signupCaptchaError, '');
        }

        if (!ok) return;

        setFormMsg(signupMsg, 'Creating account...', 'info');

        fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password
            })
        })
        .then(function (r) {
            return r.json().then(function (d) {
                return { status: r.status, body: d };
            });
        })
        .then(function (res) {
            if (!res.body || !res.body.ok) {
                var reason = (res.body && res.body.error) ? res.body.error : 'unknown';
                var msg;
                if (reason === 'user exists') {
                    msg = 'That username is already taken';
                    setFieldError(signupName, signupNameError, msg);
                } else if (reason === 'missing fields') {
                    msg = 'Please fill in all fields';
                } else {
                    msg = 'Registration failed';
                }
                setFormMsg(signupMsg, 'Sign-up failed: ' + reason, 'error');
                return;
            }

            setFormMsg(signupMsg, 'Account created. Switching to sign in...', 'ok');

            // 让后续登录读到最新的 users.json
            USERS_DB = null;

            setTimeout(function () {
                showLogin();
                if (loginUsername) loginUsername.value = name;
            }, 700);
        })
        .catch(function (err) {
            console.error('signup failed:', err);
            setFormMsg(signupMsg, 'Sign-up failed: network error', 'error');
        });
    }

    /* ---------- 输入时清除错误 ---------- */
    function bindClear(inputEl, errorEl, msgEl) {
        if (!inputEl) return;
        inputEl.addEventListener('input', function () {
            setFieldError(inputEl, errorEl, '');
            setFormMsg(msgEl, '');
        });
    }

    bindClear(loginUsername, loginUsernameError, loginMsg);
    bindClear(loginPassword, loginPasswordError, loginMsg);
    bindClear(signupName, signupNameError, signupMsg);
    bindClear(signupEmail, signupEmailError, signupMsg);
    bindClear(signupPassword, signupPasswordError, signupMsg);
    bindClear(signupCaptcha, signupCaptchaError, signupMsg);

    /* ---------- 事件 ---------- */
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (toSignup) toSignup.addEventListener('click', showSignup);
    if (toLogin) toLogin.addEventListener('click', showLogin);

    if (captchaCanvas) {
        captchaCanvas.addEventListener('click', function () {
            drawCaptcha();
            if (signupCaptcha) signupCaptcha.value = '';
            setFieldError(signupCaptcha, signupCaptchaError, '');
        });
    }

    /* ---------- 初始化 ---------- */
    showLogin();

    window.__account = {
        showLogin: showLogin,
        showSignup: showSignup,
        drawCaptcha: drawCaptcha,
        loadUsers: loadUsers,
        findUser: findUser,
        applyTheme: applyTheme,
        getTheme: getTheme
    };

})();