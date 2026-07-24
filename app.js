const API_URL = "https://sheet2api.com/v1/29AXFCHHTfS7/discord";

const category = document.getElementById("category");
const question = document.getElementById("question");
const answer = document.getElementById("answer");
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

    }

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

        answer.value = "";

        setTimeout(() => {
            nextQuiz();
        }, 500);   // 0なら即切り替え、500なら0.5秒後

    } else {

        result.textContent = "❌ 不正解";
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

async function loadChat() {
    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    const { data } = await supabaseClient
        .from("chat_messages")
        .select("*")
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
            message: message
        });
    input.value = "";
    loadChat();

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

loadQuestions();
loadChat();

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

        loadChat();

    }

)

.subscribe();
