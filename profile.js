// ==========================
// プロフィールページ
// ・自分のプロフィール: 画像/コメント選択・編集（Premium限定）
// ・他ユーザーのプロフィール: ?user=<uuid> で閲覧（読み取り専用）
// ・コレクション欄: 今後実装予定のイベント機能用のプレースホルダー
// ・下部の統計（総回答数・正答率）は誰でも閲覧可能
// ==========================

// ----- アバタープリセット -----
// 実際にアップロード済みの画像がある場合は、各 preset の
// `emoji` の代わりに `url:"avatars/xxx.png"` を追加すれば
// renderAvatar() 側は自動的に画像を優先表示します。
const AVATAR_PRESETS = [
    { key: "star",   emoji: "⭐", bg: "#FBF3DD" },
    { key: "book",   emoji: "📖", bg: "#EEF1F6" },
    { key: "pencil", emoji: "✏️", bg: "#FDF1EF" },
    { key: "cat",    emoji: "🐱", bg: "#F1F0EA" },
    { key: "fox",    emoji: "🦊", bg: "#FBE9E0" },
    { key: "crown",  emoji: "👑", bg: "#FBF3DD" },
    { key: "heart",  emoji: "💮", bg: "#FDF1EF" },
    { key: "bolt",   emoji: "⚡", bg: "#EAF1EE" }
];
const DEFAULT_AVATAR = { key: null, emoji: "🙂", bg: "#F5F3EC" };

function getPreset(key) {
    return AVATAR_PRESETS.find(p => p.key === key) || DEFAULT_AVATAR;
}

// ----- 状態 -----
let viewedUserId = null;
let isOwnProfile = false;
let currentProfile = null; // 表示対象ユーザーの users 行
let viewerIsPremium = false; // 自分自身がPremiumかどうか

const params = new URLSearchParams(location.search);

init();

async function init() {
    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
        location.href = "login.html";
        return;
    }

    const myId = session.user.id;
    viewedUserId = params.get("user") || myId;
    isOwnProfile = viewedUserId === myId;

    // 自分の plan を確認（編集権限の判定に使用）
    const { data: myProfile } = await supabaseClient
        .from("users")
        .select("plan")
        .eq("id", myId)
        .single();
    viewerIsPremium = myProfile?.plan === "premium";

    await loadProfile();
    renderCollectionSlots();
    bindEvents();
}

async function loadProfile() {
    const { data, error } = await supabaseClient
        .from("users")
        .select("id,name,grade,avatar_key,comment,plan,correct,wrong")
        .eq("id", viewedUserId)
        .single();

    if (error || !data) {
        console.error(error);
        document.getElementById("profileName").textContent = "ユーザーが見つかりません";
        return;
    }

    currentProfile = data;
    renderProfile();
}

function renderProfile() {
    const p = currentProfile;

    document.getElementById("profileName").textContent = p.name || "名前未設定";
    document.getElementById("profileGrade").textContent = p.grade || "";

    renderAvatar(p.avatar_key);
    renderComment(p.comment);
    renderStats(p.correct ?? 0, p.wrong ?? 0);

    // 編集系UIは「自分のプロフィール」かつ「Premium」のときだけ表示
    const canEdit = isOwnProfile && viewerIsPremium;
    document.getElementById("editAvatarBtn").hidden = !canEdit;
    document.getElementById("editCommentBtn").hidden = !canEdit;

    // 自分のプロフィールで、かつPremiumでない場合だけ案内を表示
    document.getElementById("premiumHint").hidden = !(isOwnProfile && !viewerIsPremium);

    document.getElementById("backLink").href = isOwnProfile ? "toppage.html" : "toppage.html";
}

function renderAvatar(avatarKey) {
    const preset = avatarKey ? getPreset(avatarKey) : DEFAULT_AVATAR;
    const el = document.getElementById("avatarPhoto");
    el.style.background = preset.bg;
    el.innerHTML = preset.url
        ? `<img src="${preset.url}" alt="プロフィール画像">`
        : `<span class="avatar-emoji">${preset.emoji}</span>`;
}

