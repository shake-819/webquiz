const GITHUB_ASSETS_BASE =
    "https://raw.githubusercontent.com/shake-819/webquiz/main/assets";

// コレクションの入手済みアイテムの背後に敷く、金色の光芒（オーラ）画像。
// assets/collection/aura-gold-burst.png を配置しておくこと。
const COLLECTION_AURA_URL = `${GITHUB_ASSETS_BASE}/collection/aura-gold-burst.jpeg`;

// ----- アバタープリセット -----
const AVATAR_PRESETS = [
    { key: "avatar1", url: `${GITHUB_ASSETS_BASE}/avatars/avatar1.jpg` },
    { key: "avatar2", url: `${GITHUB_ASSETS_BASE}/avatars/avatar2.jpg` },
    { key: "avatar3", url: `${GITHUB_ASSETS_BASE}/avatars/avatar3.jpg` },
    { key: "avatar4", url: `${GITHUB_ASSETS_BASE}/avatars/avatar4.jpg` },
    { key: "avatar5", url: `${GITHUB_ASSETS_BASE}/avatars/avatar5.jpg` },
    { key: "avatar6", url: `${GITHUB_ASSETS_BASE}/avatars/avatar6.jpg` },

    // ↓ 特定ユーザー限定アバターの例。exclusiveTo にUUIDを入れて使う。
    { key: "avatar_special", name: "限定アバター",
        url: `${GITHUB_ASSETS_BASE}/avatars/avatar_special.jpg`,
        exclusiveTo: ["ここにユーザーUUID"] },

    // ↓ 「浮く・波打つ・水しぶき」の本格演出付きアバターの例。
    // front(キャラの透過PNG) と back(背景) を両方指定すると自動でこの演出になる。
    // water:true で波・水しぶきの演出が付く。focusで切り抜き位置、zoomでアップ具合を調整。
    { key: "avatar_summer", name: "summer",
        layered: {
            front: `${GITHUB_ASSETS_BASE}/avatars/summer_front.png`,
            back:  `${GITHUB_ASSETS_BASE}/avatars/summer_back.png`
        },
        focus: "50% 70%",
        zoom: 1.3, // 1.0=そのまま。値を上げるほど顔寄りにアップになる（0.1刻みで調整推奨）
        water: true,
        exclusiveTo: ["874b3df4-f031-40a9-b332-5106ad70118f"] },

    // ↓ front(人物の透過PNG)とback(背景のみ)を分離した「王者」演出の例。
    // frontAnim:"threat" で、浮遊ではなく肩を上げて下ろす威圧的な動きになる。
    // petals:true で、frontの手前ではなく「backとfrontの間＝人物の背後」で花吹雪が舞う。
    // text は行ごとに配列で渡す（1文字ずつ1秒間隔で表示、達筆フォント）。
    { key: "avatar_king", name: "王者",
        layered: {
            front: `${GITHUB_ASSETS_BASE}/avatars/king_front.webp`,
            back:  `${GITHUB_ASSETS_BASE}/avatars/king_back.webp`
        },
        focus: "50% 15%",
        waveDistort: false, // 背景の波打ち揺れなし
        frontAnim: "none",  // frontの上下の動きなし（静止）
        aura: true,         // 背後からオーラが脈動する
        petals: true,
        text: ["2学期中間", "王者"],
        exclusiveTo: ["874b3df4-f031-40a9-b332-5106ad70118f"] },
];


const COLLECTION_ITEMS = [
     { key: "dice", name: "黄金のサイコロ",
       url: `${GITHUB_ASSETS_BASE}/collection/dice_gold.webp`,
       exclusiveTo: ["874b3df4-f031-40a9-b332-5106ad70118f", "複数人いれば追加でUUID"] },
];
const COLLECTION_SLOT_COUNT = 6; // 左右3枠ずつ

function isAllowed(preset, userId) {
    if (!preset.exclusiveTo || preset.exclusiveTo.length === 0) return true;
    return preset.exclusiveTo.includes(userId);
}

function getPreset(key) {
    return AVATAR_PRESETS.find(p => p.key === key) || null;
}

// ピッカーでのサムネイル表示に使う画像（layeredならfrontを使う）
function getPresetThumbnail(preset) {
    return preset.thumbnail || (preset.layered ? preset.layered.front : preset.url);
}

