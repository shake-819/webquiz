const API_URLS = {
    "中3": "https://sheet2api.com/v1/29AXFCHHTfS7/3",
    "高3": "https://sheet2api.com/v1/29AXFCHHTfS7/discord"
};

let API_URL = null;
let myGrade = "中3"; // ログインユーザーの学年(チャットの絞り込みに使用)

const category = document.getElementById("category");
const question = document.getElementById("question");
const answer = document.getElementById("answer");

// 回答欄でEnterキーを押したら正誤判定する
answer.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        submitAnswer();
    }
});

// 採点マーク（◯/✓）を解答欄の横に表示する
const markOverlay = document.getElementById("markOverlay");
const answerRow = document.querySelector(".answer-row");
function showMark(isCorrect) {
    if (!markOverlay) return;

    markOverlay.classList.remove("is-active", "is-correct", "is-wrong");
    markOverlay.querySelectorAll(".mark-svg").forEach(svg => svg.classList.remove("draw"));

    // リフローを挟んでアニメーションを再スタートさせる
    void markOverlay.offsetWidth;

    markOverlay.classList.add("is-active", isCorrect ? "is-correct" : "is-wrong");
    answerRow?.classList.add("has-mark");

    requestAnimationFrame(() => {
        const svg = markOverlay.querySelector(
            isCorrect ? ".mark-svg--correct" : ".mark-svg--wrong"
        );
        svg?.classList.add("draw");
    });

    // 次の問題に切り替わる前にフェードアウト
    clearTimeout(showMark._timer);
    showMark._timer = setTimeout(() => {
        markOverlay.classList.remove("is-active");
        answerRow?.classList.remove("has-mark");
    }, 900);
}
const result = document.getElementById("result");

const submitBtn = document.getElementById("submit");
const nextBtn = document.getElementById("next");
const categorySelect = document.getElementById("categorySelect");
const hintBtn = document.getElementById("hint");

let revealedIndexes = [];
let usedHint = false;
let questions = [];
let currentQuestion = null;
let recentQuestions = [];
let categoryMap = {};
checkLogin();

async function checkLogin() {
    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
        location.href = "login.html";
        return;
    }

    await setApiUrlByGrade(session.user.id);

    // 学年が確定してから初めて問題を読み込む
    loadQuestions();
    loadBookmarks();
    loadChat();
}

