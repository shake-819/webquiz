
let myId = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) return; // 未ログイン時はtoppage.js側で既にlogin.htmlへ飛ぶ
    myId = session.user.id;

    bindContactModal();
    bindMailboxModal();
}

// ==========================
// お問い合わせ
// ==========================

function bindContactModal() {
    const overlay = document.getElementById("contactOverlay");
    const openBtn = document.getElementById("contactBtn");
    const closeBtn = document.getElementById("contactCloseBtn");
    const form = document.getElementById("contactForm");

    openBtn.addEventListener("click", () => {
        overlay.hidden = false;
        document.getElementById("contactMsg").textContent = "";
        loadContactHistory();
    });
    closeBtn.addEventListener("click", () => { overlay.hidden = true; });
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.hidden = true;
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await submitInquiry();
    });
}

async function submitInquiry() {
    const category = document.getElementById("contactCategory").value;
    const message = document.getElementById("contactMessage").value.trim();
    const msgEl = document.getElementById("contactMsg");
    const submitBtn = document.getElementById("contactSubmitBtn");

    if (!message) {
        msgEl.textContent = "内容を入力してください";
        msgEl.className = "form-msg err";
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "送信中...";

    const { error } = await supabaseClient
        .from("inquiries")
        .insert({ user_id: myId, category, message });

    submitBtn.disabled = false;
    submitBtn.textContent = "送信する";

    if (error) {
        console.error(error);
        msgEl.textContent = "送信に失敗しました。時間をおいてもう一度お試しください。";
        msgEl.className = "form-msg err";
        return;
    }

    msgEl.textContent = "送信しました。ありがとうございます！";
    msgEl.className = "form-msg ok";
    document.getElementById("contactMessage").value = "";
    loadContactHistory();
}

async function loadContactHistory() {
    const listEl = document.getElementById("contactHistory");

    const { data, error } = await supabaseClient
        .from("inquiries")
        .select("category,message,status,admin_reply,created_at")
        .eq("user_id", myId)
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) {
        console.error(error);
        listEl.innerHTML = `<li class="history-empty">読み込みに失敗しました</li>`;
        return;
    }

    if (!data || data.length === 0) {
        listEl.innerHTML = `<li class="history-empty">まだお問い合わせはありません</li>`;
        return;
    }

    listEl.innerHTML = data.map(item => `
        <li class="history-item">
            <div class="meta">
                <span>【${item.category}】${formatDate(item.created_at)}</span>
                <span class="status ${item.status === "replied" ? "replied" : "open"}">
                    ${item.status === "replied" ? "返信あり" : "未回答"}
                </span>
            </div>
            <div class="msg">${escapeHtml(item.message)}</div>
            ${item.admin_reply ? `<div class="reply">💬 ${escapeHtml(item.admin_reply)}</div>` : ""}
        </li>
    `).join("");
}

// ==========================
// メールボックス（総合通知センター）
// ==========================

function bindMailboxModal() {
    const overlay = document.getElementById("mailboxOverlay");
    const openBtn = document.getElementById("mailboxBtn");
    const closeBtn = document.getElementById("mailboxCloseBtn");

    openBtn.addEventListener("click", () => {
        overlay.hidden = false;
        loadAnnouncements();
        loadReplies();
        loadEventStatus();
    });
    closeBtn.addEventListener("click", () => { overlay.hidden = true; });
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.hidden = true;
    });

    document.querySelectorAll(".mail-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".mail-tab").forEach(t => t.classList.remove("is-active"));
            document.querySelectorAll(".mail-panel").forEach(p => p.classList.remove("is-active"));
            tab.classList.add("is-active");
            document.getElementById(tab.dataset.panel).classList.add("is-active");
        });
    });
}

async function loadAnnouncements() {
    const el = document.getElementById("announceList");

    const { data, error } = await supabaseClient
        .from("announcements")
        .select("title,body,created_at")
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) {
        console.error(error);
        el.innerHTML = `<p class="mail-empty">読み込みに失敗しました</p>`;
        return;
    }

    if (!data || data.length === 0) {
        el.innerHTML = `<p class="mail-empty">お知らせはまだありません</p>`;
        return;
    }

    el.innerHTML = data.map(a => `
        <div class="mail-item">
            <span class="icon">📣</span>
            <div class="body">
                <div class="title">${escapeHtml(a.title)}</div>
                <div class="text">${escapeHtml(a.body)}</div>
                <div class="date">${formatDate(a.created_at)}</div>
            </div>
        </div>
    `).join("");
}

async function loadReplies() {
    const el = document.getElementById("replyList");

    const { data, error } = await supabaseClient
        .from("inquiries")
        .select("category,message,admin_reply,replied_at")
        .eq("user_id", myId)
        .not("admin_reply", "is", null)
        .order("replied_at", { ascending: false })
        .limit(20);

    if (error) {
        console.error(error);
        el.innerHTML = `<p class="mail-empty">読み込みに失敗しました</p>`;
        return;
    }

    if (!data || data.length === 0) {
        el.innerHTML = `<p class="mail-empty">お問い合わせへの返信はまだありません</p>`;
        return;
    }

    el.innerHTML = data.map(r => `
        <div class="mail-item">
            <span class="icon">💬</span>
            <div class="body">
                <div class="title">【${r.category}】へのお問い合わせ</div>
                <div class="text">${escapeHtml(r.admin_reply)}</div>
                <div class="date">${formatDate(r.replied_at)}</div>
            </div>
        </div>
    `).join("");
}

// イベントの「通知」はDBに保存せず、開いた時点の最新状況をその場で集計して見せる
async function loadEventStatus() {
    const el = document.getElementById("eventList");
    el.innerHTML = `<p class="mail-empty">読み込み中...</p>`;

    const items = [];

    // タイムアタック：自己ベスト
    const { data: ta } = await supabaseClient
        .from("timeattack_scores")
        .select("best_score")
        .eq("user_id", myId)
        .maybeSingle();

    if (ta) {
        items.push({
            icon: "⏱️",
            title: "タイムアタッククイズ",
            text: `自己ベスト ${ta.best_score}問正解${ta.best_score >= 15 ? "（限定アバター解放済み🎁）" : ""}`
        });
    }

    // サイコロの旅：現在位置
    const { data: dice } = await supabaseClient
        .from("dice_progress")
        .select("position,dice_used")
        .eq("user_id", myId)
        .maybeSingle();

    if (dice) {
        items.push({
            icon: "🎲",
            title: "サイコロの旅",
            text: `現在 ${dice.position}マス目（サイコロ使用: ${dice.dice_used}回）`
        });
    }

    if (items.length === 0) {
        el.innerHTML = `<p class="mail-empty">まだイベントに参加していません</p>`;
        return;
    }

    el.innerHTML = items.map(i => `
        <div class="mail-item">
            <span class="icon">${i.icon}</span>
            <div class="body">
                <div class="title">${i.title}</div>
                <div class="text">${i.text}</div>
            </div>
        </div>
    `).join("");
}

// ==========================
// ユーティリティ
// ==========================

function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
