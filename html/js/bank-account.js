
import { auth } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


// ==========================================
// ZIBA BACKEND
// ==========================================

const BACKEND_URL =
    "https://ziba-backend-wkzv.onrender.com";


// ==========================================
// ELEMENTS
// ==========================================

const bankForm =
    document.getElementById("bankForm");

const bankCodeInput =
    document.getElementById("bankCode");

const accountNumberInput =
    document.getElementById("accountNumber");

const accountNameBox =
    document.getElementById("accountNameBox");

const accountName =
    document.getElementById("accountName");

const statusMessage =
    document.getElementById("statusMessage");

const saveBankBtn =
    document.getElementById("saveBankBtn");


// ==========================================
// CURRENT USER
// ==========================================

let currentUser = null;


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
        "Bank account user:",
        currentUser.uid
    );

    await loadBankAccount();

});


// ==========================================
// LOAD EXISTING BANK ACCOUNT
// ==========================================

async function loadBankAccount() {

    try {

        setStatus(
            "Loading bank account...",
            "normal"
        );

        const response =
            await fetch(
                `${BACKEND_URL}/api/bank-account/${currentUser.uid}`
            );

        const data =
            await response.json();

        if (!response.ok) {

            if (response.status === 404) {

                setStatus(
                    "No bank account connected yet.",
                    "normal"
                );

                return;
            }

            throw new Error(
                data.message ||
                "Unable to load bank account."
            );
        }


        // ==================================
        // DISPLAY SAVED ACCOUNT
        // ==================================

        if (data.bankCode) {

            bankCodeInput.value =
                data.bankCode;

        }


        if (data.accountNumber) {

            accountNumberInput.value =
                data.accountNumber;

        }


        if (data.accountName) {

            accountName.textContent =
                data.accountName;

            accountNameBox.style.display =
                "block";

        }


        setStatus(
            "Your bank account is connected.",
            "success"
        );


        saveBankBtn.innerHTML =
            '<i class="fas fa-check"></i> Bank Account Connected';


    } catch (error) {

        console.error(
            "Load bank account error:",
            error
        );

        setStatus(
            "Unable to load your bank account.",
            "error"
        );

    }

}


// ==========================================
// ACCOUNT NUMBER INPUT
// ==========================================

accountNumberInput.addEventListener(
    "input",
    () => {

        accountNumberInput.value =
            accountNumberInput.value
                .replace(/\D/g, "")
                .slice(0, 10);

        accountNameBox.style.display =
            "none";

        accountName.textContent =
            "-";

    }
);


// ==========================================
// VERIFY BANK ACCOUNT
// ==========================================

async function verifyBankAccount() {

    const bankCode =
        bankCodeInput.value;

    const accountNumber =
        accountNumberInput.value.trim();


    if (!bankCode) {

        throw new Error(
            "Please select your bank."
        );

    }


    if (
        !/^\d{10}$/.test(
            accountNumber
        )
    ) {

        throw new Error(
            "Please enter a valid 10-digit account number."
        );

    }


    setStatus(
        "Verifying bank account...",
        "normal"
    );


    const response =
        await fetch(
            `${BACKEND_URL}/api/bank-account/verify`,
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

                    bankCode:
                        bankCode,

                    accountNumber:
                        accountNumber

                })

            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.message ||
            "Unable to verify bank account."
        );

    }


    // ==================================
    // SHOW ACCOUNT NAME
    // ==================================

    accountName.textContent =
        data.accountName ||
        "Account verified";


    accountNameBox.style.display =
        "block";


    setStatus(
        "Bank account verified successfully.",
        "success"
    );


    return data;

}


// ==========================================
// FORM SUBMIT
// ==========================================

bankForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        if (!currentUser) {

            alert(
                "Please login first."
            );

            return;

        }


        saveBankBtn.disabled =
            true;


        saveBankBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Verifying...';


        try {

            await verifyBankAccount();


            saveBankBtn.innerHTML =
                '<i class="fas fa-check"></i> Bank Account Connected';


            setStatus(
                "Your bank account has been connected successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "Bank account error:",
                error
            );


            setStatus(
                error.message ||
                "Unable to connect bank account.",
                "error"
            );


            saveBankBtn.innerHTML =
                '<i class="fas fa-lock"></i> Save Bank Account';


        } finally {

            saveBankBtn.disabled =
                false;

        }

    }
);


// ==========================================
// STATUS MESSAGE
// ==========================================

function setStatus(
    message,
    type = "normal"
) {

    statusMessage.textContent =
        message;


    statusMessage.style.color =
        type === "success"
            ? "#16803c"
            : type === "error"
                ? "#d62828"
                : "#777";

}
