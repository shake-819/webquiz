<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Quiz Master | リアルタイム早回答クイズ</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@400;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=Klee+One:wght@400;600&display=swap" rel="stylesheet">

<style>
:root{
    --paper:       #F5F3EC;
    --paper-line:  #DAD4C4;
    --ink:         #232A35;
    --ink-soft:    #6B7280;
    --red-pen:     #C6423A;
    --navy:        #2E3E5C;
    --gold:        #B8912E;
    --gold-soft:   #E4CB86;
    --sage:        #52745A;
    --card-bg:     #FFFFFE;
    --shadow:      rgba(35,42,53,.10);
}

*{ margin:0; padding:0; box-sizing:border-box; }

body{
    font-family:"Zen Kaku Gothic New", sans-serif;
    color:var(--ink);
    background:
        repeating-linear-gradient(
            var(--paper) 0px, var(--paper) 35px,
            var(--paper-line) 36px, var(--paper) 37px
        );
    min-height:100vh;
}

.back-link{
    display:inline-block;
    font-size:13.5px;
    font-weight:700;
    color:var(--ink-soft);
    text-decoration:none;
    margin:20px 0 0 20px;
}
.back-link:hover{ color:var(--red-pen); }

.wrap{
    width:92%;
    max-width:620px;
    margin:0 auto;
    padding:20px 0 80px;
}

.event-sheet{
    background:var(--card-bg);
    border:1px solid var(--paper-line);
    box-shadow:0 14px 34px var(--shadow);
    padding:clamp(24px,5vw,40px);
}

/* ===== 見出し ===== */

.event-head{ text-align:center; margin-bottom:26px; }
.event-head .eyebrow{
    font-family:"Klee One", cursive;
    font-size:13px;
    color:var(--gold);
    border:1px solid var(--gold-soft);
    border-radius:4px;
    padding:2px 12px;
    display:inline-block;
    transform:rotate(-2deg);
    margin-bottom:10px;
}
.event-head h1{
    font-family:"Zen Old Mincho", serif;
    font-size:26px;
}
.event-head p{
    font-size:13.5px;
    color:var(--ink-soft);
    margin-top:8px;
}

/* ===== ボタン ===== */

button{
    font-family:"Zen Kaku Gothic New", sans-serif;
    cursor:pointer;
    border-radius:2px;
    transition:transform .15s ease, box-shadow .15s ease, background .2s, color .2s, border-color .2s;
}
button:focus-visible{ outline:2px solid var(--red-pen); outline-offset:2px; }

.btn-row{ display:flex; gap:12px; margin-bottom:6px; }
.btn-row--sub{ margin-top:6px; flex-wrap:wrap; }

.btn-stamp{
    flex:1;
    font-weight:900;
    font-size:16px;
    color:#fff;
    background:var(--red-pen);
    border:none;
    padding:14px 20px;
    box-shadow:3px 3px 0 var(--ink);
}
.btn-stamp:hover:not(:disabled){ transform:translate(-2px,-2px); box-shadow:5px 5px 0 var(--ink); }