async function setApiUrlByGrade(userId) {
    const { data: profile, error } =
        await supabaseClient
            .from("users")
            .select("grade")
            .eq("id", userId)
            .single();

    if (error || !profile || !profile.grade) {
        console.error("学年情報の取得に失敗しました", error);
        API_URL = API_URLS["中3"]; // フォールバック(必要に応じて変更)
        myGrade = "中3";
        return;
    }

    const grade = String(profile.grade).trim();
    API_URL = API_URLS[grade] || API_URLS["中3"];
    myGrade = API_URLS[grade] ? grade : "中3";
}
async function loadQuestions() {

    const res = await fetch(API_URL);
    const data = await res.json();

    if (Array.isArray(data))
        questions = data;
    else if (Array.isArray(data.rows))
        questions = data.rows;
    else
        questions = [];

    // カテゴリ一覧を作成
    const categories = [...new Set(
        questions.map(q => q.category)
    )];

    categorySelect.innerHTML =
        '<option value="all">すべて</option>';

    categories.forEach(c => {
        const option = document.createElement("option");
        option.value = c;
        option.textContent = c;
        categorySelect.appendChild(option);
    });
    categoryMap = {};

    questions.forEach(q => {
        if (!categoryMap[q.category]) {
            categoryMap[q.category] = [];
        }
    categoryMap[q.category].push(q);
    });

    nextQuiz();
}
function nextQuiz() {

    result.textContent = "";
    usedHint = false;
    answer.value = "";
    revealedIndexes = [];

    // 選択中カテゴリ
    const selectedCategory = categorySelect.value;

    const filtered =
    categorySelect.value === "all"
        ? questions
        : categoryMap[categorySelect.value];

    let available =
        filtered.filter(q =>
            !recentQuestions.includes(q.id)
        );

    if (available.length === 0) {

        recentQuestions = [];

        available = filtered;

    }

    if (available.length === 0) {
        question.textContent = "このカテゴリには問題がありません。";
        category.textContent = "";
        currentQuestion = null;
        return;
    }

    currentQuestion =
        available[
            Math.floor(Math.random() * available.length)
        ];

    recentQuestions.push(currentQuestion.id);

    if (recentQuestions.length > 10)
        recentQuestions.shift();

    category.textContent = `【${currentQuestion.category}】`;
    question.textContent = currentQuestion.question;
    renderBookmarkStar(); // ← 追加

}
function showHint() {
    usedHint = true;

    if (!currentQuestion) return;

    const ans = String(currentQuestion.answer);

    // 開示できる文字を取得
    const candidates = [];

    for (let i = 0; i < ans.length; i++) {

        if (
            ans[i] !== " " &&
            ans[i] !== "　" &&
            ans[i] !== "、" &&
            ans[i] !== "|" &&
            !revealedIndexes.includes(i)
        ) {
            candidates.push(i);
        }
    }

    if (candidates.length === 0) {
        result.textContent = "これ以上ヒントはありません";
        return;
    }

    // ランダムで1文字公開
    const index =
        candidates[Math.floor(Math.random() * candidates.length)];

    revealedIndexes.push(index);

    const hint = ans
        .split("")
        .map((ch, i) => {

            if (revealedIndexes.includes(i)) return ch;

            if (" 、|　".includes(ch)) return ch;

            return "◯";
        })
        .join("");

    result.textContent =
        `💡 ${hint}`;
}
// 正解判定
async function submitAnswer() {

    if (!currentQuestion) return;

    const userAnswer =
        answer.value.trim().toLowerCase();

    const correctAnswer =
        String(currentQuestion.answer)
        .trim()
        .toLowerCase();

    let correct = false;

    const type =
        currentQuestion.type || "normal";

    if (type === "normal") {

        correct =
            userAnswer === correctAnswer;

    }

    else if (type === "multi") {

        correct =
            correctAnswer
            .split("|")
            .includes(userAnswer);

    }

    else if (type === "unordered") {

        const normalize = text =>
            text
                .replace(/[、,]/g, " ")
                .split(/\s+/)
                .filter(Boolean)
                .sort()
                .join(" ")
                .toLowerCase();

        correct =
            normalize(userAnswer) ===
            normalize(correctAnswer);

    }

    // ----------------------------
    // ここからSupabase更新
    // ----------------------------

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) return;

    // ユーザー情報取得
    const { data: profile, error } =
        await supabaseClient
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        console.error(error);
        return;
    }
    const newCorrect = profile.correct + (correct && !usedHint ? 1 : 0);

    if (correct) {

        result.textContent =
            `⭕ 正解！\n現在${newCorrect}問正解`;

        showMark(true);

        answer.value = "";

        setTimeout(() => {
            nextQuiz();
        }, 500);   // 0なら即切り替え、500なら0.5秒後

    } else {

        result.textContent = "❌ 不正解";
        showMark(false);
        answer.value = "";
    }

    // users更新
    const updateData = {
        score: profile.score + (correct && !usedHint ? 1 : 0),
        correct: profile.correct + (correct && !usedHint ? 1 : 0),
        wrong: profile.wrong + (correct ? 0 : 1)
    };

    await supabaseClient
        .from("users")
        .update(updateData)
        .eq("id", user.id);

    // Freeならここで終了
    if (profile.plan === "free") return;

    // ==========================
    // Premium限定 科目集計
    // ==========================

    const { data: categoryStat } =
        await supabaseClient
        .from("user_category_stats")
        .select("*")
        .eq("user_id", user.id)
        .eq("category", currentQuestion.category)
        .maybeSingle();

    if (!categoryStat) {

        await supabaseClient
            .from("user_category_stats")
            .insert({
                user_id: user.id,
                category: currentQuestion.category,
                correct: (correct && !usedHint) ? 1 : 0,
                wrong: correct ? 0 : 1
            });

    } else {

        await supabaseClient
            .from("user_category_stats")
            .update({
                correct:
                    categoryStat.correct + ((correct && !usedHint) ? 1 : 0),
                wrong:
                    categoryStat.wrong + (correct ? 0 : 1),
            })
            .eq("id", categoryStat.id);

    }

    // ==========================
    // Premium限定 日別集計
    // ==========================

    const today =
        new Date().toISOString().slice(0, 10);

    const { data: dailyStat } =
        await supabaseClient
        .from("user_daily_stats")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .eq("category", currentQuestion.category)
        .maybeSingle();

    if (!dailyStat) {

        await supabaseClient
            .from("user_daily_stats")
            .insert({
                user_id: user.id,
                date: today,
                category: currentQuestion.category,
                correct: (correct && !usedHint) ? 1 : 0,
                wrong: correct ? 0 : 1
            });

    } else {

        await supabaseClient
            .from("user_daily_stats")
            .update({
                correct:
                    dailyStat.correct + ((correct && !usedHint) ? 1 : 0),
                wrong:
                    dailyStat.wrong + (correct ? 0 : 1)
            })
            .eq("id", dailyStat.id);

    }

}
// ==========================
// ブックマーク機能
// ==========================
let bookmarkedIds = new Set();
let bookmarkStarEl = null;

