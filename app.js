// あとでKEITO CloudのURLに変更します
const API_URL = "https://あなたのKEITOCloudのURL";

const category = document.getElementById("category");
const question = document.getElementById("question");
const answer = document.getElementById("answer");
const result = document.getElementById("result");

const submitBtn = document.getElementById("submit");
const nextBtn = document.getElementById("next");

let currentQuestion = null;

// 問題取得
async function loadQuiz() {

    result.textContent = "";
    answer.value = "";

    const res = await fetch(`${API_URL}/quiz`);
    const data = await res.json();

    currentQuestion = data;

    category.textContent = `【${data.category}】`;
    question.textContent = data.question;
}

// 回答送信
async function submitAnswer() {

    if (!currentQuestion) return;

    const userAnswer = answer.value.trim();

    if (!userAnswer) {
        alert("答えを入力してください");
        return;
    }

    const res = await fetch(`${API_URL}/answer`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id: currentQuestion.id,
            answer: userAnswer
        })
    });

    const data = await res.json();

    if (data.correct) {

        result.textContent = "⭕ 正解！";

    } else {

        result.textContent = `❌ 不正解\n正解：${data.answer}`;

    }
}

submitBtn.addEventListener("click", submitAnswer);

nextBtn.addEventListener("click", loadQuiz);

// 最初の問題
loadQuiz();