.btn-outline{
    flex:1;
    font-weight:700;
    font-size:14.5px;
    color:var(--ink);
    background:transparent;
    border:1px solid var(--paper-line);
    padding:12px 16px;
}
.btn-outline:hover{ border-color:var(--ink); background:var(--paper); }
.btn-outline.btn-navy{ color:var(--navy); border-color:var(--navy); }
.btn-outline.btn-navy:hover{ background:#EEF1F6; }

.btn-text{
    flex:0 0 auto;
    font-weight:700;
    font-size:13.5px;
    color:var(--ink-soft);
    background:transparent;
    border:none;
    padding:12px 10px;
    text-decoration:underline;
    text-underline-offset:3px;
}
.btn-text:hover{ color:var(--red-pen); }

button:disabled{ opacity:.45; cursor:not-allowed; box-shadow:none; }
button:disabled:hover{ transform:none; }

/* ===== スタート画面：制限時間 ===== */

.time-limit-box{
    background:var(--paper);
    border:1px solid var(--paper-line);
    padding:18px 24px;
    margin-bottom:24px;
    text-align:center;
}
.time-limit-box h3{
    font-size:12px;
    font-weight:700;
    color:var(--ink-soft);
    margin-bottom:4px;
}
.time-limit-box .big{
    font-family:"Zen Old Mincho", serif;
    font-size:40px;
    font-weight:700;
    color:var(--red-pen);
    line-height:1.2;
}
.time-limit-box .big .unit{
    font-family:"Zen Kaku Gothic New", sans-serif;
    font-size:15px;
    color:var(--ink-soft);
    margin-left:2px;
}

.rules{
    font-size:12.5px;
    color:var(--ink-soft);
    line-height:1.9;
    padding-top:18px;
    margin-bottom:24px;
    border-top:1px dashed var(--paper-line);
}
.rules li{ margin-left:1.1em; }

/* ===== プレイ画面：タイマー・スコア ===== */

.play-bar{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:16px;
    background:var(--paper);
    border:1px solid var(--paper-line);
    padding:12px 22px;
    margin-bottom:20px;
}
.play-bar .label{
    font-size:11.5px;
    font-weight:700;
    color:var(--ink-soft);
    display:block;
    margin-bottom:2px;
}

#timerBox{
    font-family:"Zen Old Mincho", serif;
    font-size:36px;
    font-weight:700;
    line-height:1.1;
    color:var(--navy);
    transition:color .2s;
}
#timerBox .unit{
    font-family:"Zen Kaku Gothic New", sans-serif;
    font-size:14px;
    color:var(--ink-soft);
    margin-left:2px;
}
#timerBox.is-low{
    color:var(--red-pen);
    animation:pulse 1s ease-in-out infinite;
}
@keyframes pulse{
    0%,100%{ opacity:1; }
    50%{ opacity:.55; }
}
@media (prefers-reduced-motion: reduce){
    #timerBox.is-low{ animation:none; }
}

.score-box{ text-align:right; }
#liveScore{
    font-family:"Zen Old Mincho", serif;
    font-size:36px;
    font-weight:700;
    line-height:1.1;
    color:var(--ink);
}
.score-box .unit{
    font-size:14px;
    color:var(--ink-soft);
    margin-left:2px;
}

/* ===== 問題シート ===== */

#qCategory{
    font-family:"Klee One", cursive;
    font-weight:600;
    font-size:14px;
    color:var(--red-pen);
    display:block;
    min-height:22px;
    margin-bottom:8px;
}

.question-sheet{
    background:
        repeating-linear-gradient(
            var(--card-bg) 0px, var(--card-bg) 33px,
            var(--paper-line) 34px, var(--card-bg) 35px
        );
    border:1px solid var(--paper-line);
    border-left:3px solid var(--navy);
    padding:22px 22px 26px;
    margin-bottom:22px;
}
.q-label{
    font-family:"Zen Old Mincho", serif;
    font-size:12px;
    font-weight:700;
    color:var(--ink-soft);
    letter-spacing:.14em;
    display:block;
    margin-bottom:10px;
}
#qText{
    font-family:"Zen Old Mincho", serif;
    font-size:19px;
    line-height:1.9;
    min-height:70px;
    color:var(--ink);
}

#answerInput{
    width:100%;
    font-family:"Zen Kaku Gothic New", sans-serif;
    font-size:17px;
    padding:12px 4px;
    border:none;
    border-bottom:2px solid var(--ink);
    background:transparent;
    margin-bottom:12px;
    color:var(--ink);
}
#answerInput::placeholder{ color:#A9AFB8; }
#answerInput:focus{ outline:none; border-bottom-color:var(--red-pen); }

.flash{
    text-align:center;
    font-family:"Zen Old Mincho", serif;
    font-size:18px;
    font-weight:700;
    min-height:32px;
    margin:4px 0 14px;
    color:var(--ink-soft);
}
.flash.correct{ color:var(--sage); }
.flash.wrong{ color:var(--red-pen); }

/* ===== 結果画面 ===== */

.result-box{ text-align:center; margin-bottom:24px; }
.result-box h2{
    font-family:"Zen Old Mincho", serif;
    font-size:20px;
    margin-bottom:6px;
}
.result-score{
    font-family:"Zen Old Mincho", serif;
    font-size:64px;
    font-weight:700;
    color:var(--red-pen);
    line-height:1.2;
}
.result-score .unit{
    font-family:"Zen Kaku Gothic New", sans-serif;
    font-size:18px;
    color:var(--ink-soft);
    margin-left:4px;
}
#bestNote{
    font-family:"Klee One", cursive;
    font-size:14.5px;
    color:var(--ink);
    margin-top:6px;
}
#unlockNote{
    display:none;
    font-size:13.5px;
    color:var(--gold);
    background:#FBF6E6;
    border:1px dashed var(--gold-soft);
    padding:10px 14px;
    margin-top:14px;
    line-height:1.7;
}

