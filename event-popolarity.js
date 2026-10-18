// ==========================
// イベント: 人気投票
// ・クイズ5問解答ごとにバラ1本（残数の計算・検証はすべてサーバー側のRPCで行う）
// ・全ユーザーを一覧表示し、好きなユーザーにバラを贈る（数量選択可／自分には贈れない）
// ・「もらったバラ」「贈ったバラ」の2つのランキングを表示
//
// 使うRPC（migration_popularity_vote.sql で作成）:
//   rose_status() / give_rose(p_to, p_amount) / rose_users() / rose_rankings()
//
// このファイルと event-popularity.html を削除すれば、イベントは完全に消えます。
// ==========================

const QUESTIONS_PER_ROSE = 5;

let myId = null;
let status = { answered: 0, earned: 0, given: 0, received: 0, available: 0 };
let allUsers = [];
let selectedUser = null;
let isSending = false;

init();

async function init() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        location.href = "login.html";
        return;
    }
    myId = session.user.id;

    bindEvents();
    await Promise.all([loadStatus(), loadUsers(), loadRankings()]);
}

// ユーザー名はそのままHTMLに入れない（<script>等を入れられても動かないようにする）
function esc(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function showToast(message, isError) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.className = "toast " + (isError ? "is-err" : "is-ok");
}

// ----- 自分のバラの状況 -----
async function loadStatus() {
    const { data, error } = await supabaseClient.rpc("rose_status");
    if (error || !data) {
        console.error(error);
        showToast("バラの状況を読み込めませんでした。時間をおいて再読み込みしてください。", true);
        return;
    }
    status = data;
    renderStatus();
}

function renderStatus() {
    document.getElementById("availableCount").textContent = status.available;
    document.getElementById("receivedCount").textContent = status.received;
    document.getElementById("givenCount").textContent = status.given;

    const untilNext = QUESTIONS_PER_ROSE - (status.answered % QUESTIONS_PER_ROSE);
    document.getElementById("untilNext").textContent =
        status.available > 0
            ? "バラを贈ってみよう！"
            : `あと${untilNext}問でバラが1本もらえます`;
}

// ----- ユーザー一覧 -----
async function loadUsers() {
    const { data, error } = await supabaseClient.rpc("rose_users");
    if (error || !data) {
        console.error(error);
        document.getElementById("userList").innerHTML =
            `<li class="empty">ユーザー一覧を読み込めませんでした</li>`;
        return;
    }
    allUsers = data;
    renderUsers();
}

function renderUsers() {
    const keyword = document.getElementById("userSearch").value.trim().toLowerCase();
    const list = document.getElementById("userList");

    const rows = allUsers.filter(u =>
        !keyword || (u.name || "").toLowerCase().includes(keyword)
    );

    if (rows.length === 0) {
        list.innerHTML = `<li class="empty">該当するユーザーがいません</li>`;
        return;
    }

    list.innerHTML = rows.map(u => {
        const isMe = u.id === myId;
        return `
            <li>
                <button class="user-row" type="button" data-id="${esc(u.id)}" ${isMe ? "disabled" : ""}>
                    <span class="name">${esc(u.name || "名前未設定")}${isMe ? `<span class="me-tag">あなた</span>` : ""}</span>
                    <span class="got">🌹 ${u.received}本</span>
                </button>
            </li>
        `;
    }).join("");
}

// ----- ランキング -----
async function loadRankings() {
    const { data, error } = await supabaseClient.rpc("rose_rankings");
    if (error || !data) {
        console.error(error);
        return;
    }
    renderRanking("receivedRanking", data.received || []);
    renderRanking("givenRanking", data.given || []);
}

function renderRanking(elId, rows) {
    const el = document.getElementById(elId);

    if (rows.length === 0) {
        el.innerHTML = `<li class="empty">まだ誰もいません</li>`;
        return;
    }

    const medals = ["🥇", "🥈", "🥉"];
    el.innerHTML = rows.map((r, i) => `
        <li class="${r.id === myId ? "is-me" : ""}">
            <a href="profile.html?user=${encodeURIComponent(r.id)}">${medals[i] || `${i + 1}位`} ${esc(r.name || "名前未設定")}</a>
            <span class="total">${r.total}本</span>
        </li>
    `).join("");
}

