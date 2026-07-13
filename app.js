const API_URL = "https://sheet2api.com/v1/29AXFCHHTfS7/discord";

const category = document.getElementById("category");
const question = document.getElementById("question");
const answer = document.getElementById("answer");
const result = document.getElementById("result");

const submitBtn = document.getElementById("submit");
const nextBtn = document.getElementById("next");
const categorySelect = document.getElementById("categorySelect");

let questions = [];
let currentQuestion = null;
let recentQuestions = [];

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

    nextQuiz();
}
function nextQuiz() {

    result.textContent = "";
    answer.value = "";

    // 選択中カテゴリ
    const selectedCategory = categorySelect.value;

    // カテゴリで絞り込み
    let filtered =
        selectedCategory === "all"
            ? questions
            : questions.filter(q => q.category === selectedCategory);

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
            `❌ 不正解\n正解：${currentQuestion.answer}`;

    }

}

submitBtn.addEventListener("click", submitAnswer);

nextBtn.addEventListener("click", nextQuiz);
categorySelect.addEventListener("change", () => {
    recentQuestions = [];
    nextQuiz();
});

loadQuestions();
