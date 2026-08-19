import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


// ==========================================
// ZIBA BACKEND
// ==========================================

const BACKEND_URL =
    "https://ziba-backend-wkzv.onrender.com";


// ==========================================
// ELEMENTS
// ==========================================

const withdrawForm =
    document.getElementById("withdrawForm");

const balanceElement =
    document.getElementById("balance");

const amountInput =
    document.getElementById("amount");

const bankCodeInput =
    document.getElementById("bankCode");

const accountNumberInput =
    document.getElementById("accountNumber");

const withdrawButton =
    withdrawForm.querySelector("button");


// ==========================================
// VARIABLES
// ==========================================

let currentUser = null;

let availableBalance = 0;


// ==========================================
// AUTH
// ==========================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href =
            "login.html";

        return;

    }

    currentUser = user;

    console.log(
        "Withdraw user:",
        currentUser.uid
    );

    await loadBalance();

});


// ==========================================
// LOAD USER BALANCE
// ==========================================

async function loadBalance() {

    try {

        const userRef =
            doc(
                db,
                "users",
                currentUser.uid
            );


        const userSnap =
            await getDoc(userRef);


        if (!userSnap.exists()) {

            availableBalance = 0;

            updateBalance();

            return;

        }


        const userData =
            userSnap.data();


        availableBalance =
            Number(
                userData.availableBalance ??
                userData.walletBalance ??
                userData.balance ??
                0
            );


        updateBalance();


    } catch (error) {

        console.error(
            "Balance loading error:",
            error
        );


        balanceElement.textContent =
            "₦0";


        alert(
            "Unable to load your balance."
        );

    }

}


// ==========================================
// UPDATE BALANCE DISPLAY
// ==========================================

function updateBalance() {

    balanceElement.textContent =
        `₦${availableBalance.toLocaleString(
            "en-NG"
        )}`;

}


// ==========================================
// ACCOUNT NUMBER VALIDATION
// ==========================================

accountNumberInput.addEventListener(
    "input",
    () => {

        accountNumberInput.value =
            accountNumberInput.value
                .replace(/\D/g, "")
                .slice(0, 10);

    }
);


// ==========================================
// AMOUNT VALIDATION
// ==========================================

amountInput.addEventListener(
    "input",
    () => {

        const amount =
            Number(
                amountInput.value
            );


        if (
            amount > availableBalance
        ) {

            amountInput.setCustomValidity(
                "Amount is greater than your available balance."
            );

        } else {

            amountInput.setCustomValidity("");

        }

    }
);


// ==========================================
// WITHDRAW FORM
// ==========================================

withdrawForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        // ======================================
        // AUTH CHECK
        // ======================================

        if (!currentUser) {

            alert(
                "Please login first."
            );

            return;

        }


        // ======================================
        // GET VALUES
        // ======================================

        const amount =
            Number(
                amountInput.value
            );


        const bankCode =
            bankCodeInput.value;


        const accountNumber =
            accountNumberInput.value.trim();


        // ======================================
        // VALIDATE AMOUNT
        // ======================================

        if (
            !amount ||
            amount < 100
        ) {

            alert(
                "Minimum withdrawal amount is ₦100."
            );

            return;

        }


        // ======================================
        // CHECK BALANCE
        // ======================================

        if (
            amount > availableBalance
        ) {

            alert(
                "You do not have enough balance."
            );

            return;

        }


        // ======================================
        // CHECK BANK
        // ======================================

        if (!bankCode) {

            alert(
                "Please select your bank."
            );

            return;

        }


        // ======================================
        // CHECK ACCOUNT NUMBER
        // ======================================

        if (
            !/^\d{10}$/.test(
                accountNumber
            )
        ) {

            alert(
                "Please enter a valid 10-digit account number."
            );

            return;

        }


        // ======================================
        // CONFIRM WITHDRAWAL
        // ======================================

        const confirmed =
            confirm(
                `Are you sure you want to withdraw ₦${amount.toLocaleString(
                    "en-NG"
                )}?`
            );


        if (!confirmed) {

            return;

        }


        // ======================================
        // DISABLE BUTTON
        // ======================================

        withdrawButton.disabled =
            true;


        withdrawButton.textContent =
            "Processing...";


        try {

            console.log(
                "Sending withdrawal request..."
            );


            // ==================================
            // SEND TO ZIBA BACKEND
            // ==================================

            const response =
                await fetch(
                    `${BACKEND_URL}/api/withdraw`,
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body: JSON.stringify({

                            userId:
                                currentUser.uid,

                            email:
                                currentUser.email,

                            amount:
                                amount,

                            bankCode:
                                bankCode,

                            accountNumber:
                                accountNumber

                        })

                    }
                );


            // ==================================
            // READ RESPONSE
            // ==================================

            let data;


            try {

                data =
                    await response.json();

            } catch {

                data = {};

            }


            // ==================================
            // BACKEND ERROR
            // ==================================

            if (
                !response.ok
            ) {

                throw new Error(
                    data.message ||
                    `Withdrawal failed (${response.status}).`
                );

            }


            // ==================================
            // SUCCESS
            // ==================================

            console.log(
                "Withdrawal response:",
                data
            );


            alert(
                data.message ||
                "Withdrawal request submitted successfully."
            );


            // ==================================
            // RETURN TO DASHBOARD
            // ==================================

            window.location.href =
                "seller-dashboard.html";


        } catch (error) {

            console.error(
                "Withdrawal error:",
                error
            );


            alert(
                error.message ||
                "Unable to process withdrawal. Please try again."
            );


        } finally {

            withdrawButton.disabled =
                false;


            withdrawButton.textContent =
                "Withdraw";

        }

    }
);