// ----- バラを渡すパネル -----
function bindEvents() {
    document.getElementById("userSearch").addEventListener("input", renderUsers);

    document.getElementById("userList").addEventListener("click", (e) => {
        const btn = e.target.closest(".user-row");
        if (!btn || btn.disabled) return;
        openGivePanel(btn.dataset.id);
    });

    const amountEl = document.getElementById("giveAmount");
    document.getElementById("minusBtn").addEventListener("click", () => setAmount(readAmount() - 1));
    document.getElementById("plusBtn").addEventListener("click", () => setAmount(readAmount() + 1));
    amountEl.addEventListener("input", () => setAmount(readAmount(), true));
    amountEl.addEventListener("blur", () => setAmount(readAmount()));

    document.getElementById("cancelBtn").addEventListener("click", closeGivePanel);
    document.getElementById("giveOverlay").addEventListener("click", (e) => {
        if (e.target.id === "giveOverlay") closeGivePanel();
    });
    document.getElementById("giveBtn").addEventListener("click", giveRose);
}

function readAmount() {
    const n = parseInt(document.getElementById("giveAmount").value, 10);
    return Number.isNaN(n) ? 1 : n;
}

// 1〜使えるバラの本数 の範囲に収める（入力途中の空欄は触らない）
function setAmount(n, typing) {
    const max = Math.max(1, status.available);
    const clamped = Math.min(max, Math.max(1, n));
    const amountEl = document.getElementById("giveAmount");
    if (!(typing && amountEl.value === "")) amountEl.value = clamped;

    document.getElementById("minusBtn").disabled = clamped <= 1;
    document.getElementById("plusBtn").disabled = clamped >= max;
}

function openGivePanel(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user || user.id === myId) return;

    if (status.available <= 0) {
        const untilNext = QUESTIONS_PER_ROSE - (status.answered % QUESTIONS_PER_ROSE);
        showToast(`使えるバラがありません。あと${untilNext}問解くと1本もらえます。`, true);
        return;
    }

    selectedUser = user;
    document.getElementById("giveToName").textContent = user.name || "名前未設定";
    document.getElementById("giveMax").textContent = status.available;
    document.getElementById("giveAmount").value = 1;
    document.getElementById("giveBtn").disabled = false;
    setAmount(1);
    document.getElementById("giveOverlay").hidden = false;
}

function closeGivePanel() {
    if (isSending) return;
    document.getElementById("giveOverlay").hidden = true;
    selectedUser = null;
}

const ERROR_MESSAGES = {
    "not enough roses": "バラが足りません。",
    "cannot give a rose to yourself": "自分にはバラを贈れません。",
    "user not found": "そのユーザーが見つかりませんでした。",
    "invalid amount": "本数が正しくありません。"
};

async function giveRose() {
    if (isSending || !selectedUser) return;

    const amount = readAmount();
    if (amount < 1 || amount > status.available) {
        setAmount(amount);
        return;
    }

    isSending = true;
    const giveBtn = document.getElementById("giveBtn");
    giveBtn.disabled = true;

    const targetName = selectedUser.name || "名前未設定";
    const { data, error } = await supabaseClient.rpc("give_rose", {
        p_to: selectedUser.id,
        p_amount: amount
    });

    isSending = false;

    if (error) {
        console.error(error);
        const known = Object.keys(ERROR_MESSAGES).find(k => (error.message || "").includes(k));
        showToast(known ? ERROR_MESSAGES[known] : "バラを贈れませんでした。もう一度お試しください。", true);
        giveBtn.disabled = false;
        // 残数がずれている可能性があるので最新に合わせる
        await loadStatus();
        return;
    }

    status = data;
    renderStatus();
    document.getElementById("giveOverlay").hidden = true;
    selectedUser = null;
    showToast(`🌹 ${targetName} さんにバラを${amount}本贈りました！`, false);

    await Promise.all([loadUsers(), loadRankings()]);
}