// ----- 状態 -----
let viewedUserId = null;
let isOwnProfile = false;
let currentProfile = null; // 表示対象ユーザーの users 行
let viewerIsPremium = false; // 自分自身がPremiumかどうか
let avatarEffectTimers = []; // 演出アバター（水しぶき・花吹雪・文字送りなど）のタイマー群
let collectionSelection = []; // コレクション編集パネルで選択中のkey配列（保存前の一時状態）

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
        .select("id,name,grade,avatar_key,comment,plan,correct,wrong,collection_keys")
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

    renderAchievementWall(
        document.getElementById("achievementWall"),
        document.getElementById("achievementStars"),
        document.getElementById("profileLevel"),
        {
            userId: viewedUserId,
            isOwnProfile,
            correct: p.correct ?? 0,
            wrong: p.wrong ?? 0
        }
    );

    // 編集系UIは「自分のプロフィール」かつ「Premium」のときだけ表示
    const canEdit = isOwnProfile && viewerIsPremium;
    document.getElementById("editAvatarBtn").hidden = !canEdit;
    document.getElementById("editCommentBtn").hidden = !canEdit;

    // コレクション編集ボタンは、上記に加えて「入手済みアイテムが1つ以上ある」ときだけ表示
    const ownedCollectionCount = getOwnedCollectionItems().length;
    document.getElementById("editCollectionBtn").hidden = !(canEdit && ownedCollectionCount > 0);

    // 自分のプロフィールで、かつPremiumでない場合だけ案内を表示
    document.getElementById("premiumHint").hidden = !(isOwnProfile && !viewerIsPremium);
}

function renderAvatar(avatarKey) {
    const el = document.getElementById("avatarPhoto");

    // アバターを切り替えるたびに、前の演出タイマー（水しぶき・花吹雪・文字送りなど）は必ず止める
    avatarEffectTimers.forEach(t => clearInterval(t));
    avatarEffectTimers = [];

    // すでに設定済みのアバターは、その後に限定対象から外れても
    // 表示自体はそのまま維持する（「一度もらった称号は残る」的な挙動）
    const preset = avatarKey ? getPreset(avatarKey) : null;

    if (!preset) {
        el.style.background = "#F5F3EC";
        el.innerHTML = `<span class="avatar-fallback">🙂</span>`;
        return;
    }

    const focus = preset.focus || "50% 50%";

    if (preset.layered) {
        el.style.background = "#fff";
        const zoom = preset.zoom || 1;
        const frontClass =
            preset.frontAnim === "threat" ? "avl-front avl-front--threat" :
            preset.frontAnim === "none"   ? "avl-front avl-front--static" :
            "avl-front";
        const lines = preset.text || [];
        // waveDistortはデフォルトtrue（従来通り波打つ）。falseを指定した時だけ揺らぎを切る。
        const waveStyle = preset.waveDistort === false ? `style="filter:none"` : "";

        el.innerHTML = `
            <div class="avl">
                <div class="avl-wave" ${waveStyle}>
                    <img src="${preset.layered.back}" alt=""
                         style="object-position:${focus}"
                         onerror="this.parentElement.style.display='none'">
                </div>
                ${preset.water ? `<div class="avl-shimmer"></div>` : ""}
                ${preset.aura ? `<div class="avl-aura"></div>` : ""}
                ${preset.petals ? `<div class="avl-petals"></div>` : ""}
                <img class="${frontClass}" src="${preset.layered.front}" alt="プロフィール画像"
                     style="object-position:${focus}; --afzoom:${zoom}"
                     onerror="this.style.display='none'">
                ${preset.water ? `<div class="avl-splash"></div>` : ""}
                ${lines.length ? `<div class="avk-caption">
                    ${lines.map(line => `<span class="avk-caption-line">${
                        [...line].map(ch => `<span class="ch">${ch === " " ? "&nbsp;" : ch}</span>`).join("")
                    }</span>`).join("")}
                </div>` : ""}
            </div>
        `;
        if (preset.water) {
            avatarEffectTimers.push(startAvatarSplash(el.querySelector(".avl-splash")));
        }
        if (preset.petals) {
            avatarEffectTimers.push(startPetalStorm(el.querySelector(".avl-petals")));
        }
        if (lines.length) {
            avatarEffectTimers.push(...startCaptionTyping(el.querySelectorAll(".avk-caption .ch")));
        }
    } else {
        el.style.background = "#fff";
        el.innerHTML = `<img src="${preset.url}" alt="プロフィール画像"
            style="object-position:${focus}"
            onerror="this.parentElement.innerHTML='<span class=&quot;avatar-fallback&quot;>🙂</span>'">`;
    }
}

