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
// ・お知らせ/返信/イベントを「一覧→タップで詳細」という
//   実際のメールアプリに近いUIで表示する。
// ・未読管理はDBに書き込まず、localStorageで端末ごとに保持する
//   （key: mailboxRead_<userId>、値: 既読にしたアイテムのkey配列）
// ==========================

// タブごとに直近取得したアイテムをここに保持しておく（詳細ビュー表示・既読反映に使う）
let mailItemsByKey = {};

function readStorageKey() {
    return `mailboxRead_${myId}`;
}

function getReadSet() {
    try {
        const raw = localStorage.getItem(readStorageKey());
        return new Set(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
}

function markAsRead(key) {
    const set = getReadSet();
    if (set.has(key)) return;
    set.add(key);
    localStorage.setItem(readStorageKey(), JSON.stringify([...set]));
}

function bindMailboxModal() {
    const overlay = document.getElementById("mailboxOverlay");
    const openBtn = document.getElementById("mailboxBtn");
    const closeBtn = document.getElementById("mailboxCloseBtn");

    openBtn.addEventListener("click", () => {
        overlay.hidden = false;
        closeMailDetail();
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

    document.getElementById("mailDetailBack").addEventListener("click", closeMailDetail);

    // 起動時にも未読バッジだけ静かに更新しておく
    refreshUnreadBadge();
}

// 一覧の1行分のHTMLを組み立てる
function renderMailRow(item) {
    const readSet = getReadSet();
    const unread = item.trackRead && !readSet.has(item.key);
    return `
        <button type="button" class="mail-row ${unread ? "is-unread" : ""}" data-key="${item.key}">
            <span class="mail-avatar is-${item.type}">${item.icon}</span>
            <span class="mail-row-main">
                <span class="mail-row-top">
                    <span class="mail-row-subject">${escapeHtml(item.title)}</span>
                    <span class="mail-row-date">${item.shortDate}</span>
                </span>
                <span class="mail-row-snippet">${escapeHtml(item.snippet)}</span>
            </span>
        </button>
    `;
}

// リスト描画＋行クリックで詳細ビューを開くイベントを設定する
function renderMailList(containerEl, items) {
    if (items.length === 0) {
        containerEl.innerHTML = `<p class="mail-empty">まだありません</p>`;
        return;
    }

    items.forEach(item => { mailItemsByKey[item.key] = item; });

    containerEl.innerHTML = items.map(renderMailRow).join("");

    containerEl.querySelectorAll(".mail-row").forEach(row => {
        row.addEventListener("click", () => openMailDetail(row.dataset.key));
    });
}

function openMailDetail(key) {
    const item = mailItemsByKey[key];
    if (!item) return;

    if (item.trackRead) {
        markAsRead(key);
        refreshUnreadBadge();
        // 一覧に戻った時に既読表示になるよう、対応する行の見た目も更新
        document.querySelectorAll(`.mail-row[data-key="${key}"]`).forEach(row => {
            row.classList.remove("is-unread");
        });
    }

    document.getElementById("mailDetailIcon").textContent = item.icon;
    document.getElementById("mailDetailIcon").className = `mail-avatar is-${item.type}`;
    document.getElementById("mailDetailTitle").textContent = item.title;
    document.getElementById("mailDetailDate").textContent = item.fullDate;
    document.getElementById("mailDetailBody").textContent = item.body;

    document.getElementById("mailListView").hidden = true;
    document.getElementById("mailDetail").hidden = false;
}

function closeMailDetail() {
    document.getElementById("mailDetail").hidden = true;
    document.getElementById("mailListView").hidden = false;
}

// 一覧用の短い日付（例: 8/14）と、詳細用のフル日付を両方作る
function shortDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

function makeSnippet(text) {
    const flat = String(text).replace(/\s+/g, " ").trim();
    return flat.length > 34 ? flat.slice(0, 34) + "…" : flat;
}

async function loadAnnouncements() {
    const el = document.getElementById("announceList");

    const { data, error } = await supabaseClient
        .from("announcements")
        .select("id,title,body,created_at")
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) {
        console.error(error);
        el.innerHTML = `<p class="mail-empty">読み込みに失敗しました</p>`;
        return;
    }

    const items = (data || []).map(a => ({
        key: `announce:${a.id}`,
        type: "announce",
        icon: "📣",
        title: a.title,
        snippet: makeSnippet(a.body),
        body: a.body,
        shortDate: shortDate(a.created_at),
        fullDate: formatDate(a.created_at),
        trackRead: true
    }));

    renderMailList(el, items);
}

async function loadReplies() {
    const el = document.getElementById("replyList");

    const { data, error } = await supabaseClient
        .from("inquiries")
        .select("id,category,message,admin_reply,replied_at")
        .eq("user_id", myId)
        .not("admin_reply", "is", null)
        .order("replied_at", { ascending: false })
        .limit(20);

    if (error) {
        console.error(error);
        el.innerHTML = `<p class="mail-empty">読み込みに失敗しました</p>`;
        return;
    }

    const items = (data || []).map(r => ({
        key: `reply:${r.id}`,
        type: "reply",
        icon: "💬",
        title: `【${r.category}】へのお問い合わせ`,
        snippet: makeSnippet(r.admin_reply),
        body: r.admin_reply,
        shortDate: shortDate(r.replied_at),
        fullDate: formatDate(r.replied_at),
        trackRead: true
    }));

    renderMailList(el, items);
}

// イベントの「通知」はDBに保存せず、開いた時点の最新状況をその場で集計して見せる
// （その場限りのスナップショットなので未読/既読の概念は持たせない）
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
            key: "event:timeattack",
            type: "event",
            icon: "⏱️",
            title: "タイムアタッククイズ",
            body: `自己ベスト ${ta.best_score}問正解${ta.best_score >= 15 ? "（限定アバター解放済み🎁）" : ""}`,
            shortDate: "",
            fullDate: "現在の状況",
            trackRead: false
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
            key: "event:dice",
            type: "event",
            icon: "🎲",
            title: "サイコロの旅",
            body: `現在 ${dice.position}マス目（サイコロ使用: ${dice.dice_used}回）`,
            shortDate: "",
            fullDate: "現在の状況",
            trackRead: false
        });
    }

    items.forEach(i => { i.snippet = makeSnippet(i.body); });

    renderMailList(el, items);
}

// お知らせ・返信の未読件数を合算してFABのバッジに反映する
async function refreshUnreadBadge() {
    const badge = document.getElementById("mailboxBadge");
    if (!badge) return;

    const [{ data: announces }, { data: replies }] = await Promise.all([
        supabaseClient.from("announcements").select("id").order("created_at", { ascending: false }).limit(20),
        supabaseClient.from("inquiries").select("id").eq("user_id", myId).not("admin_reply", "is", null).order("replied_at", { ascending: false }).limit(20)
    ]);

    const readSet = getReadSet();
    const unreadCount =
        (announces || []).filter(a => !readSet.has(`announce:${a.id}`)).length +
        (replies || []).filter(r => !readSet.has(`reply:${r.id}`)).length;

    if (unreadCount > 0) {
        badge.hidden = false;
        badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
    } else {
        badge.hidden = true;
    }
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
