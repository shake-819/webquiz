// ==========================
// プロフィールページ
// ・自分のプロフィール: 画像/コメント選択・編集（Premium限定）
// ・他ユーザーのプロフィール: ?user=<uuid> で閲覧（読み取り専用）
// ・コレクション欄: イベントで入手予定のアイテム表示（現状はロック表示）
// ・下部の統計（総回答数・正答率）は誰でも閲覧可能
//
// ▼ 画像は GitHub 上にアップロードした画像を参照します。
//   （実運用時は GITHUB_ASSETS_BASE 以下に画像を置いてください）
//
// ▼「この人しか使えない」画像にしたい場合
//   各プリセットに exclusiveTo: ["ユーザーのUUID", ...] を追加してください。
//   ・exclusiveTo が無い（または空配列）→ Premiumユーザーなら誰でも選択可
//   ・exclusiveTo がある            → そこに書かれたユーザーIDだけが選択・表示可
//   ユーザーIDはSupabaseの Authentication > Users か、
//   `select id from users where name = '...'` で確認できます。
//
//   ⚠️ 注意: これはあくまで「UI上」の制限です。ブラウザの開発者ツールから
//   直接 supabase の update を呼べば理論上は誰でも書き込めてしまうため、
//   本気で不正防止したい場合は Supabase 側（DB関数 / RLS）でも
//   同様のチェックを行うことをおすすめします。
// ==========================

const GITHUB_ASSETS_BASE =
    "https://raw.githubusercontent.com/shake-819/webquiz/main/assets";

// ----- アバタープリセット -----
const AVATAR_PRESETS = [
    { key: "avatar1", url: `${GITHUB_ASSETS_BASE}/avatars/avatar1.png` },
    { key: "avatar2", url: `${GITHUB_ASSETS_BASE}/avatars/avatar2.png` },
    { key: "avatar3", url: `${GITHUB_ASSETS_BASE}/avatars/avatar3.png` },
    { key: "avatar4", url: `${GITHUB_ASSETS_BASE}/avatars/avatar4.png` },
    { key: "avatar5", url: `${GITHUB_ASSETS_BASE}/avatars/avatar5.png` },
    { key: "avatar6", url: `${GITHUB_ASSETS_BASE}/avatars/avatar6.png` },
    { key: "avatar_special", name: "admin専用アバター",
      url: `${GITHUB_ASSETS_BASE}/avatars/summer school suimsuit.png`,
      exclusiveTo: ["874b3df4-f031-40a9-b332-5106ad70118f"] 
    },

    // ↓ 特定ユーザー限定アバターの例。exclusiveTo にUUIDを入れて使う。
    // { key: "avatar_special", name: "限定アバター",
    //   url: `${GITHUB_ASSETS_BASE}/avatars/avatar_special.png`,
    //   exclusiveTo: ["ここにユーザーUUID"] },
];

// ----- コレクションアイテム -----
// イベントで入手する想定。exclusiveToで「入手済みの人」を指定する。
// exclusiveTo未設定の状態＝まだ誰も入手していない（常にロック表示）。
const COLLECTION_ITEMS = [
    // { key: "summer2026", name: "夏祭り記念メダル",
    //   url: `${GITHUB_ASSETS_BASE}/collection/summer2026.png`,
    //   exclusiveTo: ["ここにユーザーUUID", "複数人いれば追加でUUID"] },
];
const COLLECTION_SLOT_COUNT = 6; // 左右3枠ずつ

function isAllowed(preset, userId) {
    if (!preset.exclusiveTo || preset.exclusiveTo.length === 0) return true;
    return preset.exclusiveTo.includes(userId);
}

function getPreset(key) {
    return AVATAR_PRESETS.find(p => p.key === key) || null;
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
}

function renderAvatar(avatarKey) {
    const el = document.getElementById("avatarPhoto");
    // すでに設定済みのアバターは、その後に限定対象から外れても
    // 表示自体はそのまま維持する（「一度もらった称号は残る」的な挙動）
    const preset = avatarKey ? getPreset(avatarKey) : null;

    if (preset) {
        el.style.background = "#fff";
        el.innerHTML = `<img src="${preset.url}" alt="プロフィール画像" onerror="this.parentElement.innerHTML='<span class=&quot;avatar-fallback&quot;>🙂</span>'">`;
    } else {
        el.style.background = "#F5F3EC";
        el.innerHTML = `<span class="avatar-fallback">🙂</span>`;
    }
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
// 表示対象ユーザー(viewedUserId)が exclusiveTo に含まれているアイテムだけ
// 「入手済み」として表示し、残りはロック表示で埋める。
function renderCollectionSlots() {
    const left = document.getElementById("collectionLeft");
    const right = document.getElementById("collectionRight");
    left.innerHTML = "";
    right.innerHTML = "";

    const unlocked = COLLECTION_ITEMS.filter(
        item => item.exclusiveTo && item.exclusiveTo.includes(viewedUserId)
    );

    const slots = [];
    for (let i = 0; i < COLLECTION_SLOT_COUNT; i++) {
        slots.push(unlocked[i] ? buildUnlockedSlot(unlocked[i]) : buildLockedSlot());
    }

    slots.slice(0, 3).forEach(s => left.appendChild(s));
    slots.slice(3, 6).forEach(s => right.appendChild(s));
}

function buildUnlockedSlot(item) {
    const slot = document.createElement("div");
    slot.className = "collection-slot is-unlocked";
    slot.title = item.name || "";
    slot.innerHTML = `
        <img class="slot-img" src="${item.url}" alt="${item.name || ""}"
             onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'slot-lock',textContent:'🔒'}))">
        ${item.name ? `<span class="slot-label">${item.name}</span>` : ""}
    `;
    return slot;
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

    // 自分が使える（限定対象なら自分が指定されている）プリセットだけを表示
    const available = AVATAR_PRESETS.filter(p => isAllowed(p, viewedUserId));

    if (available.length === 0) {
        grid.innerHTML = `<p class="picker-empty">選べる画像がまだありません</p>`;
    }

    available.forEach(preset => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "picker-item";
        btn.title = preset.name || "";
        btn.innerHTML = `<img src="${preset.url}" alt="${preset.name || ""}"
            onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'🙂'}))">`;
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

    // 選択直前にも念のため権限を再チェック
    const preset = getPreset(key);
    if (!preset || !isAllowed(preset, viewedUserId)) return;

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
