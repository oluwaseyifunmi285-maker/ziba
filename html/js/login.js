import { auth, db } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


const form = document.getElementById("loginForm");
const password = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const forgotPassword = document.getElementById("forgotPassword");


/* ==========================================
   SHOW / HIDE PASSWORD
========================================== */

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


/* ==========================================
   FORGOT PASSWORD
========================================== */

if (forgotPassword) {

    forgotPassword.addEventListener("click", async (e) => {

        e.preventDefault();

        const emailInput = document.getElementById("email");

        const email = emailInput.value.trim();


        /* Check if email was entered */

        if (!email) {

            alert("Please enter your email address first.");

            emailInput.focus();

            return;

        }


        try {

            await sendPasswordResetEmail(auth, email);

            alert(
                "Password reset email sent!\n\n" +
                "Please check your email inbox and follow the instructions to create a new password."
            );

        } catch (error) {

            console.error(
                "Password reset error:",
                error
            );


            if (error.code === "auth/invalid-email") {

                alert(
                    "Please enter a valid email address."
                );

            } else if (
                error.code === "auth/user-not-found"
            ) {

                alert(
                    "No Ziba account was found with this email address."
                );

            } else if (
                error.code === "auth/too-many-requests"
            ) {

                alert(
                    "Too many password reset attempts. Please wait a while and try again."
                );

            } else {

                alert(
                    "Unable to send the password reset email. Please try again."
                );

            }

        }

    });

}


/* ==========================================
   LOGIN
========================================== */

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


        /* ==========================================
           GET ZIBA PROFILE
        ========================================== */

        const userRef =
            doc(db, "users", user.uid);

        const userSnap =
            await getDoc(userRef);


        if (!userSnap.exists()) {

            alert(
                "Your Ziba profile was not found."
            );

            return;

        }


        const userData =
            userSnap.data();


        alert(
            "Welcome " +
            (userData.fullName || "to Ziba!")
        );


        /* ==========================================
           SEND USER TO CORRECT DASHBOARD
        ========================================== */

        if (userData.role === "admin") {

            window.location.href =
                "admin-dashboard.html";

        } else if (
            userData.accountType === "seller"
        ) {

            window.location.href =
                "seller-dashboard.html";

        } else if (
            userData.accountType === "buyer"
        ) {

            window.location.href =
                "buyer-dashboard.html";

        } else {

            window.location.href =
                "index.html";

        }


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        /* Friendly Firebase error messages */

        if (
            error.code === "auth/invalid-credential"
        ) {

            alert(
                "Incorrect email or password. Please check your details or use Forgot Password."
            );

        } else if (
            error.code === "auth/invalid-email"
        ) {

            alert(
                "Please enter a valid email address."
            );

        } else if (
            error.code === "auth/too-many-requests"
        ) {

            alert(
                "Too many login attempts. Please wait a while and try again."
            );

        } else {

            alert(
                "Unable to log in. Please try again."
            );

        }

    }

});