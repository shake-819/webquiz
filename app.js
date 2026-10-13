// 問題の取得(fetchAllQuestions / QUESTION_TABLES)は question-cache.js にあります。
// 同じタブ内では一定時間キャッシュされ、ページを開くたびの全件取得を避けます。

let QUESTION_TABLE = null;
let myGrade = "中3"; // ログインユーザーの学年(チャットの絞り込みに使用)
let myPlan = "free"; // ログインユーザーのプラン(ブックマーク・チャットの可否判定に使用。ページ読み込み時に1回だけ取得)
let myName = "";     // ログインユーザーの表示名(チャット送信に使用)
let myUserId = null; // ログインユーザーのID(getSessionで取得。毎回サーバーに問い合わせない)

// ログイン中のユーザーIDを返す。
// auth.getUser() は毎回 Supabase の認証サーバーへ通信するが、getSession() は端末内で完結する。
// (データの書き込み・読み取りの可否は、どちらの場合もサーバー側のRLSが判断する)
async function currentUserId() {
    if (myUserId) return myUserId;
    const { data: { session } } = await supabaseClient.auth.getSession();
    myUserId = session?.user?.id ?? null;
    return myUserId;
}

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
// Ctrl+Shift+H でヒントを表示（ヒントボタンと同じ処理）
document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === "KeyH" && !e.isComposing) {
        e.preventDefault();
        if (hintBtn && !hintBtn.disabled) showHint();
    }
});
// Ctrl+Shift+S でブックマーク登録/解除（Premium限定の判定は toggleBookmark 内）
document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === "KeyS" && !e.isComposing && !e.repeat) {
        e.preventDefault();
        toggleBookmark();
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
const showAnswerBtn = document.getElementById("showAnswer");

let revealedIndexes = [];
let usedHint = false;
let questions = [];
let currentQuestion = null;
let recentQuestions = [];
let categoryMap = {};
checkLogin();

async function checkLogin() {
    try {
        const {
            data: { session },
            error: sessionError
        } = await supabaseClient.auth.getSession();

        if (sessionError) {
            // セッション取得自体に失敗した場合も未ログイン扱いにしてloginへ
            console.error("セッション取得エラー:", sessionError);
            location.href = "login.html";
            return;
        }

        if (!session) {
            location.href = "login.html";
            return;
        }

        myUserId = session.user.id;
        const isVerified = await setApiUrlByGrade(session.user.id);

        if (!isVerified) {
            showNotVerifiedNotice();
            return;
        }

        // 学年が確定してから初めて問題を読み込む
        chatReady = true;
        loadQuestions();
        loadBookmarks();
        loadChat();
    } catch (e) {
        // supabaseClientが未定義(CDN読み込み失敗等)を含め、
        // 何らかの例外で処理が止まった場合でも画面を固まらせず
        // login.htmlへ逃がす
        console.error("checkLoginで予期しないエラー:", e);
        location.href = "login.html";
    }
}

// 未認証（verify=trueでない）ユーザーには問題を読み込ませない。
// 著作権上、教科書由来の問題データは管理者が確認したユーザーにのみ表示する。
function showNotVerifiedNotice() {
    question.textContent =
        "このアカウントはまだ利用が許可されていません。管理者の承認をお待ちください。";
    category.textContent = "";
    lockAfterAnswerShown();
    if (categorySelect) categorySelect.innerHTML = '<option value="all">すべて</option>';

    // メッセージを少し見せたあと、サインアウトしてログインページへ戻す
    setTimeout(async () => {
        try {
            await supabaseClient.auth.signOut();
        } catch (e) {
            console.error("サインアウトエラー:", e);
        }
        location.href = "login.html";
    }, 3000);
}

async function setApiUrlByGrade(userId) {
    const { data: profile, error } =
        await supabaseClient
            .from("users")
            .select("grade, verify, plan, name")
            .eq("id", userId)
            .single();

    myPlan = profile?.plan || "free";
    myName = profile?.name || "";

    if (error || !profile || !profile.grade) {
        console.error("学年情報の取得に失敗しました", error);
        QUESTION_TABLE = QUESTION_TABLES["中3"]; // フォールバック(必要に応じて変更)
        myGrade = "中3";
        return profile?.verify === true;
    }

    const grade = String(profile.grade).trim();
    QUESTION_TABLE = QUESTION_TABLES[grade] || QUESTION_TABLES["中3"];
    myGrade = QUESTION_TABLES[grade] ? grade : "中3";

    return profile.verify === true;
}
async function loadQuestions() {

    try {
        questions = await fetchAllQuestions(QUESTION_TABLE);
    } catch (err) {
        console.error("問題の取得に失敗しました:", err);
        questions = [];
    }

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

    // 答え表示で押せなくしていたボタン類を、次の問題に進むタイミングで解除する
    unlockAfterAnswerShown();

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
// 判定・加点・Premiumの集計は、サーバー側の関数 submit_answer(sql/01_submit_answer.sql)で
// 1回の通信にまとめて行う。端末が計算した点数をそのまま書き込むことはしない。
let submitting = false;

async function submitAnswer() {

    if (!currentQuestion || submitting) return;

    // 通信中に次の問題へ切り替わっても、回答した問題・ヒント使用の有無がずれないよう先に控える
    const answeredQuestion = currentQuestion;
    const hintUsed = usedHint;
    const userAnswer = answer.value;

    submitting = true;

    try {
        const { data, error } =
            await supabaseClient.rpc("submit_answer", {
                p_question_id: String(answeredQuestion.id),
                p_answer: userAnswer,
                p_used_hint: hintUsed
            });

        if (error || !data) {
            console.error(error);
            result.textContent = "通信に失敗しました。もう一度お試しください";
            return;
        }

        if (data.correct) {

            result.textContent =
                `⭕ 正解！\n現在${data.total_correct}問正解`;

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

    } finally {
        submitting = false;
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
    const userId = await currentUserId();
    if (!userId) return;

    const { data, error } = await supabaseClient
        .from("user_bookmarks")
        .select("question_id")
        .eq("user_id", userId);

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

    const userId = await currentUserId();
    if (!userId) return;

    // プラン確認（Premium限定。プランはページ読み込み時に取得済みのものを使う）
    if (myPlan !== "premium") {
        alert("ブックマークはPremiumプラン限定機能です");
        return;
    }

    const qid = String(currentQuestion.id);
    const isBookmarked = bookmarkedIds.has(qid);

    if (isBookmarked) {
        const { error } = await supabaseClient
            .from("user_bookmarks")
            .delete()
            .eq("user_id", userId)
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
                user_id: userId,
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
// ==========================
// クラストーク(チャット)
// 最初に最新30件を1回だけ取得し、あとは投稿のたびに届く内容をそのまま画面に追加する。
// (以前は投稿があるたびに全員が30件を取り直していた → 20人いれば1投稿でAPI 20回)
// ==========================
const CHAT_MAX_MESSAGES = 30;
let chatIds = []; // 画面に出しているメッセージのID(重複表示の防止)
let chatReady = false; // ログイン・承認チェックを通るまでは、届いた投稿を画面に出さない

function chatKey(msg) {
    return msg.id != null ? String(msg.id) : `${msg.user_id}|${msg.created_at}|${msg.message}`;
}

// 1件を画面の末尾に追加する。textContentで入れるので、メッセージ内のHTMLは実行されない
async function appendChatMessage(msg) {
    const key = chatKey(msg);
    if (chatIds.includes(key)) return;
    chatIds.push(key);

    const userId = await currentUserId();
    const messages = document.getElementById("messages");
    const nearBottom =
        messages.scrollHeight - messages.scrollTop - messages.clientHeight < 80;
    const mine = msg.user_id === userId;

    const wrap = document.createElement("div");
    wrap.className = `message ${mine ? "mine" : "other"}`;

    const nameEl = document.createElement("div");
    nameEl.className = "name";
    nameEl.textContent = msg.user_name;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = msg.message;

    wrap.appendChild(nameEl);
    wrap.appendChild(bubble);
    messages.appendChild(wrap);

    // 古いものから消して件数を保つ
    while (messages.children.length > CHAT_MAX_MESSAGES) {
        messages.removeChild(messages.firstChild);
        chatIds.shift();
    }

    if (mine || nearBottom) messages.scrollTop = messages.scrollHeight;
}

async function loadChat() {
    // 最新30件を取る(新しい順に取ってから、古い順に並べ直す)
    const { data, error } = await supabaseClient
        .from("chat_messages")
        .select("*")
        .eq("grade", myGrade)
        .order("created_at", { ascending: false })
        .limit(CHAT_MAX_MESSAGES);

    if (error || !data) {
        console.error(error);
        return;
    }

    document.getElementById("messages").innerHTML = "";
    chatIds = [];

    for (const msg of data.reverse()) {
        await appendChatMessage(msg);
    }

    const messages = document.getElementById("messages");
    messages.scrollTop = messages.scrollHeight;
}

async function sendChat() {

    const input =
        document.getElementById("chatInput");

    const message = input.value.trim();

    if (!message) return;

    // ★ここで即座に入力欄をクリア＆送信ボタンを無効化
    input.value = "";
    const sendBtn = document.getElementById("sendChat");
    if (sendBtn) sendBtn.disabled = true;

    try {
        const userId = await currentUserId();
        if (!userId) return;

        // プラン・名前はページ読み込み時に取得済み
        if (myPlan !== "premium") {
            alert("Premiumプラン限定機能です");
            return;
        }

        // 送ったメッセージをそのまま返してもらい、画面に追加する(取り直しはしない)
        const { data: inserted, error } = await supabaseClient
            .from("chat_messages")
            .insert({
                user_id: userId,
                user_name: myName,
                message: message,
                grade: myGrade
            })
            .select()
            .single();

        if (error) {
            console.error(error);
            input.value = message; // 送れなかった文章を戻す
            alert("送信に失敗しました。もう一度お試しください");
            return;
        }

        appendChatMessage(inserted);

        // @AIメンションでAIが応答(AIはどの学年のチャットにも参加可能)
        if (message.includes("@AI")) {
            const question = message.replace(/@AI/gi, "").trim();
            askAI(question || "こんにちは", myGrade);
        }
    } finally {
        // ★処理が終わったら（成功でも失敗でも）ボタンを再び押せるようにする
        if (sendBtn) sendBtn.disabled = false;
    }

}
// ==========================
// AIチャット機能
// ==========================
// ⚠️ GroqのAPIキーはここには置かない。
//    Supabase Edge Function「groq-chat」側のシークレットとして保持している。
const AI_BOT_USER_ID = "d23c8281-7c28-4440-a335-a8c0d20c9442";
const AI_BOT_NAME = "ちゃっとAI";

async function askAI(promptText, grade) {
    try {
        // ⚠️ Supabase側の表示名は「groq-chat」だが、実際のURL(slug)は
        //    作成時のまま "dynamic-processor" になっているため、こちらを指定する。
        const { data, error } = await supabaseClient.functions.invoke("dynamic-processor", {
            body: { promptText }
        });

        if (error) throw error;

        const aiText = data?.aiText || "うまく答えられませんでした…";

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
.getElementById("showAnswer")
.addEventListener("click", showAnswer);

// 答えをすべて表示する。表示後は「次の問題」以外を押せなくする
// （答えを見た状態で回答して正解扱いになる、を防ぐため）
function showAnswer() {
    if (!currentQuestion) return;

    result.textContent = `📖 答え：${currentQuestion.answer}`;
    lockAfterAnswerShown();
}

function lockAfterAnswerShown() {
    submitBtn.disabled = true;
    hintBtn.disabled = true;
    answer.disabled = true;
    showAnswerBtn.disabled = true;
    categorySelect.disabled = true;
    document.getElementById("home").disabled = true;
}

function unlockAfterAnswerShown() {
    submitBtn.disabled = false;
    hintBtn.disabled = false;
    answer.disabled = false;
    showAnswerBtn.disabled = false;
    categorySelect.disabled = false;
    document.getElementById("home").disabled = false;
}


submitBtn?.addEventListener("click", submitAnswer);
hintBtn?.addEventListener("click", showHint);
nextBtn?.addEventListener("click", nextQuiz);

// ボタンをクリックしたときに、回答欄(input)からカーソル(フォーカス)が
// 外れてしまわないようにする。
// ボタンは通常クリックすると自動的にフォーカスを奪うが、
// mousedown時点でpreventDefaultしておくと、クリック自体は今まで通り効いたまま
// フォーカス移動だけを止められる。
[submitBtn, hintBtn, nextBtn, showAnswerBtn].forEach(btn => {
    btn?.addEventListener("mousedown", (e) => e.preventDefault());
});

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

        // 自分の学年のチャットへの投稿のときだけ、届いた内容をそのまま追加する(再取得しない)
        if (chatReady && payload.new?.grade === myGrade) {
            appendChatMessage(payload.new);
        }

    }

)

.subscribe();
