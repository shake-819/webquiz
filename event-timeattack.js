// ==========================
// イベント: タイムアタッククイズ
// ・制限時間60秒、全カテゴリからランダム出題
// ・スキップで-5秒、リタイアで即終了
// ・正解数の自己ベストを timeattack_scores に保存し、ランキング表示
// ・プレイ1回ごとの詳細（正解数・不正解数・スキップ回数など）は
//   timeattack_runs に全件記録（ランキングには使わない、集計・履歴用）
// ・一定数以上の正解で限定アバターが解放される（判定は profile.js 側）
//
// 既存の app.js / index.html のクイズ機能・成績データ（users テーブルの
// score, correct, wrong など）には一切書き込みません。完全に独立した
// イベント専用テーブル（timeattack_scores / timeattack_runs）だけを使います。
//
// このファイルと event-timeattack.html を削除すれば、イベントは完全に消えます。
//
// ▼ 必要なテーブル（Supabase SQL Editorで一度だけ実行）
//
//   -- ランキング用：ユーザーごとの自己ベストだけを持つ
//   create table timeattack_scores (
//     user_id uuid primary key references auth.users(id) on delete cascade,
//     best_score integer not null default 0,
//     updated_at timestamptz not null default now()
//   );
//   alter table timeattack_scores enable row level security;
//   create policy "select all" on timeattack_scores for select using (true);
//   create policy "insert own" on timeattack_scores for insert with check (auth.uid() = user_id);
//   create policy "update own" on timeattack_scores for update using (auth.uid() = user_id);
//
//   -- 集計・履歴用：プレイ1回ごとの結果を全件保存
//   create table timeattack_runs (
//     id bigint generated always as identity primary key,
//     user_id uuid not null references auth.users(id) on delete cascade,
//     correct_count integer not null default 0,
//     wrong_count integer not null default 0,
//     skip_count integer not null default 0,
//     score integer not null default 0,
//     retired boolean not null default false,
//     played_at timestamptz not null default now()
//   );
//   alter table timeattack_runs enable row level security;
//   create policy "select own" on timeattack_runs for select using (auth.uid() = user_id);
//   create policy "insert own" on timeattack_runs for insert with check (auth.uid() = user_id);
// ==========================

const API_URLS = {
    "中3": "https://sheet2api.com/v1/29AXFCHHTfS7/3",
    "高3": "https://sheet2api.com/v1/29AXFCHHTfS7/discord"
};

const TIME_LIMIT = 60;       // 制限時間（秒）
const SKIP_PENALTY = 5;      // スキップ1回あたりのペナルティ（秒）
const UNLOCK_SCORE = 15;     // 限定アバター解放に必要な正解数（profile.js側の値と合わせること）

let myId = null;
let questions = [];
let currentQuestion = null;
let recentQuestions = [];

let remaining = TIME_LIMIT;
let score = 0;
let wrongCount = 0;
let skipCount = 0;
let timerHandle = null;
let isPlaying = false;
let bestScoreBefore = 0;

const startScreen = document.getElementById("startScreen");
const playScreen = document.getElementById("playScreen");
const resultScreen = document.getElementById("resultScreen");

const timerBox = document.getElementById("timerBox");
const liveScoreEl = document.getElementById("liveScore");
const qCategoryEl = document.getElementById("qCategory");
const qTextEl = document.getElementById("qText");
const flashEl = document.getElementById("flash");
const answerInput = document.getElementById("answerInput");

init();

async function init() {
    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
        location.href = "login.html";
        return;
    }
    myId = session.user.id;

    document.getElementById("startBtn").addEventListener("click", startGame);
    document.getElementById("skipBtn").addEventListener("click", skipQuestion);
    document.getElementById("retireBtn").addEventListener("click", () => endGame(false));
    document.getElementById("retryBtn").addEventListener("click", backToStart);
    document.getElementById("homeBtn").addEventListener("click", () => location.href = "toppage.html");

    answerInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing) {
            e.preventDefault();
            submitAnswer();
        }
    });

    await loadQuestions();
    await loadLeaderboard();
}