function ensureBookmarkStarElement() {
    if (bookmarkStarEl) return bookmarkStarEl;

    bookmarkStarEl = document.createElement("span");
    bookmarkStarEl.id = "bookmarkStar";
    bookmarkStarEl.style.cssText = `
        cursor: pointer;
        font-size: 18px;
        margin-left: 8px;
        user-select: none;
        vertical-align: middle;
        transition: transform 0.15s ease;
    `;
    bookmarkStarEl.addEventListener("click", toggleBookmark);
    bookmarkStarEl.addEventListener("mousedown", () => {
        bookmarkStarEl.style.transform = "scale(1.3)";
    });
    bookmarkStarEl.addEventListener("mouseup", () => {
        bookmarkStarEl.style.transform = "scale(1)";
    });

    // カテゴリ表示の直後に挿入
    category.insertAdjacentElement("afterend", bookmarkStarEl);
    return bookmarkStarEl;
}

// 起動時に自分のブックマーク一覧をまとめて取得
async function loadBookmarks() {
    const {
        data: { user }
    } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data, error } = await supabaseClient
        .from("user_bookmarks")
        .select("question_id")
        .eq("user_id", user.id);

    if (error) {
        console.error(error);
        return;
    }

    bookmarkedIds = new Set(data.map(row => String(row.question_id)));
}

// 現在の問題に応じて星の見た目を更新
function renderBookmarkStar() {
    if (!currentQuestion) return;

    const starEl = ensureBookmarkStarElement();
    const isBookmarked = bookmarkedIds.has(String(currentQuestion.id));

    starEl.textContent = isBookmarked ? "★" : "☆";
    starEl.style.color = isBookmarked ? "#facc15" : "#999";
    starEl.title = isBookmarked ? "ブックマーク解除" : "ブックマークする";
}

