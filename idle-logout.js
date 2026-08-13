// ==========================
// 自動ログアウト機能
// 24時間（1日）操作がない場合、自動的にログアウトしてlogin.htmlへ遷移する
// 各ページ（app.js/mypage.js/toppage.jsを読み込むHTML）で
// supabase.jsの後にこのファイルを読み込むこと
// ==========================
(function () {
    const IDLE_LIMIT_MS = 24 * 60 * 60 * 1000; // 24時間
    const STORAGE_KEY = "lastActivityAt";

    // 最終操作時刻を記録
    function updateLastActivity() {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }

    // 無操作時間をチェックし、超えていればログアウトする。
    // 戻り値: ログアウトさせた場合はtrue、そうでなければfalse
    async function checkIdleTimeout() {
        const last = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
        const now = Date.now();

        if (last && now - last > IDLE_LIMIT_MS) {
            await supabaseClient.auth.signOut();
            localStorage.removeItem(STORAGE_KEY);
            location.href = "login.html";
            return true;
        }
        return false;
    }

    // ユーザー操作イベントで最終操作時刻を更新
    ["click", "keydown", "mousemove", "scroll", "touchstart"].forEach(evt => {
        document.addEventListener(evt, updateLastActivity, { passive: true });
    });

    // ページ読み込み時：まず無操作時間をチェックしてから、最終操作時刻を更新する
    // （順序を逆にすると、チェック直前に「今」で上書きされてしまい、
    //   何時間経っていても絶対にタイムアウト判定されなくなる）
    checkIdleTimeout().then(loggedOut => {
        if (!loggedOut) updateLastActivity();
    });

    // 1時間おきに定期チェック（タブを開きっぱなしにしていても検知できるように）
    setInterval(checkIdleTimeout, 60 * 60 * 1000);
})();
