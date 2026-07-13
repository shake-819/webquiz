const API_URL = "https://sheet2api.com/v1/29AXFCHHTfS7/discord";

const category = document.getElementById("category");
const question = document.getElementById("question");
const answer = document.getElementById("answer");
const result = document.getElementById("result");

const submitBtn = document.getElementById("submit");
const nextBtn = document.getElementById("next");

let questions = [];
let currentQuestion = null;
let recentQuestions = [];

// 問題取得
async function loadQuestions() {

    const res = await fetch(API_URL);
    const data = await res.json();

    if (Array.isArray(data))
        questions = data;
    else if (Array.isArray(data.rows))
        questions = data.rows;
    else
        questions = [];

    nextQuiz();

}

// 次の問題
function nextQuiz() {

    result.textContent = "";
    answer.value = "";

    let available =
        questions.filter(q =>
            !recentQuestions.includes(q.id)
        );

    if (available.length === 0) {

        recentQuestions = [];

        available = questions;

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

loadQuestions();
