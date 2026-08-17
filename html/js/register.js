import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


const form = document.getElementById("signupForm");


if (!form) {
    console.error("signupForm was not found.");
} else {

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const fullName =
            document.getElementById("fullName").value.trim();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const accountType =
            document.getElementById("accountType").value;


        if (!fullName || !email || !password || !accountType) {
            alert("Please fill in all required fields.");
            return;
        }


        try {

            console.log("Creating Firebase account...");

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user = userCredential.user;

            console.log("Firebase account created:", user.uid);


            await setDoc(
                doc(db, "users", user.uid),
                {
                    uid: user.uid,
                    fullName: fullName,
                    email: email,
                    accountType: accountType,

                    plan:
                        accountType === "seller"
                            ? "free"
                            : null,

                    dailyLimit:
                        accountType === "seller"
                            ? 3
                            : null,

                    createdAt: serverTimestamp()
                }
            );


            console.log("Firestore profile created successfully.");

            // GO DIRECTLY TO LOGIN
            window.location.replace("./login.html");

        } catch (error) {

            console.error("SIGNUP ERROR:", error);

            alert(
                "Signup error: " +
                error.message
            );

        }

    });

}