/* ===== ランキング ===== */

.leader-title{
    font-family:"Zen Old Mincho", serif;
    font-size:17px;
    margin:30px 0 12px;
    padding-top:22px;
    border-top:1px dashed var(--paper-line);
}

#leaderboard{ list-style:none; }
#leaderboard li{
    display:flex;
    justify-content:space-between;
    padding:11px 4px;
    border-bottom:1px dashed var(--paper-line);
    font-size:14.5px;
}
#leaderboard li:last-child{ border-bottom:none; }
#leaderboard li span{ font-weight:700; }
#leaderboard li.empty{ color:var(--ink-soft); justify-content:center; }
#leaderboard a:hover{ color:var(--red-pen) !important; }

/* ===== リアルタイム早押し専用 ===== */

.cat-grid{
    display:grid;
    grid-template-columns:repeat(auto-fill, minmax(140px, 1fr));
    gap:10px;
    margin-bottom:10px;
}
.cat-btn{
    font-weight:700;
    font-size:14.5px;
    color:var(--navy);
    background:var(--card-bg);
    border:1px solid var(--navy);
    padding:14px 10px;
}
.cat-btn:hover:not(:disabled){ background:#EEF1F6; transform:translateY(-1px); }
.notice{
    font-size:13.5px;
    line-height:1.8;
    padding:12px 14px;
    margin-bottom:16px;
    border:1px dashed var(--paper-line);
    background:var(--paper);
}
.notice.error{ color:var(--red-pen); border-color:var(--red-pen); }

.room-name{
    font-family:"Klee One", cursive;
    font-weight:600;
    font-size:14px;
    color:var(--red-pen);
}
.phase-label{ font-size:11.5px; font-weight:700; color:var(--ink-soft); display:block; margin-bottom:2px; }

#statusLine{
    text-align:center;
    font-weight:700;
    font-size:14.5px;
    min-height:26px;
    margin-bottom:10px;
    color:var(--ink-soft);
}
#statusLine.is-me{ color:var(--red-pen); }

#buzzBtn{
    width:100%;
    font-size:22px;
    padding:20px;
    margin-bottom:12px;
}

.answer-row{ display:flex; gap:10px; align-items:flex-end; }
.answer-row #answerInput{ flex:1; }
.answer-row .btn-stamp{ flex:0 0 auto; padding:12px 18px; }

.last-result{
    font-size:13.5px;
    line-height:1.8;
    color:var(--ink);
    background:#FBF6E6;
    border:1px dashed var(--gold-soft);
    padding:10px 14px;
    margin:6px 0 14px;
    display:none;
}

</style>
</head>

<body>

<a class="back-link" href="toppage.html">← ホームに戻る</a>

<main class="wrap">
    <div class="event-sheet">

        <div class="event-head">
            <span class="eyebrow">EVENT</span>
            <h1>🔔 リアルタイム早回答クイズ</h1>
            <p>同じ学年のみんなと同じ問題に同時に挑戦。わかった人からどんどん回答して、最初に正解した人の得点になります。</p>
        </div>

        <div id="notice" class="notice" style="display:none;"></div>

        <!-- ===== ロビー(カテゴリ選択) ===== -->
        <div id="lobbyScreen">
            <ul class="rules">
                <li>カテゴリごとに部屋があります。同じ部屋の人には同じ問題が出ます</li>
                <li>早押しはありません。わかった人からどんどん回答しましょう</li>
                <li>最初に正解した人に得点が1点入り、全員が次の問題へ進みます</li>
                <li>不正解でもペナルティはなく、何度でも答え直せます</li>
                <li>30秒たっても誰も正解しないと、答えを発表して次の問題へ進みます</li>
            </ul>
            <div id="categoryList" class="cat-grid"></div>
        </div>

        <!-- ===== 部屋 ===== -->
        <div id="roomScreen" style="display:none;">
            <div class="play-bar">
                <div>
                    <span class="phase-label">この問題の残り時間</span>
                    <div id="timerBox">-<span class="unit">秒</span></div>
                </div>
                <div class="score-box">
                    <span class="label">この部屋の得点</span>
                    <div><span id="myPoints">0</span><span class="unit">点</span></div>
                </div>
            </div>

            <span id="roomName" class="room-name"></span>
            <span id="qCategory"></span>

            <div class="question-sheet">
                <span class="q-label">問題</span>
                <div id="qText">読み込み中…</div>
            </div>

            <div id="answerBox" style="display:block;">
                <div class="answer-row">
                    <input id="answerInput" type="text" placeholder="ここに答えを書いてEnter" autocomplete="off">
                    <button id="answerBtn" class="btn-stamp">回答</button>
                </div>
            </div>

            <div class="flash" id="flash"></div>
            <div class="last-result" id="lastResult"></div>

            <div class="btn-row btn-row--sub">
                <button id="leaveBtn" class="btn-outline">カテゴリ選択に戻る</button>
            </div>

            <h2 class="leader-title">🏆 この部屋のTOP5</h2>
            <ul id="leaderboard"></ul>
        </div>

    </div>
