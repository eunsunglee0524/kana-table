// 전역 변수 수정
let curMode = 'hira'; // 'hira' 또는 'kata'
let isFlashMode = false;
let curLang = localStorage.getItem('kana_lang') || 'ko';
let theme = localStorage.getItem('kana_theme') || 'system';
let currentAudio = null;

// 타이틀 데이터 추가 (함수 밖 전역에 배치)
const titleData = {
    ko: { base: "가나 테이블", hira: "히라가나", kata: "가타카나" },
    ja: { base: "かなテーブル", hira: "ひらがな", kata: "カタカナ" },
    en: { base: "Kana Table", hira: "Hiragana", kata: "Katakana" }
};

let viewSettings = JSON.parse(localStorage.getItem('kana_view')) || {
    onlyBookmark: false, showKo: true, showRuby: true, playOnFlash: true, playOnClick: true, voiceSpeed: 1.0,
    flashSpeed: 'normal', flashManual: false, compactView: false
};
let secSettings = JSON.parse(localStorage.getItem('kana_sec')) || { base: true, daku: true, yoon: true, soku: true, choo: true };
let bookmarks = JSON.parse(localStorage.getItem('kana_bookmarks') || '{}');

// EmailJS 초기화
(function () {
    if (typeof emailjs !== 'undefined') emailjs.init("jFJOsWccmujfnuMqn");
})();

window.onload = () => {
    setTheme(theme);
    applyLanguage(); // 여기서 모든 타이틀/파비콘/언어 로직이 시작됩니다.
    disableSelection();
};

// 1. 파비콘 변경 함수
function updateFavicon() {
    // 현재 모드에 따라 문자 결정
    const char = (curMode === 'hira') ? 'あ' : 'ア';

    // SVG 코드 생성 (요청하신 디자인 기반)
    const faviconSvg = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2218%22 fill=%22%2374C0FC%22/><text y=%2278%22 x=%2250%22 font-size=%2282%22 fill=%22white%22 font-family=%22sans-serif%22 font-weight=%22900%22 text-anchor=%22middle%22>${char}</text></svg>`;

    // <link id="favicon"> 태그를 찾아 주소 교체
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = faviconSvg;
}

function applyLanguage() {
    // 1. 언어 클래스 (lang-ko, lang-ja 등)
    document.body.className = `lang-${curLang}`;

    // 2. 발음 표시 클래스 (show-pron) - 이 부분이 CSS의 조건과 일치해야 합니다.
    if (viewSettings.showKo) {
        document.body.classList.add('show-pron');
    } else {
        document.body.classList.remove('show-pron');
    }

    updateUI();
    updateBrowserTitle();
    updateFavicon();
    renderAll();
}

// 브라우저 타이틀 변경
function updateBrowserTitle() {
    const lang = curLang || 'ko';
    const data = titleData[lang] || titleData['ko'];
    const modeName = (curMode === 'hira') ? data.hira : data.kata;
    document.title = `${data.base} - ${modeName}`;
}

function disableSelection() {
    document.addEventListener('selectstart', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });

    document.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });
}

// 4. 발음 보기 스위치 함수 (체크박스/버튼 클릭 시 호출)
function togglePronunciation(isOn) {
    localStorage.setItem('show_pronunciation', isOn);
    if (isOn) {
        document.body.classList.add('show-pron');
    } else {
        document.body.classList.remove('show-pron');
    }
}

// === 커스텀 Confirm 팝업 ===
function showCustomConfirm(title, msg, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.style.zIndex = '3000';
    overlay.innerHTML = `
        <div class="modal">
            <h3>${title}</h3>
            <p>${msg}</p>
            <div class="modal-btns">
                <button class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">취소</button>
                <button class="btn-confirm btn-danger" id="confirmBtn">확인</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    document.getElementById('confirmBtn').onclick = () => {
        onConfirm();
        overlay.remove();
    };
}

