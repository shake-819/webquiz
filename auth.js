const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");

registerBtn?.addEventListener("click", register);
loginBtn?.addEventListener("click", login);

async function register() {

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!name || !email || !password) {
        alert("すべて入力してください");
        return;
    }

    const { data, error } =
        await supabaseClient.auth.signUp({
            email,
            password
        });

    if (error) {
        alert(error.message);
        return;
    }

    const user = data.user;

    const { error: insertError } =
        await supabaseClient
            .from("users")
            .insert({
                id: user.id,
                name: name,
                score: 0,
                correct: 0,
                wrong: 0,
                plan: "free"
            });

    if (insertError) {
        console.error(insertError);
        alert(insertError.message);
        return;
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

        location.href = "toppage.html";

    }
}