function renderComment(comment) {
    const textEl = document.getElementById("commentText");
    textEl.textContent = comment && comment.trim()
        ? comment
        : (isOwnProfile ? "ひとことコメントを設定しよう" : "コメントはまだありません");
    textEl.classList.toggle("is-placeholder", !comment);
}

function renderStats(correct, wrong) {
    const total = correct + wrong;
    const rate = total === 0 ? 0 : Math.round((correct / total) * 100);

    document.getElementById("statTotal").firstChild.textContent = total;
    document.getElementById("statCorrect").firstChild.textContent = correct;
    document.getElementById("statRate").firstChild.textContent = rate;
}

// ----- コレクション枠（左右） -----
// 今後、イベントで入手したアイテムをここに表示する想定。
// 現時点ではイベント機能が未実装のため、全枠ロック表示のプレースホルダー。
function renderCollectionSlots() {
    const left = document.getElementById("collectionLeft");
    const right = document.getElementById("collectionRight");
    left.innerHTML = "";
    right.innerHTML = "";

    for (let i = 0; i < 3; i++) {
        left.appendChild(buildLockedSlot());
    }
    for (let i = 0; i < 3; i++) {
        right.appendChild(buildLockedSlot());
    }
}

function buildLockedSlot() {
    const slot = document.createElement("div");
    slot.className = "collection-slot is-locked";
    slot.innerHTML = `
        <span class="slot-lock">🔒</span>
        <span class="slot-label">開催予定</span>
    `;
    return slot;
}

// ----- イベントバインド -----
function bindEvents() {
    document.getElementById("editAvatarBtn")?.addEventListener("click", openAvatarPicker);
    document.getElementById("closePickerBtn")?.addEventListener("click", closeAvatarPicker);

    document.getElementById("editCommentBtn")?.addEventListener("click", openCommentEditor);
    document.getElementById("cancelCommentBtn")?.addEventListener("click", closeCommentEditor);
    document.getElementById("saveCommentBtn")?.addEventListener("click", saveComment);
}

// ----- アバター選択 -----
function openAvatarPicker() {
    const grid = document.getElementById("pickerGrid");
    grid.innerHTML = "";

    AVATAR_PRESETS.forEach(preset => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "picker-item";
        btn.style.background = preset.bg;
        btn.innerHTML = preset.url
            ? `<img src="${preset.url}" alt="">`
            : `<span>${preset.emoji}</span>`;
        btn.addEventListener("click", () => selectAvatar(preset.key));
        grid.appendChild(btn);
    });

    document.getElementById("avatarPicker").hidden = false;
}

function closeAvatarPicker() {
    document.getElementById("avatarPicker").hidden = true;
}

async function selectAvatar(key) {
    if (!isOwnProfile || !viewerIsPremium) return;

    const { error } = await supabaseClient
        .from("users")
        .update({ avatar_key: key })
        .eq("id", viewedUserId);

    if (error) {
        console.error(error);
        alert("画像の更新に失敗しました");
        return;
    }

    currentProfile.avatar_key = key;
    renderAvatar(key);
    closeAvatarPicker();
}

// ----- コメント編集 -----
function openCommentEditor() {
    if (!isOwnProfile || !viewerIsPremium) return;

    document.getElementById("commentInput").value = currentProfile.comment || "";
    document.getElementById("commentEditor").hidden = false;
}

function closeCommentEditor() {
    document.getElementById("commentEditor").hidden = true;
}

async function saveComment() {
    const value = document.getElementById("commentInput").value.trim().slice(0, 40);

    const { error } = await supabaseClient
        .from("users")
        .update({ comment: value })
        .eq("id", viewedUserId);

    if (error) {
        console.error(error);
        alert("コメントの更新に失敗しました");
        return;
    }

    currentProfile.comment = value;
    renderComment(value);
    closeCommentEditor();
}
