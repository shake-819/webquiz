const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");

registerBtn?.addEventListener("click", register);
loginBtn?.addEventListener("click", login);

async function register() {

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } =
        await supabaseClient.auth.signUp({
            email,
            password
        });

    if (error) {
        alert(error.message);
        return;
    }

    // 登録したユーザー
    const user = data.user;

    // usersテーブルに初期データを作成
    const { error: insertError } =
        await supabaseClient
            .from("users")
            .insert({
                id: user.id,
                score: 0,
                correct: 0,
                wrong: 0
            });

    if (insertError) {
        console.error(insertError);
    }

    alert("登録しました");

    location.href = "login.html";
}
async function login() {

    const email =
        document.getElementById("email").value;

    const password =
        document.getElementById("password").value;

    const { error } =
        await supabaseClient.auth.signInWithPassword({

            email,
            password

        });

    if (error) {

        alert(error.message);

    } else {

        location.href = "index.html";

    }
}