</main>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase.js"></script>
<script src="idle-logout.js"></script>
<script>
// ==========================
// リアルタイム早回答クイズ
//
// 流れ: getSession → rt_categories(認証・承認チェックを兼ねる) → 部屋を選ぶ
//       → チャンネルを購読 → rt_join(入室時に1回だけ) → あとは Broadcast を受け取るだけ
//
// ・早押し(ロック)はなし。全員が同時に答えられて、最初に正解した人の得点になる
// ・答えはこのページには一切届かない。判定・加点・次の問題の選択はすべてサーバー(SQL)側
// ・不正解は自分にだけ返る(他の人へは通知しない)。ペナルティなし、何度でも答え直せる
// ・時間切れ(30秒)の処理は、全員が同時に呼ばないよう少しずらして呼ぶ
// ・Broadcast は ver(状態の版番号)で順番を判定する。古い/重複した通知は捨てる
// ==========================

let myId = null;
let myGrade = null;
let currentCategory = null;
let channel = null;
let hiddenAt = 0;

let st = null;            // { seq, ver, question, category }
let phaseEndsAt = 0;      // この問題の終了時刻(この端末の時計で)
let myPoints = 0;
let pendingAnswer = false;
let skipHandledKey = "";  // 同じ状態で rt_skip を何度も呼ばないための印
let flashTimer = null;

const $ = (id) => document.getElementById(id);

const noticeEl = $("notice");
const lobbyScreen = $("lobbyScreen");
const roomScreen = $("roomScreen");
const categoryList = $("categoryList");
const timerBox = $("timerBox");
const qCategoryEl = $("qCategory");
const qTextEl = $("qText");
const answerInput = $("answerInput");
const answerBtn = $("answerBtn");
const flashEl = $("flash");
const lastResultEl = $("lastResult");

init();

async function init() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        location.href = "login.html";
        return;
    }
    myId = session.user.id;

    answerBtn.addEventListener("click", submitAnswer);
    $("leaveBtn").addEventListener("click", leaveRoom);

    answerInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing) {
            e.preventDefault();
            submitAnswer();
        }
    });

    // タブに戻ってきたとき、しばらく離れていたら状態を取り直す(Broadcast の取りこぼし対策)
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            hiddenAt = Date.now();
        } else if (currentCategory && hiddenAt && Date.now() - hiddenAt > 5000) {
            resync();
        }
    });
    window.addEventListener("pagehide", () => {
        if (channel) supabaseClient.removeChannel(channel);
    });

    setInterval(tick, 200);

    await loadCategories();
}

// ---------- ロビー ----------

function showNotice(text, isError) {
    noticeEl.textContent = text;
    noticeEl.className = "notice" + (isError ? " error" : "");
    noticeEl.style.display = text ? "block" : "none";
}

async function loadCategories() {
    const { data, error } = await supabaseClient.rpc("rt_categories");

    if (error) {
        console.error(error);
        if (String(error.message).includes("not_verified")) {
            showNotice("このアカウントはまだ利用が許可されていません。管理者の承認をお待ちください。", true);
        } else {
            showNotice("カテゴリを読み込めませんでした。時間をおいてもう一度お試しください。", true);
        }
        return;
    }

    myGrade = data.grade;
    categoryList.innerHTML = "";

    if (!data.categories || data.categories.length === 0) {
        showNotice("出題できるカテゴリがありません。", true);
        return;
    }

    data.categories.forEach((c) => {
        const btn = document.createElement("button");
        btn.className = "cat-btn";
        btn.textContent = c;
        btn.addEventListener("click", () => joinRoom(c));
        categoryList.appendChild(btn);
    });
}

