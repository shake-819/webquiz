async function loadCategoryChart() {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
        location.href = "login.html";
        return;
    }

    // プラン確認
    const { data: profile, error: profileError } = await supabaseClient
        .from("users")
        .select("plan")
        .eq("id", user.id)
        .single();

    if (profileError) {
        console.error(profileError);
        return;
    }

    // Premium以外は表示しない
    if (profile.plan !== "premium") {

        document.getElementById("categoryChart").remove();

        document.body.insertAdjacentHTML(
            "beforeend",
            `
            <div style="text-align:center;margin-top:40px;">
                <h2>🔒 Premium限定機能</h2>
                <p>教科別正答率グラフはPremiumプランで利用できます。</p>
            </div>
            `
        );

        return;
    }

    // 教科別データ取得
    const { data, error } = await supabaseClient
        .from("user_category_stats")
        .select("*")
        .eq("user_id", user.id);

    if (error) {
        console.error(error);
        return;
    }

    const labels = [];
    const rates = [];

    data.forEach(row => {

        const total = row.correct + row.wrong;

        const rate = total === 0
            ? 0
            : Math.round((row.correct / total) * 100);

        labels.push(row.category);
        rates.push(rate);

    });

    new Chart(
        document.getElementById("categoryChart"),
        {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "正答率 (%)",
                    data: rates,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        }
    );

}

loadCategoryChart();