// 本格演出アバターの水しぶき粒を定期生成する
function startAvatarSplash(layer) {
    if (!layer) return null;

    function spawnDrop() {
        const d = document.createElement("div");
        d.className = "avl-drop";
        const size = 3 + Math.random() * 5;
        d.style.width = size + "px";
        d.style.height = size + "px";
        d.style.left = Math.random() * 100 + "%";
        d.style.animationDuration = (1.1 + Math.random() * 1.1) + "s";
        layer.appendChild(d);
        setTimeout(() => d.remove(), 2400);
    }

    for (let i = 0; i < 6; i++) setTimeout(spawnDrop, i * 90);
    return setInterval(spawnDrop, 220);
}

// 花吹雪を定期生成する（backの上・frontの下に敷いたレイヤーに追加するので、人物の背後で舞う）
function startPetalStorm(layer) {
    if (!layer) return null;

    function spawnPetal() {
        const p = document.createElement("div");
        p.className = "avl-petal";
        p.style.left = Math.random() * 100 + "%";
        p.style.setProperty("--avl-drift", (Math.random() * 60 - 30) + "px");
        p.style.animationDuration = (2.6 + Math.random() * 1.8) + "s";
        p.style.transform = `rotate(${Math.random() * 360}deg)`;
        layer.appendChild(p);
        setTimeout(() => p.remove(), 4600);
    }

    for (let i = 0; i < 5; i++) setTimeout(spawnPetal, i * 200);
    return setInterval(spawnPetal, 420);
}

