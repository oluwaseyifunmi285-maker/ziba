import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


let currentUser = null;

let selectedPlan = null;
let selectedPrice = 0;
let selectedDuration = 0;


// ==========================================
// BANK DETAILS
// ==========================================

const BANK_NAME = "GTBank";

const ACCOUNT_NAME = "Ziba Technologies";

const ACCOUNT_NUMBER = "0123456789";


// ==========================================
// ELEMENTS
// ==========================================

const modal =
    document.getElementById("paymentModal");

const closePayment =
    document.getElementById("closePayment");

const paymentForm =
    document.getElementById("paymentForm");

const paymentAmount =
    document.getElementById("paymentAmount");

const senderName =
    document.getElementById("senderName");

const transferReference =
    document.getElementById("transferReference");


// ==========================================
// AUTH
// ==========================================

onAuthStateChanged(auth, (user) => {

    if (!user) {

        window.location.href = "login.html";

        return;
    }

    currentUser = user;

    console.log(
        "Upgrade user:",
        currentUser.uid
    );

});


// ==========================================
// UPGRADE BUTTONS
// ==========================================

document
    .querySelectorAll(".upgrade-btn")
    .forEach((button) => {

        button.addEventListener("click", () => {

            selectedPlan =
                button.dataset.plan;

            selectedPrice =
                Number(button.dataset.price);

            selectedDuration =
                Number(button.dataset.duration);


            paymentAmount.textContent =
                `₦${selectedPrice.toLocaleString()}`;


            modal.classList.add("show");

        });

    });


// ==========================================
// CLOSE MODAL
// ==========================================

closePayment.addEventListener("click", () => {

    modal.classList.remove("show");

});


// ==========================================
// CLICK OUTSIDE
// ==========================================

modal.addEventListener("click", (event) => {

    if (event.target === modal) {

        modal.classList.remove("show");

    }

});


// ==========================================
// PAYMENT SUBMISSION
// ==========================================

paymentForm.addEventListener("submit", async (event) => {

    event.preventDefault();


    if (!currentUser) {

        alert("Please login first.");

        return;

    }


    const sender =
        senderName.value.trim();

    const reference =
        transferReference.value.trim();


    if (!sender || !reference) {

        alert(
            "Please enter your transfer name and reference."
        );

        return;

    }


    const submitButton =
        document.getElementById("submitPayment");


    try {

        submitButton.disabled = true;

        submitButton.textContent =
            "Submitting...";


        const paymentData = {

            userId:
                currentUser.uid,

            email:
                currentUser.email,

            type:
                "upgrade",

            plan:
                selectedPlan,

            amount:
                selectedPrice,

            duration:
                selectedDuration,

            senderName:
                sender,

            transferReference:
                reference,

            bankName:
                BANK_NAME,

            accountName:
                ACCOUNT_NAME,

            accountNumber:
                ACCOUNT_NUMBER,

            status:
                "pending",

            createdAt:
                serverTimestamp()

        };


        await addDoc(
            collection(db, "payments"),
            paymentData
        );


        alert(
            "Payment submitted successfully. Ziba will verify your transfer."
        );


        paymentForm.reset();

        modal.classList.remove("show");


    } catch (error) {

        console.error(
            "Payment submission error:",
            error
        );

        alert(
            "Unable to submit payment. Please try again."
        );

    } finally {

        submitButton.disabled = false;

        submitButton.textContent =
            "I Have Made The Transfer";

    }

});