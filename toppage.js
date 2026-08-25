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
        .select("id,name,score")
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
            <a class="rank-name-link" href="profile.html?user=${user.id}">${rank} ${user.name}</a>
            <span>${user.score}pt</span>
        </li>
        `;

    });

})();
const items = document.querySelectorAll(".fade");

const observer = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
        if(entry.isIntersecting){
            entry.target.classList.add("show");
        }
    });
});

items.forEach(item=>observer.observe(item));

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

// 紹介カードのフリップ（スマホ：画面中央に来たら裏返す）
if (window.matchMedia("(hover: none)").matches) {

    const teamCards = document.querySelectorAll(".team-card");

    const flipObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            entry.target.classList.toggle("is-flipped", entry.isIntersecting);
        });
    }, {
        root: null,
        rootMargin: "-50% 0px -50% 0px",
        threshold: 0
    });

    teamCards.forEach(card => flipObserver.observe(card));

}
