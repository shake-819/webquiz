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
async function loadDailyChart() {
    const {
        data: { user }
    } = await supabaseClient.auth.getUser();
    if (!user) return;

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
        document.getElementById("dailyChart")?.remove();
        return;
    }

    // 直近7日分の日付リストを作成（古い→新しい順）
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
    }

    // user_daily_stats取得（直近7日分、全カテゴリ）
    const { data, error } = await supabaseClient
        .from("user_daily_stats")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", dates[0]);

    if (error) {
        console.error(error);
        return;
    }

    // 日付ごとにカテゴリ横断で合算
    const totals = {};
    dates.forEach(d => {
        totals[d] = { correct: 0, wrong: 0 };
    });

    data.forEach(row => {
        if (totals[row.date]) {
            totals[row.date].correct += row.correct;
            totals[row.date].wrong += row.wrong;
        }
    });

    // 総回答数・正答率を算出
    const totalAnswers = dates.map(d =>
        totals[d].correct + totals[d].wrong
    );

    const correctRates = dates.map(d => {
        const t = totals[d].correct + totals[d].wrong;
        return t === 0 ? 0 : Math.round((totals[d].correct / t) * 100);
    });

    // 日付ラベルを見やすく整形（例: 07/30）
    const labels = dates.map(d => {
        const [, m, day] = d.split("-");
        return `${m}/${day}`;
    });

    new Chart(
        document.getElementById("dailyChart"),
        {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: "総回答数",
                        data: totalAnswers,
                        yAxisID: "yCount",
                        borderColor: "rgb(59, 130, 246)",
                        backgroundColor: "rgba(59, 130, 246, 0.15)",
                        tension: 0,
                        fill: true,
                        pointRadius: 4
                    },
                    {
                        label: "正答率 (%)",
                        data: correctRates,
                        yAxisID: "yRate",
                        borderColor: "rgb(34, 197, 94)",
                        backgroundColor: "rgba(34, 197, 94, 0.15)",
                        tension: 0,
                        fill: true,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: "index",
                    intersect: false
                },
                scales: {
                    yCount: {
                        type: "linear",
                        position: "left",
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "総回答数"
                        }
                    },
                    yRate: {
                        type: "linear",
                        position: "right",
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: "正答率 (%)"
                        }
                    }
                }
            }
        }
    );
}
async function loadBookmarks() {
    const {
        data: { user }
    } = await supabaseClient.auth.getUser();
    if (!user) {
        location.href = "login.html";
        return;
    }

    const { data, error } = await supabaseClient
        .from("user_bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    const container = document.getElementById("bookmarkContainer");
    const emptyMsg = document.getElementById("bookmarkEmpty");

    // 既存のカテゴリグループを一旦クリア（emptyMsgは残す）
    container.querySelectorAll(".category-group").forEach(el => el.remove());

    if (!data || data.length === 0) {
        emptyMsg.style.display = "block";
        return;
    }
    emptyMsg.style.display = "none";

    // カテゴリごとにグルーピング
    const grouped = {};
    data.forEach(row => {
        const cat = row.category || "その他";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(row);
    });

    Object.keys(grouped).forEach(category => {
        const items = grouped[category];

        const group = document.createElement("div");
        group.className = "category-group";

        group.innerHTML = `
            <div class="category-header">
                <span>${category}</span>
                <span class="count-badge">${items.length}</span>
                <span class="arrow">▶</span>
            </div>
            <div class="category-body"></div>
        `;

        const body = group.querySelector(".category-body");

        items.forEach(item => {
            const el = document.createElement("div");
            el.className = "bookmark-item";
            el.innerHTML = `
                <span class="star-icon">★</span>
                <span class="q-text">${item.question}</span>
                <button class="remove-btn" data-id="${item.id}">解除</button>
            `;
            body.appendChild(el);
        });

        group.querySelector(".category-header")
            .addEventListener("click", () => {
                group.classList.toggle("open");
            });

        container.appendChild(group);
    });

    // 解除ボタンのイベント
    container.querySelectorAll(".remove-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;

            const { error } = await supabaseClient
                .from("user_bookmarks")
                .delete()
                .eq("id", id);

            if (error) {
                console.error(error);
                return;
            }

            loadBookmarks(); // 再読み込みして表示更新
        });
    });
}
document.getElementById("homeBtn")
    .addEventListener("click", () => {
        location.href = "toppage.html";
    });
loadBookmarks();
loadCategoryChart();
loadDailyChart();
