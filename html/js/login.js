import { auth, db } from "./firebase-config.js";

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


const form = document.getElementById("loginForm");
const password = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");


/* Show / hide password */

if (togglePassword) {

    togglePassword.addEventListener("click", () => {

        if (password.type === "password") {

            password.type = "text";
            togglePassword.textContent = "🙈";

        } else {

            password.type = "password";
            togglePassword.textContent = "👁";

        }

    });

}


/* Login */

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email =
        document.getElementById("email").value.trim();

    const passwordValue =
        password.value;


    try {

        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                email,
                passwordValue
            );

        const user =
            userCredential.user;


        /* Get Ziba profile */

        const userRef =
            doc(db, "users", user.uid);

        const userSnap =
            await getDoc(userRef);


        if (!userSnap.exists()) {

            alert("Your Ziba profile was not found.");
            return;

        }


        const userData =
            userSnap.data();


        alert(
            "Welcome " +
            (userData.fullName || "to Ziba!")
        );


        /* Send user to correct dashboard */

        if (userData.accountType === "seller") {

            window.location.href =
                "seller-dashboard.html";

        } else if (userData.accountType === "buyer") {

            window.location.href =
                "buyer-dashboard.html";

        } else {

            window.location.href =
                "index.html";

        }

    } catch (error) {

        console.error("Login error:", error);

        alert(error.message);

    }

});