async function loadQuestions() {
    const { data: profile, error } = await supabaseClient
        .from("users")
        .select("grade")
        .eq("id", myId)
        .single();

    let grade = "中3";
    if (!error && profile && profile.grade && API_URLS[String(profile.grade).trim()]) {
        grade = String(profile.grade).trim();
    }

    try {
        const res = await fetch(API_URLS[grade]);
        const data = await res.json();
        questions = Array.isArray(data) ? data : (Array.isArray(data.rows) ? data.rows : []);
    } catch (err) {
        console.error(err);
        questions = [];
    }
}

function backToStart() {
    resultScreen.style.display = "none";
    startScreen.style.display = "block";
}

function startGame() {
    if (questions.length === 0) {
        alert("問題を読み込めませんでした。時間をおいてもう一度お試しください。");
        return;
    }

    score = 0;
    wrongCount = 0;
    skipCount = 0;
    remaining = TIME_LIMIT;
    recentQuestions = [];
    isPlaying = true;

    startScreen.style.display = "none";
    resultScreen.style.display = "none";
    playScreen.style.display = "block";

    updateScoreDisplay();
    updateTimerDisplay();
    nextQuestion();

    timerHandle = setInterval(tick, 1000);
    answerInput.value = "";
    answerInput.focus();
}

function tick() {
    remaining -= 1;
    updateTimerDisplay();
    if (remaining <= 0) {
        remaining = 0;
        updateTimerDisplay();
        endGame(true);
    }
}

function updateTimerDisplay() {
    timerBox.innerHTML = `${remaining}<span class="unit">秒</span>`;
    timerBox.classList.toggle("is-low", remaining <= 10);
}

function updateScoreDisplay() {
    liveScoreEl.textContent = score;
}

function nextQuestion() {
    let available = questions.filter(q => !recentQuestions.includes(q.id));
    if (available.length === 0) {
        recentQuestions = [];
        available = questions;
    }
    if (available.length === 0) {
        qCategoryEl.textContent = "";
        qTextEl.textContent = "出題できる問題がありません。";
        currentQuestion = null;
        return;
    }

    currentQuestion = available[Math.floor(Math.random() * available.length)];
    recentQuestions.push(currentQuestion.id);
    if (recentQuestions.length > 15) recentQuestions.shift();

    qCategoryEl.textContent = `【${currentQuestion.category}】`;
    qTextEl.textContent = currentQuestion.question;
    answerInput.value = "";
    flashEl.textContent = "";
    flashEl.className = "flash";
}