// ---------- 入室・退室 ----------

async function joinRoom(category) {
    showNotice("", false);
    categoryList.querySelectorAll("button").forEach((b) => (b.disabled = true));

    try {
        await openChannel(category);

        const { data, error } = await supabaseClient.rpc("rt_join", { p_category: category });
        if (error || !data || !data.ok) throw error || new Error("join failed");

        currentCategory = category;
        myPoints = data.my_points || 0;
        st = null;
        applyState(data.state, true);
        renderTop(data.top);

        $("roomName").textContent = `${myGrade} ／ ${category}`;
        $("myPoints").textContent = myPoints;
        flashEl.textContent = "";
        lastResultEl.style.display = "none";
        answerInput.value = "";

        lobbyScreen.style.display = "none";
        roomScreen.style.display = "block";
        render();
        answerInput.focus();
    } catch (err) {
        console.error(err);
        if (channel) {
            supabaseClient.removeChannel(channel);
            channel = null;
        }
        showNotice("入室できませんでした。時間をおいてもう一度お試しください。", true);
    } finally {
        categoryList.querySelectorAll("button").forEach((b) => (b.disabled = false));
    }
}

async function openChannel(category) {
    if (channel) {
        await supabaseClient.removeChannel(channel);
        channel = null;
    }

    // 受信専用の private チャンネル(送信はサーバーだけ。RLS で学年ごとに受信を制限している)
    try { await supabaseClient.realtime.setAuth(); } catch (e) { /* 次の購読で失敗すれば検知される */ }

    const topic = `rt:${myGrade}:${category}`;
    const ch = supabaseClient.channel(topic, { config: { private: true } });

    ch.on("broadcast", { event: "next" }, ({ payload }) => onNext(payload));

    await new Promise((resolve, reject) => {
        let first = true;
        ch.subscribe((status) => {
            if (status === "SUBSCRIBED") {
                if (first) {
                    first = false;
                    resolve();
                } else if (currentCategory) {
                    resync(); // 切断→再接続したら取りこぼしを埋める
                }
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                if (first) {
                    first = false;
                    reject(new Error("channel " + status));
                } else {
                    showNotice("接続が不安定です。つながり直しています…", true);
                }
            }
        });
    });

    channel = ch;
    showNotice("", false);
}

async function leaveRoom() {
    currentCategory = null;
    st = null;
    if (channel) {
        await supabaseClient.removeChannel(channel);
        channel = null;
    }
    roomScreen.style.display = "none";
    lobbyScreen.style.display = "block";
}

// rt_join をもう一度呼んで最新の状態に合わせる
async function resync() {
    if (!currentCategory) return;
    const { data, error } = await supabaseClient.rpc("rt_join", { p_category: currentCategory });
    if (error || !data || !data.ok) {
        console.error(error);
        return;
    }
    myPoints = data.my_points || 0;
    $("myPoints").textContent = myPoints;
    if (applyState(data.state, false)) answerInput.value = "";
    renderTop(data.top);
    showNotice("", false);
    render();
}

// ---------- 状態の反映 ----------

// サーバーの state を取り込む。ver が古ければ無視する(重複・順番違いの通知対策)
function applyState(s, force) {
    if (!s) return false;
    if (!force && st && s.ver <= st.ver) return false;

    st = { seq: s.seq, ver: s.ver, question: s.question, category: s.category };
    // 残り時間は「ミリ秒」で届く。端末の時計とサーバーの時計のずれを避けるため
    phaseEndsAt = Date.now() + (s.ms || 0);
    return true;
}

function onNext(p) {
    if (!st || p.ver <= st.ver) return;

    if (p.reason === "correct") {
        const who = p.winner === myId ? "あなた" : `${p.winner_name || "だれか"}さん`;
        showLastResult(`⭕ ${who}が正解！ 答え：${p.correct_answer}`);
    } else {
        showLastResult(`⏭️ 時間切れ。答え：${p.correct_answer}`);
    }

    applyState(p.state, true);
    renderTop(p.top);
    answerInput.value = ""; // 次の問題へ。書きかけの答えは消す
    render();
    answerInput.focus();
}

