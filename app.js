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

let questions = [];
let currentQuestion = null;
let recentQuestions = [];
let categoryMap = {};
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
function submitAnswer() {

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

    if (correct) {

        result.textContent = "⭕ 正解！";

    } else {

        result.textContent =
            "❌ 不正解";

    }

}

async function addTestUser(){

    const { data, error } = await supabaseClient
      .from("users")
      .insert({
        name: "test",
        score: 100,
        correct: 5,
        wrong: 2
      })
      .select();

    console.log("data:", data);
    console.log("error:", error);
    console.log("message:", error?.message);
    console.log("details:", error?.details);
    console.log("hint:", error?.hint);
    console.log("code:", error?.code);
}
// testSupabase();

addTestUser();

submitBtn?.addEventListener("click", submitAnswer);
hintBtn?.addEventListener("click", showHint);
nextBtn?.addEventListener("click", nextQuiz);

categorySelect?.addEventListener("change", () => {
    recentQuestions = [];
    nextQuiz();
});

loadQuestions();