// 下部キャプションを1文字ずつ、1秒間隔で表示する（すべて表示後は少し待って最初からループ）
function startCaptionTyping(chEls) {
    const chars = Array.from(chEls);
    if (chars.length === 0) return [];

    let i = 0;
    function reveal() {
        chars.forEach(c => c.classList.remove("is-visible"));
        i = 0;
        const timer = setInterval(() => {
            if (i < chars.length) {
                chars[i].classList.add("is-visible");
                i++;
            } else {
                clearInterval(timer);
                // 全文字表示後、少し余韻を置いてから最初から表示し直す
                const restartTimer = setTimeout(reveal, 2500);
                avatarEffectTimers.push(restartTimer);
            }
        }, 1000);
        avatarEffectTimers.push(timer);
    }
    reveal();
    return [];
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

// 表示対象ユーザー(viewedUserId)が exclusiveTo に含まれているアイテム＝入手済み
function getOwnedCollectionItems() {
    return COLLECTION_ITEMS.filter(
        item => item.exclusiveTo && item.exclusiveTo.includes(viewedUserId)
    );
}

// ----- コレクション枠（左右） -----
// 入手済みアイテムのうち、本人が「追加」として選んだもの（collection_keysの順）を
// 優先して表示し、まだ選ばれていない入手済み分は後ろに補完する。残りはロック表示で埋める。
function renderCollectionSlots() {
    const left = document.getElementById("collectionLeft");
    const right = document.getElementById("collectionRight");
    left.innerHTML = "";
    right.innerHTML = "";

    const owned = getOwnedCollectionItems();
    const savedKeys = Array.isArray(currentProfile?.collection_keys) ? currentProfile.collection_keys : [];

    const chosen = savedKeys
        .map(key => owned.find(item => item.key === key))
        .filter(Boolean);
    const remaining = owned.filter(item => !chosen.includes(item));
    const displayed = [...chosen, ...remaining].slice(0, COLLECTION_SLOT_COUNT);

    const slots = [];
    for (let i = 0; i < COLLECTION_SLOT_COUNT; i++) {
        slots.push(displayed[i] ? buildUnlockedSlot(displayed[i]) : buildLockedSlot());
    }

    slots.slice(0, 3).forEach(s => left.appendChild(s));
    slots.slice(3, 6).forEach(s => right.appendChild(s));
}

function buildUnlockedSlot(item) {
    const slot = document.createElement("div");
    slot.className = "collection-slot is-unlocked";
    slot.title = item.name || "";
    slot.style.setProperty("--aura-img", `url("${COLLECTION_AURA_URL}")`);
    slot.innerHTML = `
        <img class="slot-img" src="${item.url}" alt="${item.name || ""}"
             onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'slot-lock',textContent:'🔒'}))">
        ${item.name ? `<span class="slot-label slot-label--touch">${item.name}</span>` : ""}
    `;

    // 名前は常時表示せず、タップした時だけ吹き出しで一瞬見せる
    if (item.name) {
        let hideTimer = null;
        slot.addEventListener("click", () => {
            clearTimeout(hideTimer);
            slot.classList.add("is-touched");
            hideTimer = setTimeout(() => slot.classList.remove("is-touched"), 2200);
        });
    }

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

    document.getElementById("editCollectionBtn")?.addEventListener("click", openCollectionPicker);
    document.getElementById("closeCollectionPickerBtn")?.addEventListener("click", closeCollectionPicker);
    document.getElementById("saveCollectionBtn")?.addEventListener("click", saveCollectionSelection);
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

        // layered（front/back演出）のサムネイルは front の透過PNGをそのまま使うため、
        // object-fit:cover + focus位置 で切り抜くと絵の上側が見切れてしまう。
        // 通常アバター（1枚の写真）は今まで通りcoverで、layeredのみcontainにして全体を見せる。
        const thumbClass = preset.layered ? "thumb-contain" : "";
        const thumbStyle = preset.layered ? "" : `object-position:${preset.focus || "50% 50%"}`;

        btn.innerHTML = `<img class="${thumbClass}" src="${getPresetThumbnail(preset)}" alt="${preset.name || ""}"
            style="${thumbStyle}"
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

// ----- コレクション選択（決められたユーザーだけが、入手済みアイテムを選んで追加できる） -----
function openCollectionPicker() {
    if (!isOwnProfile || !viewerIsPremium) return;

    const grid = document.getElementById("collectionPickerGrid");
    grid.innerHTML = "";

    const owned = getOwnedCollectionItems();

    if (owned.length === 0) {
        grid.innerHTML = `<p class="picker-empty">選べるコレクションがまだありません</p>`;
    }

    // 現在表示中のもの（保存済みcollection_keysのうち、今も入手済みのもの）を初期選択状態にする
    const savedKeys = Array.isArray(currentProfile?.collection_keys) ? currentProfile.collection_keys : [];
    collectionSelection = savedKeys.filter(key => owned.some(item => item.key === key));

    owned.forEach(item => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "picker-item";
        btn.title = item.name || "";
        btn.classList.toggle("is-selected", collectionSelection.includes(item.key));

        btn.innerHTML = `<img class="thumb-contain" src="${item.url}" alt="${item.name || ""}"
            onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'🎖️'}))">`;
        btn.addEventListener("click", () => toggleCollectionItem(item.key, btn));
        grid.appendChild(btn);
    });

    document.getElementById("collectionPicker").hidden = false;
}

// 選択/解除を切り替える。追加できるのは最大でも枠の数（COLLECTION_SLOT_COUNT）まで。
function toggleCollectionItem(key, btn) {
    const idx = collectionSelection.indexOf(key);
    if (idx >= 0) {
        collectionSelection.splice(idx, 1);
        btn.classList.remove("is-selected");
        return;
    }

    if (collectionSelection.length >= COLLECTION_SLOT_COUNT) {
        alert(`コレクションは最大${COLLECTION_SLOT_COUNT}個までしか追加できません`);
        return;
    }
    collectionSelection.push(key);
    btn.classList.add("is-selected");
}

function closeCollectionPicker() {
    document.getElementById("collectionPicker").hidden = true;
}

async function saveCollectionSelection() {
    if (!isOwnProfile || !viewerIsPremium) return;

    const { error } = await supabaseClient
        .from("users")
        .update({ collection_keys: collectionSelection })
        .eq("id", viewedUserId);

    if (error) {
        console.error(error);
        alert("コレクションの更新に失敗しました");
        return;
    }

    currentProfile.collection_keys = [...collectionSelection];
    renderCollectionSlots();
    closeCollectionPicker();
}
