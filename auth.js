const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");

registerBtn?.addEventListener("click", register);
loginBtn?.addEventListener("click", login);

async function register() {

    const email =
        document.getElementById("email").value;

    const password =
        document.getElementById("password").value;

    const { error } =
        await supabaseClient.auth.signUp({

            email,
            password

        });

    if (error) {

        alert(error.message);

    } else {

        alert("登録しました");

        location.href = "login.html";

    }
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
