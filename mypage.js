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

    // 正答率(0-100)に応じて 赤→黄→緑→青 のグラデーション色を返す
    function getColorByRate(rate) {
        // 4色のストップポイント（0, 33, 66, 100）
        const stops = [
            { pos: 0,   color: [239, 68, 68] },   // 赤
            { pos: 33,  color: [250, 204, 21] },  // 黄
            { pos: 66,  color: [34, 197, 94] },   // 緑
            { pos: 100, color: [59, 130, 246] }   // 青
        ];

        let lower = stops[0];
        let upper = stops[stops.length - 1];
        for (let i = 0; i < stops.length - 1; i++) {
            if (rate >= stops[i].pos && rate <= stops[i + 1].pos) {
                lower = stops[i];
                upper = stops[i + 1];
                break;
            }
        }

        const range = upper.pos - lower.pos;
        const ratio = range === 0 ? 0 : (rate - lower.pos) / range;

        const r = Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * ratio);
        const g = Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * ratio);
        const b = Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * ratio);

        return `rgb(${r}, ${g}, ${b})`;
    }

    const backgroundColors = rates.map(getColorByRate);

    new Chart(
        document.getElementById("categoryChart"),
        {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "正答率 (%)",
                    data: rates,
                    backgroundColor: backgroundColors,
                    borderRadius: 8,
                    borderSkipped: false,
                    maxBarThickness: 28,
                    categoryPercentage: 0.6,
                    barPercentage: 0.9
                }]
            },
            options: {
                indexAxis: 'y', // 横向き
                responsive: true,
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        }
    );
}
loadCategoryChart();
