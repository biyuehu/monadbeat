(function() {
    'use strict';

    /* ===== 主题（与其它页面共用 quiz_theme） ===== */
    var THEME_KEY = 'quiz_theme';

    function applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('theme-light');
        } else {
            document.body.classList.remove('theme-light');
        }
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

    // ===== DOM =====
    var $ = function(id) { return document.getElementById(id); };
    var typeInput = $('typeInput');
    var submitBtn = $('submitBtn');
    var resetBtn = $('resetBtn');
    var codeBlock = $('codeBlock');
    var typeInputPrefix = $('typeInputPrefix');
    var progressInfo = $('progressInfo');
    var statusText = $('statusText');
    var feedbackContainer = $('feedbackContainer');
    var questionLabel = $('questionLabel');
    var pageTitle = $('pageTitle');
    var inputLabel = $('inputLabel');
    var inputArea = $('inputArea');
    var choiceArea = $('choiceArea');
    var choiceOptions = $('choiceOptions');

    // ===== 状态 =====
    var quiz = [];
    var idx = 0;
    var submitting = false;
    var complete = false;
    var selected = -1;

    // ===== 高亮关键字集合 =====
    var KEYWORDS = {
        'data': 1, 'class': 1, 'instance': 1, 'where': 1,
        'type': 1, 'newtype': 1, 'import': 1, 'qualified': 1,
        'as': 1, 'deriving': 1, 'do': 1, 'let': 1, 'in': 1,
        'case': 1, 'of': 1, 'if': 1, 'then': 1, 'else': 1
    };

    var FUNCTIONS = {
        'filterWithKey': 1, 'error': 1, 'take': 1, 'head': 1, 'tail': 1,
        'map': 1, 'filter': 1, 'foldr': 1, 'foldl': 1, 'sortOn': 1,
        'negate': 1, 'fmap': 1, 'pure': 1, 'return': 1, 'concat': 1,
        'maybe': 1, 'lookup': 1, 'zipWith': 1, 'arbitrary': 1
    };

    var TYPES = {
        'Box': 1, 'Maybe': 1, 'Either': 1, 'IO': 1, 'Map': 1,
        'List': 1, 'Int': 1, 'Bool': 1, 'Char': 1, 'String': 1,
        'Functor': 1, 'Applicative': 1, 'Monad': 1,
        'Arbitrary': 1, 'Show': 1, 'Eq': 1
    };

    // ===== 加载 =====
    function loadQuiz() {
        var params = new URLSearchParams(window.location.search);
        var url = params.get('data') || '../datas/quiz.json';

        fetch(url)
            .then(function(r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
            .then(function(data) {
                if (data.quiz && data.quiz.length) {
                    quiz = data.quiz;
                    render(0);
                } else throw new Error('Invalid data');
            })
            .catch(function(e) {
                console.error(e);
                showFeedback('⚠️ Load failed: ' + e.message, 'error');
                statusText.textContent = '❌ Load failed';
            });
    }

    // ===== HTML 转义 =====
    function escapeHTML(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // ===== 设置代码块 =====
    function setCode(html) {
        codeBlock.innerHTML = html;
    }

    // ===== 代码高亮（一次扫描，不二次匹配） =====
    function highlight(code) {
        if (code == null) return '';

        var text = escapeHTML(String(code));
        var n = text.length;
        var out = '';
        var i = 0;

        while (i < n) {
            // 注释：-- 到行尾
            if (text.charAt(i) === '-' && text.charAt(i + 1) === '-') {
                var endLine = text.indexOf('\n', i);
                if (endLine === -1) endLine = n;
                out += '<span class="comment">' + text.slice(i, endLine) + '</span>';
                i = endLine;
                continue;
            }

            // 字符串： "..."
            if (text.charAt(i) === '&' && text.substr(i, 6) === '&quot;') {
                var j = i + 6;
                while (j < n && text.substr(j, 6) !== '&quot;') j++;
                if (j < n) j += 6;
                out += '<span class="string">' + text.slice(i, j) + '</span>';
                i = j;
                continue;
            }

            // 标识符
            var ch = text.charAt(i);
            if (/[A-Za-z_]/.test(ch)) {
                var k = i + 1;
                while (k < n && /[A-Za-z0-9_']/.test(text.charAt(k))) k++;
                var word = text.slice(i, k);

                if (Object.prototype.hasOwnProperty.call(KEYWORDS, word)) {
                    out += '<span class="keyword">' + word + '</span>';
                } else if (Object.prototype.hasOwnProperty.call(FUNCTIONS, word)) {
                    out += '<span class="function">' + word + '</span>';
                } else if (Object.prototype.hasOwnProperty.call(TYPES, word)) {
                    out += '<span class="dataDef">' + word + '</span>';
                } else if (/^[A-Z]/.test(word)) {
                    out += '<span class="typeVar">' + word + '</span>';
                } else {
                    out += word;
                }
                i = k;
                continue;
            }

            // 操作符 ::
            if (text.charAt(i) === ':' && text.charAt(i + 1) === ':') {
                out += '<span class="operator">::</span>';
                i += 2;
                continue;
            }

            // 其它字符
            out += ch;
            i++;
        }

        return out;
    }

    // ===== 渲染 =====
    function render(index) {
        if (index >= quiz.length) { showComplete(); return; }

        var q = quiz[index];
        idx = index;
        complete = false;
        selected = -1;

        progressInfo.innerHTML = '<span class="done">' + (index + 1) + '</span> <span class="total">/ ' + quiz.length + '</span>';
        statusText.textContent = 'Question ' + (index + 1) + ' / ' + quiz.length;
        typeInput.value = '';
        typeInput.className = 'typeInput';
        clearFeedback();

        var renderers = {
            infer_type:       renderTypeSig,
            find_function:    renderFindFn,
            predict_behavior: renderChoice,
            satisfy_law:      renderSatisfyLaw,
            fix_laziness:     renderFixLaziness
        };
        (renderers[q.problem_type] || renderTypeSig)(q);

        if (q.problem_type !== 'predict_behavior') {
            typeInput.focus();
        }
    }

    // ===== 题型渲染器 =====
    function renderTypeSig(q) {
        var cfg = q.judge_config || {};
        pageTitle.textContent = '✏️ Type Signature';
        questionLabel.textContent = '📌 Write the type signature of the function below:';
        inputLabel.textContent = '✏️ Type signature:';
        inputArea.style.display = '';
        choiceArea.style.display = 'none';
        typeInputPrefix.textContent = 'f ::';
        typeInput.placeholder = cfg.correct_signature || '';
        typeInput.disabled = false;
        setCode(highlight(cfg.display_snippet || cfg.display_code || ''));
    }

    function renderFindFn(q) {
        var cfg = q.judge_config || {};
        pageTitle.textContent = '🔍 Function Implementation';
        questionLabel.textContent = '📌 Implement a function that matches the following type signature:';
        inputLabel.textContent = '✏️ Implementation:';
        inputArea.style.display = '';
        choiceArea.style.display = 'none';
        typeInputPrefix.textContent = 'target = ';
        typeInput.placeholder = cfg.correct_code || '';
        typeInput.disabled = false;
        var code = (cfg.display_snippet || '') + '\n\n' +
            (cfg.scaffold || '').replace(/\{\{USER_CODE\}\}/g, '-- implement here');
        setCode(highlight(code));
    }

    function renderChoice(q) {
        var cfg = q.judge_config || {};
        pageTitle.textContent = '🎯 Behavior Prediction';
        questionLabel.textContent = cfg.question || 'What happens when the following code runs?';
        inputLabel.textContent = '';
        inputArea.style.display = 'none';
        choiceArea.style.display = '';
        typeInput.disabled = true;
        setCode(highlight(cfg.display_code || cfg.display_snippet || ''));

        var opts = cfg.options || [];
        var html = '';
        for (var i = 0; i < opts.length; i++) {
            var letter = String.fromCharCode(65 + i);
            html += '<label class="choiceOption" data-index="' + i + '">' +
                '<input type="radio" name="choice" value="' + i + '" />' +
                '<span class="choiceText">' + letter + '. ' + opts[i] + '</span>' +
                '</label>';
        }
        choiceOptions.innerHTML = html;

        var optEls = choiceOptions.querySelectorAll('.choiceOption');
        for (var j = 0; j < optEls.length; j++) {
            (function (el) {
                el.addEventListener('click', function () {
                    if (submitting || complete) return;
                    var radio = this.querySelector('input[type="radio"]');
                    if (radio) {
                        radio.checked = true;
                        selected = parseInt(radio.value);
                        clearChoiceStyles();
                    }
                });
                var radio = el.querySelector('input[type="radio"]');
                if (radio) {
                    radio.addEventListener('change', function () {
                        if (submitting || complete) return;
                        selected = parseInt(this.value);
                        clearChoiceStyles();
                    });
                }
            })(optEls[j]);
        }
    }

    function renderSatisfyLaw(q) {
        var cfg = q.judge_config || {};
        pageTitle.textContent = '📐 Implement a Functor Instance';
        questionLabel.textContent = cfg.question || 'Implement a Functor instance that satisfies the Functor laws:';
        inputLabel.textContent = '✏️ Implement fmap:';
        inputArea.style.display = '';
        choiceArea.style.display = 'none';
        typeInputPrefix.textContent = 'fmap = ';
        typeInput.placeholder = cfg.correct_code || '';
        typeInput.disabled = false;
        var code = (cfg.display_snippet || '') + '\n\n' +
            (cfg.scaffold || '').replace(/\{\{USER_CODE\}\}/g, '-- implement here');
        setCode(highlight(code));
    }

    function renderFixLaziness(q) {
        var cfg = q.judge_config || {};
        pageTitle.textContent = '🔧 Fix Laziness';
        questionLabel.textContent = cfg.question || 'This function misbehaves on long lists. Fix it:';
        inputLabel.textContent = '✏️ Your implementation:';
        inputArea.style.display = '';
        choiceArea.style.display = 'none';
        typeInputPrefix.textContent = 'sumList = ';
        typeInput.placeholder = cfg.correct_code || '';
        typeInput.disabled = false;
        var code = (cfg.display_snippet || '') + '\n\n' +
            (cfg.scaffold || '').replace(/\{\{USER_CODE\}\}/g, '-- implement here');
        setCode(highlight(code));
    }

    // ===== 选择工具 =====
    function clearChoiceStyles() {
        var opts = choiceOptions.querySelectorAll('.choiceOption');
        for (var i = 0; i < opts.length; i++) {
            opts[i].classList.remove('correct', 'wrong', 'disabled');
        }
    }

    // ===== 完成 =====
    function showComplete() {
        complete = true;
        progressInfo.innerHTML = '<span class="done">✅</span> <span class="total">Done!</span>';
        statusText.textContent = '🎉 All done!';
        codeBlock.innerHTML = '';
        typeInputPrefix.textContent = '🎉';
        typeInput.style.display = 'none';
        inputArea.style.display = 'none';
        choiceArea.style.display = 'none';
        submitBtn.style.display = 'none';
        resetBtn.style.display = 'none';
        questionLabel.textContent = '🎉 Congratulations, you finished all questions!';
        inputLabel.textContent = '';

        feedbackContainer.innerHTML = '<div class="quizComplete">' +
            '<span class="bigIcon">🏆</span>' +
            '<div class="completeTitle">All questions completed!</div>' +
            '<div class="completeSub">You solved all ' + quiz.length + ' questions!</div>' +
            '<button class="restartBtn" id="restartBtn">↻ Restart</button>' +
            '</div>';
        document.getElementById('restartBtn').addEventListener('click', restart);
    }

    function restart() {
        typeInput.style.display = '';
        inputArea.style.display = '';
        choiceArea.style.display = 'none';
        submitBtn.style.display = '';
        resetBtn.style.display = '';
        questionLabel.textContent = '📌 Write the type signature of the function below:';
        inputLabel.textContent = '✏️ Type signature:';
        feedbackContainer.innerHTML = '';
        typeInput.disabled = false;
        render(0);
    }

    // ===== 反馈 =====
    function showFeedback(msg, type) {
        clearFeedback();
        var el = document.createElement('div');
        el.className = 'feedback show ' + type;
        el.textContent = msg;
        el.id = 'feedback';
        feedbackContainer.appendChild(el);
    }

    function clearFeedback() { feedbackContainer.innerHTML = ''; }

    function hideFeedback() {
        var el = document.getElementById('feedback');
        if (el) el.remove();
    }

    // ===== 工具 =====
    function normalize(s) { return s.trim().replace(/\s+/g, ' '); }

    function eq(a, b) { return normalize(a) === normalize(b); }

    // ===== 提交 =====
    function handleSubmit() {
        if (submitting || complete) return;
        var q = quiz[idx];
        var cfg = q.judge_config || {};

        if (q.problem_type === 'predict_behavior') {
            if (selected === -1) { showFeedback('⚠️ Please choose an option!', 'hint'); return; }
            submitting = true;
            submitBtn.disabled = true;
            setTimeout(function() {
                var correct = selected === cfg.correct_index;
                var opts = choiceOptions.querySelectorAll('.choiceOption');
                clearChoiceStyles();
                for (var i = 0; i < opts.length; i++) {
                    var el = opts[i];
                    el.classList.add('disabled');
                    var index = parseInt(el.dataset.index);
                    if (index === cfg.correct_index) el.classList.add('correct');
                    if (index === selected && !correct) el.classList.add('wrong');
                }
                if (correct) {
                    showFeedback('✅ Correct! Moving on...', 'success');
                    setTimeout(function() { render(idx + 1);
                        submitting = false;
                        submitBtn.disabled = false; }, 800);
                } else {
                    showFeedback('❌ Try again. ' + (cfg.hint || ''), 'error');
                    submitting = false;
                    submitBtn.disabled = false;
                }
            }, 300);
            return;
        }

        var ans = typeInput.value;
        if (ans.trim() === '') { showFeedback('⚠️ Please enter your answer!', 'hint');
            typeInput.focus(); return; }

        var expected = cfg.correct_signature || cfg.correct_code || '';

        submitting = true;
        submitBtn.disabled = true;
        setTimeout(function() {
            var correct = eq(ans, expected);
            typeInput.className = 'typeInput';
            if (correct) {
                typeInput.classList.add('correct');
                showFeedback('✅ Correct! Moving on...', 'success');
                setTimeout(function() { render(idx + 1);
                    submitting = false;
                    submitBtn.disabled = false; }, 800);
            } else {
                typeInput.classList.add('wrong');
                showFeedback('❌ Try again. ' + (cfg.hint || ''), 'error');
                typeInput.focus();
                submitting = false;
                submitBtn.disabled = false;
            }
        }, 300);
    }

    // ===== 重置 =====
    function handleReset() {
        if (complete) return;
        var q = quiz[idx];
        if (q.problem_type === 'predict_behavior') {
            var radios = choiceOptions.querySelectorAll('input[type="radio"]');
            for (var i = 0; i < radios.length; i++) { radios[i].checked = false; }
            selected = -1;
            clearChoiceStyles();
            hideFeedback();
        } else {
            typeInput.value = '';
            typeInput.className = 'typeInput';
            hideFeedback();
            typeInput.focus();
        }
    }

    // ===== 键盘 =====
    function onKeydown(e) {
        if (complete) return;
        var q = quiz[idx];
        if (!q) return;

        if (q.problem_type === 'predict_behavior' && e.key >= '1' && e.key <= '9') {
            var num = parseInt(e.key) - 1;
            var opts = choiceOptions.querySelectorAll('.choiceOption');
            if (num < opts.length) {
                e.preventDefault();
                var radio = opts[num].querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    selected = num;
                    clearChoiceStyles();
                }
            }
            return;
        }

        if (e.key === 'Enter' && !e.isComposing) { e.preventDefault();
            handleSubmit(); return; }
        if (e.key === 'Escape') { e.preventDefault();
            handleReset(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault();
            handleSubmit(); return; }
    }

    // ===== 绑定 =====
    submitBtn.addEventListener('click', handleSubmit);
    resetBtn.addEventListener('click', handleReset);
    typeInput.addEventListener('input', function() {
        this.className = 'typeInput';
        hideFeedback();
    });
    document.addEventListener('keydown', onKeydown);

    // ===== 启动 =====
    loadQuiz();

    // ===== API =====
    window.__quiz = {
        quiz: quiz,
        idx: idx,
        render: render,
        restart: restart,
        submit: handleSubmit,
        reset: handleReset,
        load: loadQuiz
    };

})();