// ---------- 画面の描画 ----------

function render() {
    if (!st) return;
    qCategoryEl.textContent = `【${st.category || currentCategory}】`;
    qTextEl.textContent = st.question || "";
    updateTimer();
}

function updateTimer() {
    const sec = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000));
    timerBox.innerHTML = `${sec}<span class="unit">秒</span>`;
    timerBox.classList.toggle("is-low", sec <= 5);
}

function showFlash(text, cls) {
    flashEl.textContent = text;
    flashEl.className = "flash" + (cls ? " " + cls : "");
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
        flashEl.textContent = "";
        flashEl.className = "flash";
    }, 3000);
}

function showLastResult(text) {
    lastResultEl.textContent = text;
    lastResultEl.style.display = "block";
}

function renderTop(top) {
    const list = $("leaderboard");
    list.innerHTML = "";

    if (!top || top.length === 0) {
        const li = document.createElement("li");
        li.className = "empty";
        li.textContent = "まだ誰も得点していません";
        list.appendChild(li);
        return;
    }

    const medals = ["🥇", "🥈", "🥉"];
    top.forEach((t, i) => {
        const li = document.createElement("li");
        const name = document.createElement("div");
        name.textContent = `${medals[i] || `${i + 1}位`} ${t.name}`;
        const pts = document.createElement("span");
        pts.textContent = `${t.points}点`;
        li.appendChild(name);
        li.appendChild(pts);
        list.appendChild(li);
    });
}

// ---------- 時間切れの検知 ----------

function tick() {
    if (!st || !currentCategory) return;
    updateTimer();

    if (Date.now() < phaseEndsAt) return;

    // 期限を過ぎた。全員が一斉に呼ばないよう 0.3〜1.5秒ずらす。
    // (待っている間に Broadcast で次の問題へ進めば、呼ばずに済む)
    const key = `${st.seq}:${st.ver}`;
    if (skipHandledKey === key) return;
    skipHandledKey = key;

    const seq = st.seq;
    const ver = st.ver;
    const delay = 300 + Math.random() * 1200;

    setTimeout(async () => {
        if (!st || st.seq !== seq || st.ver !== ver) return; // もう進んでいる

        const { data, error } = await supabaseClient.rpc("rt_skip", {
            p_category: currentCategory,
            p_seq: seq
        });
        if (error || !data) {
            console.error(error);
            skipHandledKey = ""; // 通信失敗。次の tick でやり直す
            return;
        }

        if (data.next) {
            onNext(data.next);
        } else if (data.state) {
            if (applyState(data.state, false)) render();
        }

        // サーバーが「まだ期限前」と判断した場合(時計のずれ等)は、少し待ってやり直す
        if (data.changed === false && st && st.seq === seq && st.ver === ver) {
            setTimeout(() => { if (skipHandledKey === key) skipHandledKey = ""; }, 1500);
        }
    }, delay);
}

// ---------- 回答 ----------

async function submitAnswer() {
    if (!st || pendingAnswer) return;

    const text = answerInput.value;
    if (!text.trim()) return;

    pendingAnswer = true;
    answerBtn.disabled = true;
    const sentSeq = st.seq;

    try {
        const { data, error } = await supabaseClient.rpc("rt_answer", {
            p_category: currentCategory,
            p_seq: sentSeq,
            p_text: text
        });
        if (error || !data) throw error || new Error("answer failed");

        if (!data.ok) {
            // 回答している間に、他の人が正解した(または時間切れで次へ進んだ)
            showFlash("😢 惜しい！先に正解されました", "wrong");
            applyState(data.state, false);
            if (st && st.seq !== sentSeq) answerInput.value = "";
        } else if (data.correct) {
            myPoints = data.my_points ?? myPoints + 1;
            $("myPoints").textContent = myPoints;
            showFlash("⭕ 正解！ +1点", "correct");
            onNext(data.next); // Broadcast が先に届いていれば ver が古いので何も起きない
        } else {
            showFlash("❌ 不正解！もう一度どうぞ", "wrong");
            answerInput.value = "";
        }
    } catch (err) {
        console.error(err);
        showFlash("通信に失敗しました", "wrong");
    } finally {
        pendingAnswer = false;
        answerBtn.disabled = false;
        render();
        answerInput.focus();
    }
}

</script>

</body>
</html>