// === 커스텀 Alert 팝업 ===
function showCustomAlert(title, msg, onClose) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.style.zIndex = '3000';
    overlay.innerHTML = `
        <div class="modal">
            <h3>${title}</h3>
            <p>${msg}</p>
            <div class="modal-btns">
                <button class="btn-confirm" id="alertOkBtn">확인</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    document.getElementById('alertOkBtn').onclick = () => {
        if (onClose) onClose();
        overlay.remove();
    };
}

// === 피드백 모달 ===
function openFeedback() {
    const lang = UI_LANG[curLang];
    document.getElementById('feedbackModal').classList.add('open');
    selectType('bug');
}

function selectType(type) {
    const lang = UI_LANG[curLang];
    currentType = type;
    const icons = { bug: 'fa-bug', feedback: 'fa-comment-dots', suggest: 'fa-lightbulb' };
    const colors = { bug: 'var(--red)', feedback: 'var(--yellow)', suggest: 'var(--blue)' };
    const labels = { bug: lang.fb_type_bug, feedback: lang.fb_type_feedback, suggest: lang.fb_type_suggest };

    document.getElementById('selected-val').innerHTML =
        `<i class="fa-solid ${icons[type]}" style="color:${colors[type]}; margin-right:8px;"></i>${labels[type]}`;
    document.getElementById('selectOptions').classList.remove('open');
    document.getElementById('fb-subject').style.display = (type === 'feedback') ? 'none' : 'block';
    document.getElementById('fb-star-wrap').style.display = (type === 'feedback') ? 'block' : 'none';
}

function toggleSelect(e) {
    e.stopPropagation();
    document.getElementById('selectOptions').classList.toggle('open');
}

function setStar(n) {
    starRating = n;
    document.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('active', i < n));
}

function closeFeedback() {
    const hasContent = document.getElementById('fb-subject').value.trim() || document.getElementById('fb-message').value.trim();
    if (hasContent) {
        showCustomConfirm('확인', '작성 중인 내용이 있습니다.\n정말 취소하시겠습니까?', resetFeedbackForm);
    } else {
        resetFeedbackForm();
    }
}

function resetFeedbackForm() {
    document.getElementById('fb-subject').value = "";
    document.getElementById('fb-message').value = "";
    document.getElementById('feedbackModal').classList.remove('open');
}

async function sendFeedback() {
    const lang = UI_LANG[curLang];
    const subject = document.getElementById('fb-subject').value;
    const message = document.getElementById('fb-message').value;

    if (!message) return showCustomAlert(lang.notice_title, lang.empty_error);

    let detailHtml = "", emailTitle = "";
    if (currentType === 'bug') {
        emailTitle = `[BUG] ${subject}`;
        detailHtml = `<strong>Title:</strong> ${subject}<br><br><strong>Msg:</strong><br>${message.replace(/\n/g, '<br>')}`;
    } else if (currentType === 'feedback') {
        emailTitle = `[FEEDBACK] ${starRating} Stars`;
        detailHtml = `<strong>Rating:</strong> ${"⭐".repeat(starRating)}<br><br><strong>Msg:</strong><br>${message.replace(/\n/g, '<br>')}`;
    } else {
        emailTitle = `[SUGGEST] ${subject}`;
        detailHtml = `<strong>Title:</strong> ${subject}<br><br><strong>Msg:</strong><br>${message.replace(/\n/g, '<br>')}`;
    }

    try {
        await emailjs.send('service_5ej9ftp', 'template_aqa4k5d', {
            type_label: currentType.toUpperCase(),
            title: emailTitle,
            dynamic_content: detailHtml,
            app_version: "v2.0.0",
            time: new Date().toLocaleString()
        });
        showCustomAlert(lang.notice_title, lang.thanks_msg, resetFeedbackForm);
    } catch (error) {
        console.error("전송 실패:", error);
        showCustomAlert(lang.notice_title, lang.send_error);
    }
}

// === 메인 렌더링 ===
function renderAll() {



    const lang = UI_LANG[curLang];
    let totalShow = 0;

    totalShow += renderGrid('grid-base', KANA_DATA.base, 'base', `<i class="fa-solid fa-font icon-sec-base"></i> ${lang.sec_base}`);
    totalShow += renderGrid('grid-daku', KANA_DATA.dakuon, 'daku', `<i class="fa-solid fa-bullseye icon-sec-daku"></i> ${lang.sec_daku}`);
    totalShow += renderGrid('grid-yoon', KANA_DATA.yoon, 'yoon', `<i class="fa-solid fa-wand-magic-sparkles icon-sec-yoon"></i> ${lang.sec_yoon}`);
    totalShow += renderGrid('grid-soku', KANA_DATA.etc.slice(0, 5), 'soku', `<i class="fa-solid fa-bolt icon-sec-soku"></i> ${lang.sec_soku}`);
    totalShow += renderGrid('grid-choo', KANA_DATA.etc.slice(5), 'choo', `<i class="fa-solid fa-ruler-horizontal icon-sec-choo"></i> ${lang.sec_choo}`);

    const emptyMsg = document.getElementById('emptyMsg');
    if (emptyMsg) {
        emptyMsg.innerText = lang.empty_msg;
        emptyMsg.style.display = (totalShow === 0) ? 'block' : 'none';
    }
    updateUI();
}

function renderGrid(tid, data, secKey, titleHtml) {
    const wrap = document.getElementById(`wrap-${secKey}`);
    const grid = document.getElementById(tid);
    if (!secSettings[secKey]) { if (wrap) wrap.style.display = 'none'; return 0; }

    let items = data.filter(item => item && (!viewSettings.onlyBookmark || bookmarks[item.h]));
    if (items.length === 0 && viewSettings.onlyBookmark) { if (wrap) wrap.style.display = 'none'; return 0; }

    if (wrap) wrap.style.display = 'block';
    const titleEl = document.getElementById(`t-${secKey}`);
    if (titleEl) titleEl.innerHTML = titleHtml;

    grid.innerHTML = '';
    data.forEach(item => {
        if (!item) { if (!viewSettings.onlyBookmark) grid.appendChild(createEmptyCard()); return; }
        if (viewSettings.onlyBookmark && !bookmarks[item.h]) return;
        grid.appendChild(createCard(item));
    });
    return items.length;
}

function createCard(item) {
    const card = document.createElement('div');
    card.className = 'kana-card';
    const char = curMode === 'hira' ? item.h : item.k;

    // 후리가나: 히라가나 모드일 때는 가타카나를, 가타카나 모드일 때는 히라가나를 위에 표시
    const rubyChar = curMode === 'hira' ? item.k : item.h;

    card.onclick = () => {
        if (!isFlashMode && viewSettings.playOnClick) speak(char);
        if (isFlashMode) {
            if (viewSettings.playOnFlash) speak(char);

            if (viewSettings.flashManual) {
                // 수동 모드: 클릭 시 토글
                card.classList.toggle('reveal');
            } else {
                // 자동 모드: 설정된 속도에 따라 공개 후 숨김
                card.classList.add('reveal');
                let speed = 1200; // normal
                if (viewSettings.flashSpeed === 'fast') speed = 800;
                if (viewSettings.flashSpeed === 'slow') speed = 2000;

                setTimeout(() => card.classList.remove('reveal'), speed);
            }
        }
    };

    card.innerHTML = `<i class="fa-bookmark bm-icon ${bookmarks[item.h] ? 'fa-solid active' : 'fa-regular'}" onclick="event.stopPropagation(); toggleBookmark('${item.h}')"></i>
        ${viewSettings.showRuby ? `<span class="k-ruby">${rubyChar}</span>` : ''}
        <span class="k-char">${char}</span><span class="k-romaji">${item.r}</span>
        ${viewSettings.showKo ? `<span class="k-ko">${item.ko}</span>` : ''}`;
    return card;
}

function createEmptyCard() {
    const d = document.createElement('div');
    d.className = 'kana-card empty';
    d.style.opacity = '0';
    return d;
}

async function speak(t) {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    const baseUrl = "https://translate.google.com/translate_tts";
    const params = `?ie=UTF-8&q=${encodeURIComponent(t)}&tl=ja&client=tw-ob`;
    const proxyUrl = "https://corsproxy.io/?";
    const finalUrl = proxyUrl + encodeURIComponent(baseUrl + params);
    currentAudio = new Audio(finalUrl);
    currentAudio.playbackRate = viewSettings.voiceSpeed || 1.0;
    currentAudio.play().catch(e => console.error("오디오 재생 실패:", e));
}

function setTheme(t) {
    theme = t;
    localStorage.setItem('kana_theme', t);
    closeAll();
    if (t === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', t);
    }
    updateUI();
}

function toggleViewSetting(e, k) {
    e.stopPropagation();
    viewSettings[k] = !viewSettings[k];
    localStorage.setItem('kana_view', JSON.stringify(viewSettings));

    // 설정이 바뀌었으므로 클래스 상태와 화면을 다시 갱신
    applyLanguage();
}
function setVoiceSpeed(e, s) {
    if (e) e.stopPropagation();
    viewSettings.voiceSpeed = s;
    localStorage.setItem('kana_view', JSON.stringify(viewSettings));
    closeAll();
    updateUI();
}

function setFlashSpeed(e, s) {
    if (e) e.stopPropagation();
    viewSettings.flashSpeed = s;
    // 수동 모드가 켜져있다면 끄기 (속도 선택 시 자동 모드로 전환)
    if (viewSettings.flashManual) viewSettings.flashManual = false;

    localStorage.setItem('kana_view', JSON.stringify(viewSettings));
    closeAll();
    updateUI();
}

function toggleFlashManual(e) {
    if (e) e.stopPropagation();
    viewSettings.flashManual = !viewSettings.flashManual;
    localStorage.setItem('kana_view', JSON.stringify(viewSettings));
    closeAll();
    updateUI();
}

function changeLang(e, l) {
    e.stopPropagation();
    curLang = l;
    localStorage.setItem('kana_lang', l);
    closeAll();
    applyLanguage();
}

function toggleSec(e, k) {
    e.stopPropagation();
    secSettings[k] = !secSettings[k];
    localStorage.setItem('kana_sec', JSON.stringify(secSettings));
    renderAll();
}

function toggleBookmark(h) {
    bookmarks[h] = !bookmarks[h];
    localStorage.setItem('kana_bookmarks', JSON.stringify(bookmarks));
    renderAll();
}

// 히라가나/가타카나 전환 함수
function switchMode(m) {
    curMode = m;
    const switcher = document.getElementById('modeSwitcher');
    if (switcher) switcher.classList.toggle('is-kata', m === 'kata');

    updateBrowserTitle(); // 전환 시 타이틀 변경
    updateFavicon();      // 전환 시 파비콘 변경
    renderAll();
}

function toggleFlashMode(e) {
    e.stopPropagation();
    isFlashMode = !isFlashMode;
    document.getElementById('flashBtn').classList.toggle('active');
    document.getElementById('mainContainer').classList.toggle('flash-active');
}

function updateUI() {
    const lang = UI_LANG[curLang];

    const allCount = 104;
    const favCount = Object.values(bookmarks).filter(v => v === true).length;
    const bmCountEl = document.getElementById('bm-count-text');
    if (bmCountEl) bmCountEl.innerText = `${favCount}/${allCount}`;

    // 다국어 텍스트 업데이트
    const textMap = {
        'hira-tab': lang.hira, 'kata-tab': lang.kata,
        'theme-system': lang.theme_system, 'theme-light': lang.theme_light, 'theme-dark': lang.theme_dark,
        'menu-view': lang.menu_view, 'menu-voice': lang.menu_voice, 'menu-sec': lang.menu_sec,
        'menu-lang': lang.menu_lang, 'menu-data': lang.menu_data, 'menu-feedback': lang.menu_feedback,
        'view-bookmark': lang.view_bookmark, 'view-ko': lang.view_ko, 'view-ruby': lang.view_ruby,
        'view-compact': lang.view_compact,
        'voice-click': lang.voice_click, 'voice-flash': lang.voice_flash,
        'voice-click': lang.voice_click, 'voice-flash': lang.voice_flash,
        'voice-normal': lang.voice_normal, 'voice-slow': lang.voice_slow,
        'menu-flash': lang.menu_flash,
        'flash_speed_fast': lang.flash_speed_fast, 'flash_speed_normal': lang.flash_speed_normal, 'flash_speed_slow': lang.flash_speed_slow,
        'flash_manual': lang.flash_manual,
        'sec-text-base': lang.sec_base, 'sec-text-daku': lang.sec_daku,
        'sec-text-yoon': lang.sec_yoon, 'sec-text-soku': lang.sec_soku, 'sec-text-choo': lang.sec_choo,
        'data-export-set': lang.data_export_set, 'data-export-bm': lang.data_export_bm,
        'data-export-all': lang.data_export_all, 'data-import': lang.data_import,
        'data-reset-set': lang.data_reset_set, 'data-reset-bm': lang.data_reset_bm, 'data-reset-all': lang.data_reset_all,
        'fb-title': lang.fb_title, 'fb-type-text': lang.fb_type_bug,
        'fb-opt-bug': lang.fb_type_bug, 'fb-opt-feedback': lang.fb_type_feedback, 'fb-opt-suggest': lang.fb_type_suggest,
        'fb-cancel': lang.fb_cancel, 'fb-send': lang.fb_send
    };

    for (let id in textMap) {
        const el = document.getElementById(id);
        if (el) el.innerText = textMap[id];
    }

    const fbSub = document.getElementById('fb-subject');
    const fbMsg = document.getElementById('fb-message');
    if (fbSub) fbSub.placeholder = lang.fb_placeholder_subject;
    if (fbMsg) fbMsg.placeholder = lang.fb_placeholder_msg;

    // 탭 이름 변경 (단축/일반)
    const hiraTab = document.getElementById('hira-tab');
    const kataTab = document.getElementById('kata-tab');
    const switcher = document.getElementById('modeSwitcher');

    if (viewSettings.compactView) {
        hiraTab.textContent = lang.hira_short;
        kataTab.textContent = lang.kata_short;
        switcher.classList.add('compact-tab');
    } else {
        hiraTab.textContent = lang.hira;
        kataTab.textContent = lang.kata;
        switcher.classList.remove('compact-tab');
    }

    // 체크박스 상태 업데이트
    const checkMap = {
        'chk-fav': viewSettings.onlyBookmark,
        'chk-ko': viewSettings.showKo,
        'chk-ruby': viewSettings.showRuby,
        'chk-compact': viewSettings.compactView,
        'chk-playclick': viewSettings.playOnClick,
        'chk-playflash': viewSettings.playOnFlash,
        'sec-base': secSettings.base, 'sec-daku': secSettings.daku, 'sec-yoon': secSettings.yoon,
        'sec-soku': secSettings.soku, 'sec-choo': secSettings.choo,
        'chk-t-system': theme === 'system', 'chk-t-light': theme === 'light', 'chk-t-dark': theme === 'dark',
        'chk-t-system': theme === 'system', 'chk-t-light': theme === 'light', 'chk-t-dark': theme === 'dark',
        'chk-v-normal': viewSettings.voiceSpeed === 1.0, 'chk-v-slow': viewSettings.voiceSpeed === 0.7,
        'chk-f-fast': viewSettings.flashSpeed === 'fast' && !viewSettings.flashManual,
        'chk-f-normal': (viewSettings.flashSpeed === 'normal' || !viewSettings.flashSpeed) && !viewSettings.flashManual,
        'chk-f-slow': viewSettings.flashSpeed === 'slow' && !viewSettings.flashManual,
        'chk-f-manual': viewSettings.flashManual,
        'chk-l-ko': curLang === 'ko', 'chk-l-ja': curLang === 'ja', 'chk-l-en': curLang === 'en'
    };
    for (let id in checkMap) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('checked', checkMap[id]);
    }
}

function togglePop(e, id) {
    e.stopPropagation();
    const target = document.getElementById(id);
    const isOpen = target.classList.contains('open');
    closeAll();
    if (!isOpen) target.classList.add('open');
}

function toggleSubPop(e, id) {
    e.stopPropagation();
    const target = document.getElementById(id);
    const isOpen = target.classList.contains('open');
    document.querySelectorAll('.sub-pop').forEach(p => p.classList.remove('open'));
    if (!isOpen) target.classList.add('open');
}

function closeAll() {
    document.querySelectorAll('.ice-pop').forEach(p => p.classList.remove('open'));
    const options = document.getElementById('selectOptions');
    if (options) options.classList.remove('open');
}

window.onclick = closeAll;

function confirmReset(e, type) {
    e.stopPropagation();
    const lang = UI_LANG[curLang];
    let msg = type === 'set' ? lang.reset_set_msg : (type === 'bm' ? lang.reset_bm_msg : lang.reset_all_msg);

    closeAll();
    showCustomConfirm(lang.reset_confirm_title, msg, () => {
        if (type === 'set') {
            localStorage.removeItem('kana_view');
            localStorage.removeItem('kana_sec');
        } else if (type === 'bm') {
            localStorage.removeItem('kana_bookmarks');
        } else {
            localStorage.clear();
        }
        location.reload();
    });
}

function exportPart(type) {
    let data = type === 'all' ? { bookmarks, viewSettings, secSettings, theme, curLang } :
        (type === 'bookmarks' ? { bookmarks } : { viewSettings, secSettings, theme, curLang });
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kana_ninja_${type}_backup.json`;
    a.click();
}

function importData(e) {
    e.stopPropagation();
    const i = document.createElement('input');
    i.type = 'file'; i.accept = '.json';
    i.onchange = e => {
        const r = new FileReader();
        r.onload = f => {
            const j = JSON.parse(f.target.result);
            if (j.bookmarks) localStorage.setItem('kana_bookmarks', JSON.stringify(j.bookmarks));
            if (j.viewSettings) localStorage.setItem('kana_view', JSON.stringify(j.viewSettings));
            if (j.secSettings) localStorage.setItem('kana_sec', JSON.stringify(j.secSettings));
            if (j.theme) localStorage.setItem('kana_theme', j.theme);
            if (j.curLang) localStorage.setItem('kana_lang', j.curLang);
            location.reload();
        };
        r.readAsText(e.target.files[0]);
    };
    i.click();
}

