// ==========================
// 実績の壁（Achievement Wall）
// ・プロフィール画面の統計欄の下に、横スライドできる実績カードを表示する
// ・ミッションはここに定義するだけで増やせる（DB変更不要）
// ・一度達成したミッションは user_achievements テーブルに永続保存され、
//   後で連続記録などが途切れても「達成済み」のまま残る
//   （事前に Supabase で migration_user_achievements.sql を実行しておくこと）
// ==========================

// タイムアタックの限定アバター解放スコアと合わせる（event-timeattack.js参照）
const TA_UNLOCK_SCORE = 15;

// ----- レベル計算 -----
// 必要な累計正解数は「5 × (レベル-1)^2」問。上のレベルほど必要数が増える。
// 例: Lv1→2 は 5問、Lv4→5 は 35問、Lv9→10 は 85問。
function correctRequiredForLevel(level) {
    return 5 * Math.pow(level - 1, 2);
}

function calcLevel(totalCorrect) {
    return Math.floor(Math.sqrt(totalCorrect / 5)) + 1;
}

// 現在レベルの進捗（次のレベルまでの割合など）を返す
function calcLevelProgress(totalCorrect) {
    const level = calcLevel(totalCorrect);
    const base = correctRequiredForLevel(level);
    const next = correctRequiredForLevel(level + 1);
    const span = next - base;
    const into = totalCorrect - base;
    return {
        level,
        into,
        span,
        remaining: Math.max(0, next - totalCorrect),
        percent: span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 100
    };
}

// ==========================
// ミッション定義
// ・新しいミッションを増やしたいときは、この配列に1個追加するだけでOK。
// ・check(ctx) が true を返したら達成。ctx に使えるフィールドは下記 buildContext() 参照。
// ・stars は 1〜3 の目安（1=簡単 / 2=普通 / 3=難関）。特に制限はないので自由に調整可。
// ==========================
const MISSIONS = [
    { id: "answer_1",    title: "はじめの一歩",     desc: "総回答数 1問",                          icon: "🔰", stars: 1, check: ctx => ctx.totalAnswered >= 1 },
    { id: "answer_50",   title: "クイズ入門",       desc: "総回答数 50問",                         icon: "📘", stars: 1, check: ctx => ctx.totalAnswered >= 50 },
    { id: "answer_200",  title: "クイズ愛好家",     desc: "総回答数 200問",                        icon: "📚", stars: 2, check: ctx => ctx.totalAnswered >= 200 },
    { id: "answer_500",  title: "クイズマスター",   desc: "総回答数 500問",                        icon: "🎓", stars: 3, check: ctx => ctx.totalAnswered >= 500 },
    { id: "answer_1000", title: "千本ノック",       desc: "総回答数 1000問",                       icon: "🏆", stars: 3, check: ctx => ctx.totalAnswered >= 1000 },

    { id: "rate_80",     title: "正確無比",         desc: "正答率80%以上（50問以上回答）",         icon: "🎯", stars: 2, check: ctx => ctx.totalAnswered >= 50 && ctx.rate >= 80 },
    { id: "rate_90",     title: "完璧主義者",       desc: "正答率90%以上（100問以上回答）",        icon: "💯", stars: 3, check: ctx => ctx.totalAnswered >= 100 && ctx.rate >= 90 },

    { id: "streak_3",    title: "3日坊主卒業",     desc: "3日連続プレイ",                         icon: "🔥", stars: 1, check: ctx => ctx.streak >= 3 },
    { id: "streak_7",    title: "一週間戦士",       desc: "7日連続プレイ",                         icon: "🔥", stars: 2, check: ctx => ctx.streak >= 7 },
    { id: "streak_30",   title: "継続は力なり",     desc: "30日連続プレイ",                        icon: "🔥", stars: 3, check: ctx => ctx.streak >= 30 },

    { id: "level_5",     title: "レベル5到達",     desc: "レベル5に到達",                         icon: "⭐", stars: 1, check: ctx => ctx.level >= 5 },
    { id: "level_10",    title: "レベル10到達",    desc: "レベル10に到達",                        icon: "🌟", stars: 2, check: ctx => ctx.level >= 10 },
    { id: "level_20",    title: "レベル20到達",    desc: "レベル20に到達",                        icon: "💫", stars: 3, check: ctx => ctx.level >= 20 },

    { id: "ta_played",   title: "タイムアタック挑戦者", desc: "タイムアタックに1回挑戦",           icon: "⏱️", stars: 1, check: ctx => ctx.taPlayed },
    { id: "ta_unlock",   title: "快速回答",         desc: `タイムアタックで${TA_UNLOCK_SCORE}問正解`, icon: "⚡", stars: 2, check: ctx => ctx.taBest >= TA_UNLOCK_SCORE },

    { id: "dice_30",     title: "すごろく旅人",     desc: "サイコロの旅で30マス到達",              icon: "🎲", stars: 2, check: ctx => ctx.dicePos >= 30 },
];

