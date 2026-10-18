// ==========================
// 問題データの取得(キャッシュ付き)
// app.js が使う。supabase.js の後、各ページのJSの前に読み込むこと。
//
// ページを開くたびに全問題(答え込み)を取り直すとAPI呼び出し・通信量(Egress)が増えるため、
// sessionStorage にしばらく保存して使い回す。
//   - sessionStorage なので、タブを閉じれば消える(ログアウト後に残りにくい)
//   - 同じタブ内で 通常クイズ ⇔ イベント と移動しても再取得しない
//   - 保存に失敗(容量不足・プライベートモード等)しても、キャッシュなしで普通に動く
// ==========================

// 学年ごとの問題テーブル名(Supabase)
const QUESTION_TABLES = {
    "中3": "questions_chu3",
    "高3": "questions"
};

const QUESTION_CACHE_PREFIX = "qm_questions_v1:";
const QUESTION_CACHE_TTL_MS = 60 * 60 * 1000; // 1時間。問題を更新したらこの時間内は古いまま

const _questionFetchInFlight = {}; // 同時に同じテーブルを2回取りに行かないため

function readQuestionCache(tableName) {
    try {
        const raw = sessionStorage.getItem(QUESTION_CACHE_PREFIX + tableName);
        if (!raw) return null;
        const cached = JSON.parse(raw);
        if (!cached || !Array.isArray(cached.rows)) return null;
        if (Date.now() - cached.savedAt > QUESTION_CACHE_TTL_MS) return null;
        return cached.rows;
    } catch (e) {
        return null;
    }
}

function writeQuestionCache(tableName, rows) {
    try {
        sessionStorage.setItem(
            QUESTION_CACHE_PREFIX + tableName,
            JSON.stringify({ savedAt: Date.now(), rows })
        );
    } catch (e) {
        // 容量オーバー等。キャッシュなしで続行
    }
}

// 手動で破棄したいとき用(問題を更新した直後の確認など)
function clearQuestionCache() {
    try {
        Object.keys(sessionStorage)
            .filter(k => k.startsWith(QUESTION_CACHE_PREFIX))
            .forEach(k => sessionStorage.removeItem(k));
    } catch (e) { /* 何もしない */ }
}

// Supabaseの問題テーブルから全件取得する(1回の上限1000行なのでページ分けする)
async function fetchAllQuestionsFromServer(tableName) {
    const all = [];
    const pageSize = 1000;

    for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabaseClient
            .from(tableName)
            .select("*")
            .order("id", { ascending: true })
            .range(from, from + pageSize - 1);

        if (error) throw error;

        all.push(...data);
        if (data.length < pageSize) break;
    }

    return all;
}

async function fetchAllQuestions(tableName) {
    const cached = readQuestionCache(tableName);
    if (cached) return cached;

    if (!_questionFetchInFlight[tableName]) {
        _questionFetchInFlight[tableName] = fetchAllQuestionsFromServer(tableName)
            .then(rows => {
                writeQuestionCache(tableName, rows);
                return rows;
            })
            .finally(() => {
                delete _questionFetchInFlight[tableName];
            });
    }
    return _questionFetchInFlight[tableName];
}
