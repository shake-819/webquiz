// ==========================
// イベント: サイコロの旅
// ・クイズ10問ごとにサイコロ1個（既存の成績データから計算するだけ／書き込みなし）
// ・マス目の仕掛けは dice_progress.position だけを動かす（成績データには一切触れない）
// ・遠くまで進んだ人TOP3を表示
//
// このファイルと event-dice.html を削除すれば、イベントは完全に消えます。
// （他の既存ファイルには一切依存・書き込みをしていません）
// ==========================

const QUESTIONS_PER_DICE = 10;

// ----- マス目の仕掛け -----
// 位置(position)に応じて決定的に効果を出す（DB保存不要・全員共通のマップ）。
// 「成績データ」には一切触れず、position の増減だけで完結させる。
function getSquareEffect(pos) {
    if (pos <= 0) return null;
    if (pos % 25 === 0) return { amount: 5,  label: "🌟 大当たり！ +5マス進む" };
    if (pos % 13 === 0) return { amount: 3,  label: "🎉 ボーナスマス！ +3マス進む" };
    if (pos % 17 === 0) return { amount: -2, label: "😵 落とし穴… -2マス戻る" };
    if (pos % 9  === 0) return { amount: -1, label: "🐌 足止め… -1マス戻る" };
    return null;
}

// ----- 状態 -----
let myId = null;
let totalAnswered = 0;   // users.correct + users.wrong（読み取りのみ）
let diceProgress = { position: 0, dice_used: 0 };
let isRolling = false;

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

    await loadAnsweredCount();
    await loadOrCreateDiceProgress();
    renderAll();
    await loadLeaderboard();

    document.getElementById("rollBtn").addEventListener("click", rollDice);
}

// 総回答数は既存の users テーブルから読むだけ（書き込みは一切しない）
async function loadAnsweredCount() {
    const { data, error } = await supabaseClient
        .from("users")
        .select("correct,wrong")
        .eq("id", myId)
        .single();

    if (error || !data) {
        console.error(error);
        return;
    }
    totalAnswered = (data.correct ?? 0) + (data.wrong ?? 0);
}

async function loadOrCreateDiceProgress() {
    const { data, error } = await supabaseClient
        .from("dice_progress")
        .select("position,dice_used")
        .eq("user_id", myId)
        .maybeSingle();

    if (error) {
        console.error(error);
        return;
    }

    if (data) {
        diceProgress = data;
    } else {
        // 初回アクセス時に行を作成
        const { error: insertError } = await supabaseClient
            .from("dice_progress")
            .insert({ user_id: myId, position: 0, dice_used: 0 });
        if (insertError) console.error(insertError);
        diceProgress = { position: 0, dice_used: 0 };
    }
}

function getDiceAvailable() {
    const earned = Math.floor(totalAnswered / QUESTIONS_PER_DICE);
    return Math.max(0, earned - diceProgress.dice_used);
}

function renderAll() {
    const available = getDiceAvailable();
    const remainder = totalAnswered % QUESTIONS_PER_DICE;
    const untilNext = QUESTIONS_PER_DICE - remainder;

    document.getElementById("diceCount").textContent = available;
    document.getElementById("untilNext").textContent =
        available > 0 ? "サイコロを振ってみよう！" : `あと${untilNext}問で次のサイコロ`;
    document.getElementById("positionText").textContent = diceProgress.position;

    document.getElementById("rollBtn").disabled = available <= 0 || isRolling;

    renderBoard();
}

function renderBoard() {
    const board = document.getElementById("board");
    board.innerHTML = "";

    const start = Math.max(0, diceProgress.position - 2);
    const end = diceProgress.position + 8;

    for (let i = start; i <= end; i++) {
        const sq = document.createElement("div");
        sq.className = "sq";
        if (i === diceProgress.position) sq.classList.add("is-current");

        const effect = getSquareEffect(i);
        let icon = "";
        if (effect) icon = effect.amount > 0 ? "🎁" : "⚠️";

        sq.innerHTML = `
            <span class="sq-num">${i}</span>
            ${icon ? `<span class="sq-icon">${icon}</span>` : ""}
            ${i === diceProgress.position ? `<span class="sq-token">🚩</span>` : ""}
        `;
        board.appendChild(sq);
    }

    // 現在地が見えるよう横スクロールを右寄せ
    requestAnimationFrame(() => {
        board.scrollLeft = board.scrollWidth;
    });
}

async function rollDice() {
    if (isRolling || getDiceAvailable() <= 0) return;
    isRolling = true;
    renderAll();

    const dieFace = document.getElementById("dieFace");
    const logEl = document.getElementById("rollLog");
    logEl.textContent = "";

    // ダイス回転演出
    let ticks = 0;
    const spin = setInterval(() => {
        dieFace.textContent = "⚀⚁⚂⚃⚄⚅"[Math.floor(Math.random() * 6)];
        ticks++;
    }, 70);

    await new Promise(res => setTimeout(res, 700));
    clearInterval(spin);

    const roll = 1 + Math.floor(Math.random() * 6);
    const diceFaces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    dieFace.textContent = diceFaces[roll - 1];

    let newPos = diceProgress.position + roll;
    let messages = [`🎲 ${roll}の目が出て ${roll}マス進んだ！`];

    const effect = getSquareEffect(newPos);
    if (effect) {
        newPos = Math.max(0, newPos + effect.amount);
        messages.push(effect.label);
    }

    diceProgress.position = newPos;
    diceProgress.dice_used += 1;

    const { error } = await supabaseClient
        .from("dice_progress")
        .update({
            position: diceProgress.position,
            dice_used: diceProgress.dice_used,
            updated_at: new Date().toISOString()
        })
        .eq("user_id", myId);

    if (error) {
        console.error(error);
        messages.push("⚠️ 記録の保存に失敗しました。もう一度お試しください。");
    }

    logEl.innerHTML = messages.map(m => `<p>${m}</p>`).join("");

    isRolling = false;
    renderAll();
    loadLeaderboard();
}

async function loadLeaderboard() {
    const { data: top, error } = await supabaseClient
        .from("dice_progress")
        .select("user_id,position")
        .order("position", { ascending: false })
        .limit(3);

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
        list.innerHTML = `<li class="empty">まだ誰も出発していません</li>`;
        return;
    }

    top.forEach((t, i) => {
        list.innerHTML += `
            <li>
                <span>${medals[i] || `${i + 1}位`} ${names[t.user_id] || "名前未設定"}</span>
                <span>${t.position}マス</span>
            </li>
        `;
    });
}