// ==========================
// データ収集
// ==========================

function toDateStr(d) {
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// user_daily_stats（既存テーブル）から連続プレイ日数を計算する。
// 最新のプレイ日が「今日」か「昨日」でない場合は、記録が途切れているとみなし0を返す。
async function calcPlayStreak(userId) {
    const { data, error } = await supabaseClient
        .from("user_daily_stats")
        .select("date")
        .eq("user_id", userId);

    if (error || !data || data.length === 0) return 0;

    const dates = [...new Set(data.map(d => d.date))].sort().reverse();

    const todayStr = toDateStr(new Date());
    const yesterdayStr = toDateStr(new Date(Date.now() - 86400000));
    if (dates[0] !== todayStr && dates[0] !== yesterdayStr) return 0;

    let streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
        const diffDays = Math.round(
            (new Date(dates[i]) - new Date(dates[i + 1])) / 86400000
        );
        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

// ミッション判定に必要なデータをまとめて取得する
async function buildContext(userId, correct, wrong) {
    const totalAnswered = correct + wrong;
    const rate = totalAnswered === 0 ? 0 : Math.round((correct / totalAnswered) * 100);
    const level = calcLevel(correct);

    const [{ data: taRow }, { data: diceRow }, streak] = await Promise.all([
        supabaseClient.from("timeattack_scores").select("best_score").eq("user_id", userId).maybeSingle(),
        supabaseClient.from("dice_progress").select("position").eq("user_id", userId).maybeSingle(),
        calcPlayStreak(userId)
    ]);

    return {
        totalAnswered,
        correct,
        wrong,
        rate,
        level,
        streak,
        taPlayed: !!taRow,
        taBest: taRow?.best_score ?? 0,
        dicePos: diceRow?.position ?? 0
    };
}

// ==========================
// 描画・永続化
// ==========================

// containerEl: カードを並べる要素 / starsEl: 「★12 / 32」を表示する要素
// levelEl: レベルバッジを表示する要素（任意）
async function renderAchievementWall(containerEl, starsEl, levelEl, { userId, isOwnProfile, correct, wrong }) {
    containerEl.innerHTML = `<p class="wall-loading">読み込み中...</p>`;

    const ctx = await buildContext(userId, correct, wrong);

    if (levelEl) {
        levelEl.textContent = `Lv.${ctx.level}`;
    }

    // 既に永続記録されている達成済みミッションを取得
    const { data: unlockedRows } = await supabaseClient
        .from("user_achievements")
        .select("mission_id")
        .eq("user_id", userId);

    const unlockedSet = new Set((unlockedRows || []).map(r => r.mission_id));

    // 自分のプロフィールを見ているときだけ、新規達成をチェックしてDBに記録する
    if (isOwnProfile) {
        const newlyUnlocked = MISSIONS.filter(
            m => !unlockedSet.has(m.id) && m.check(ctx)
        );

        if (newlyUnlocked.length > 0) {
            const rows = newlyUnlocked.map(m => ({ user_id: userId, mission_id: m.id }));
            const { error } = await supabaseClient.from("user_achievements").insert(rows);
            if (!error) {
                newlyUnlocked.forEach(m => unlockedSet.add(m.id));
            } else {
                console.error(error);
            }
        }
    }

    // ----- 星の合計を表示 -----
    const totalStars = MISSIONS.reduce((sum, m) => sum + m.stars, 0);
    const earnedStars = MISSIONS
        .filter(m => unlockedSet.has(m.id))
        .reduce((sum, m) => sum + m.stars, 0);

    if (starsEl) {
        starsEl.textContent = `★ ${earnedStars} / ${totalStars}`;
    }

    // ----- カードを描画（達成済みを先頭に） -----
    const sorted = [...MISSIONS].sort((a, b) => {
        const au = unlockedSet.has(a.id) ? 0 : 1;
        const bu = unlockedSet.has(b.id) ? 0 : 1;
        return au - bu;
    });

    containerEl.innerHTML = sorted.map(m => {
        const unlocked = unlockedSet.has(m.id);
        return `
            <div class="achievement-card ${unlocked ? "is-unlocked" : "is-locked"}">
                <div class="ach-icon">${unlocked ? m.icon : "🔒"}</div>
                <div class="ach-title">${m.title}</div>
                <div class="ach-desc">${m.desc}</div>
                <div class="ach-stars">${"★".repeat(m.stars)}${"☆".repeat(3 - m.stars)}</div>
            </div>
        `;
    }).join("");
}
