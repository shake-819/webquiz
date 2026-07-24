// ログイン確認
(async () => {

    const {
        data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session) {
        location.href = "login.html";
        return;
    }

    const user = session.user;

    // 自分のデータ取得
    const { data: profile, error } = await supabaseClient
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error(error);
        return;
    }

    // スコア
    const score =
        (profile.correct ?? 0) +
        (profile.wrong ?? 0);

    document.getElementById("score").textContent = score;

    // 正解数
    document.getElementById("correct").textContent =
        profile.correct ?? 0;

    // 正答率
    const total =
        (profile.correct ?? 0) +
        (profile.wrong ?? 0);

    const rate =
        total === 0
            ? 0
            : Math.round((profile.correct / total) * 100);

    document.getElementById("rate").textContent =
        rate + "%";

})();


// ランキング取得
(async () => {

    const { data, error } = await supabaseClient
        .from("users")
        .select("name,score")
        .order("score", { ascending: false })
        .limit(10);

    if (error) {
        console.error(error);
        return;
    }

    const ranking = document.getElementById("ranking");

    ranking.innerHTML = "";

    const medals = ["🥇","🥈","🥉"];

    data.forEach((user,index)=>{

        const rank = index < 3
            ? medals[index]
            : `${index+1}位`;

        ranking.innerHTML += `
        <li>
            <span>${rank} ${user.name}</span>
            <span>${user.score}pt</span>
        </li>
        `;

    });

})();

// ログアウト
document.getElementById("logout").addEventListener("click", async () => {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert("ログアウトに失敗しました");
        console.error(error);
        return;
    }

    location.href = "login.html";

});