// クリック時のトグル処理
async function toggleBookmark() {
    if (!currentQuestion) return;

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();
    if (!user) return;

    // プラン確認（Premium限定）
    const { data: profile, error: profileError } = await supabaseClient
        .from("users")
        .select("plan")
        .eq("id", user.id)
        .single();

    if (profileError) {
        console.error(profileError);
        return;
    }

    if (profile.plan !== "premium") {
        alert("ブックマークはPremiumプラン限定機能です");
        return;
    }

    const qid = String(currentQuestion.id);
    const isBookmarked = bookmarkedIds.has(qid);

    if (isBookmarked) {
        const { error } = await supabaseClient
            .from("user_bookmarks")
            .delete()
            .eq("user_id", user.id)
            .eq("question_id", qid);

        if (error) {
            console.error(error);
            return;
        }
        bookmarkedIds.delete(qid);
    } else {
        const { error } = await supabaseClient
            .from("user_bookmarks")
            .insert({
                user_id: user.id,
                question_id: qid,
                category: currentQuestion.category,
                question: currentQuestion.question,
                answer: String(currentQuestion.answer) // ← 追加
            });

        if (error) {
            console.error(error);
            return;
        }
        bookmarkedIds.add(qid);
    }

    renderBookmarkStar();
}
async function loadChat() {
    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    const { data } = await supabaseClient
        .from("chat_messages")
        .select("*")
        .eq("grade", myGrade)
        .order("created_at", { ascending: true })
        .limit(30);
        

    const messages =
        document.getElementById("messages");

    messages.innerHTML = "";

    data.forEach(msg => {

        const mine = msg.user_id === user.id;

        messages.innerHTML += `
            <div class="message ${mine ? "mine" : "other"}">
                <div class="name">${msg.user_name}</div>
                <div class="bubble">${msg.message}</div>
            </div>
        `;

    });
    messages.scrollTop = messages.scrollHeight;

}
async function sendChat() {

    const input =
        document.getElementById("chatInput");

    const message = input.value.trim();

    if (!message) return;

    const {
        data: { user }
    } =
    await supabaseClient.auth.getUser();

    const {
        data: profile
    }
    =
    await supabaseClient
        .from("users")
        .select("name, plan")
        .eq("id", user.id)
        .single();
    if (profile.plan !== "premium") {

        alert("Premiumプラン限定機能です");

        return;

    }

    await supabaseClient
        .from("chat_messages")
        .insert({
            user_id: user.id,
            user_name: profile.name,
            message: message,
            grade: myGrade
        });
    input.value = "";
    loadChat();
    // @AIメンションでAIが応答(AIはどの学年のチャットにも参加可能)
    if (message.includes("@AI")) {
        const question = message.replace(/@AI/gi, "").trim();
        askAI(question || "こんにちは", myGrade);
    }

}
// ==========================
// AIチャット機能
// ==========================
const GROQ_API_KEY = "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"; // ⚠️下の注意参照
const AI_BOT_USER_ID = "d23c8281-7c28-4440-a335-a8c0d20c9442";
const AI_BOT_NAME = "ちゃっとAI";

async function askAI(promptText, grade) {
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "openai/gpt-oss-120b",
                messages: [
                    { role: "system", content: "あなたはクイズアプリのクラスチャットにいる親切なAIアシスタントです。日本語で簡潔に答えてください。わからないことは必ず分からないと言ってください。" },
                    { role: "user", content: promptText }
                ]
            })
        });

        const data = await response.json();
        const aiText =
            data.choices?.[0]?.message?.content?.trim() ||
            "うまく答えられませんでした…";

        await supabaseClient
            .from("chat_messages")
            .insert({
                user_id: AI_BOT_USER_ID,
                user_name: AI_BOT_NAME,
                message: aiText,
                grade: grade
            });

    } catch (err) {
        console.error(err);
        await supabaseClient
            .from("chat_messages")
            .insert({
                user_id: AI_BOT_USER_ID,
                user_name: AI_BOT_NAME,
                message: "エラーが発生しました。もう一度試してください。",
                grade: grade
            });
    }
}
const chatInput = document.getElementById("chatInput");

chatInput.addEventListener("keydown", (e) => {

    if (e.key === "Enter" && !e.shiftKey) {

        e.preventDefault();
        sendChat();

    }

});
document
.getElementById("logout")
.addEventListener("click", logout);

async function logout(){

    await supabaseClient.auth.signOut();

    location.href = "login.html";

}


submitBtn?.addEventListener("click", submitAnswer);
hintBtn?.addEventListener("click", showHint);
nextBtn?.addEventListener("click", nextQuiz);
categorySelect?.addEventListener("change", () => {
    recentQuestions = [];
    nextQuiz();
});

document
.getElementById("home")
.addEventListener("click", () => {
    location.href = "toppage.html";
});
document
.getElementById("sendChat")
.addEventListener("click", sendChat);
supabaseClient

.channel("chat")

.on(

    "postgres_changes",

    {

        event: "INSERT",

        schema: "public",

        table: "chat_messages"

    },

    payload => {

        // 自分の学年のチャットへの投稿のときだけ再読み込み
        if (payload.new?.grade === myGrade) {
            loadChat();
        }

    }

)

.subscribe();