function judge(userAnswer, question) {
    const ua = userAnswer.trim().toLowerCase();
    const ca = String(question.answer).trim().toLowerCase();
    const type = question.type || "normal";

    if (type === "multi") {
        return ca.split("|").includes(ua);
    }
    if (type === "unordered") {
        const normalize = text =>
            text.replace(/[、,]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ").toLowerCase();
        return normalize(ua) === normalize(ca);
    }
    return ua === ca;
}

function submitAnswer() {
    if (!isPlaying || !currentQuestion) return;

    const correct = judge(answerInput.value, currentQuestion);

    if (correct) {
        score += 1;
        updateScoreDisplay();
        flashEl.textContent = "⭕ 正解！";
        flashEl.className = "flash correct";
    } else {
        wrongCount += 1;
        flashEl.textContent = `❌ 不正解（正解: ${currentQuestion.answer}）`;
        flashEl.className = "flash wrong";
    }

    nextQuestion();
    answerInput.focus();
}

function skipQuestion() {
    if (!isPlaying) return;

    skipCount += 1;
    remaining = Math.max(0, remaining - SKIP_PENALTY);
    updateTimerDisplay();
    flashEl.textContent = `⏭️ スキップ（-${SKIP_PENALTY}秒）`;
    flashEl.className = "flash";

    if (remaining <= 0) {
        endGame(true);
        return;
    }

    nextQuestion();
    answerInput.focus();
}

async function endGame(timeUp) {
    if (!isPlaying) return;
    isPlaying = false;

    clearInterval(timerHandle);
    timerHandle = null;

    playScreen.style.display = "none";
    resultScreen.style.display = "block";

    document.getElementById("finalScore").textContent = score;

    await saveResults(!timeUp); // timeUp=false のときはリタイアによる終了
    await loadLeaderboard();
}

// プレイ1回分の記録を timeattack_runs に保存し、
// 自己ベストなら timeattack_scores（ランキング用）も更新する
async function saveResults(retired) {
    // ① 今回のプレイ内容をそのまま履歴として保存
    const { error: runError } = await supabaseClient
        .from("timeattack_runs")
        .insert({
            user_id: myId,
            correct_count: score,
            wrong_count: wrongCount,
            skip_count: skipCount,
            score: score,
            retired: retired
        });
    if (runError) console.error(runError);

    // ② 自己ベスト（ランキング用）の更新判定
    const { data: existing, error: fetchError } = await supabaseClient
        .from("timeattack_scores")
        .select("best_score")
        .eq("user_id", myId)
        .maybeSingle();

    if (fetchError) {
        console.error(fetchError);
        return;
    }

    bestScoreBefore = existing ? existing.best_score : 0;
    const bestNoteEl = document.getElementById("bestNote");
    const unlockNoteEl = document.getElementById("unlockNote");

    if (!existing) {
        const { error } = await supabaseClient
            .from("timeattack_scores")
            .insert({ user_id: myId, best_score: score });
        if (error) console.error(error);
        bestNoteEl.textContent = `自己ベストを更新しました！（今回: ${score}問）`;
    } else if (score > existing.best_score) {
        const { error } = await supabaseClient
            .from("timeattack_scores")
            .update({ best_score: score, updated_at: new Date().toISOString() })
            .eq("user_id", myId);
        if (error) console.error(error);
        bestNoteEl.textContent = `自己ベストを更新しました！（${existing.best_score}問 → ${score}問）`;
    } else {
        bestNoteEl.textContent = `自己ベスト: ${existing.best_score}問（今回: ${score}問）`;
    }

    const finalBest = Math.max(bestScoreBefore, score);
    if (finalBest >= UNLOCK_SCORE) {
        unlockNoteEl.style.display = "block";
        unlockNoteEl.textContent = `🎁 ${UNLOCK_SCORE}問以上正解を達成！プロフィールの「画像を変更」から限定アバターを選べます。`;
    } else {
        unlockNoteEl.style.display = "none";
    }
}

async function loadLeaderboard() {
    const { data: top, error } = await supabaseClient
        .from("timeattack_scores")
        .select("user_id,best_score")
        .order("best_score", { ascending: false })
        .limit(10);

    if (error || !top) {
        console.error(error);
        return;
    }

    const ids = top.map(t => t.user_id);
    let names = {};
    if (ids.length > 0) {
        const { data: users } = await supabaseClient
            .from("users")
            .select("id,name")
            .in("id", ids);
        (users || []).forEach(u => { names[u.id] = u.name; });
    }

    const medals = ["🥇", "🥈", "🥉"];
    const list = document.getElementById("leaderboard");
    list.innerHTML = "";

    if (top.length === 0) {
        list.innerHTML = `<li class="empty">まだ誰も挑戦していません</li>`;
        return;
    }

    top.forEach((t, i) => {
        list.innerHTML += `
            <li>
                <a class="rank-name-link" style="color:inherit;text-decoration:none;" href="profile.html?user=${t.user_id}">
                    ${medals[i] || `${i + 1}位`} ${names[t.user_id] || "名前未設定"}
                </a>
                <span>${t.best_score}問</span>
            </li>
        `;
    });
}
