import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


// ==========================================
// ELEMENTS
// ==========================================

const bankForm =
    document.getElementById("bankForm");

const bankName =
    document.getElementById("bankName");

const accountName =
    document.getElementById("accountName");

const accountNumber =
    document.getElementById("accountNumber");

const saveBtn =
    document.getElementById("saveBankBtn");

const statusMessage =
    document.getElementById("statusMessage");


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
        "Bank settings user:",
        currentUser.uid
    );


    await loadBankDetails();

});


// ==========================================
// LOAD BANK DETAILS
// ==========================================

async function loadBankDetails() {

    try {

        const payoutRef =
            doc(
                db,
                "payoutSettings",
                currentUser.uid
            );


        const payoutSnap =
            await getDoc(payoutRef);


        if (!payoutSnap.exists()) {

            console.log(
                "No bank details saved yet."
            );

            return;

        }


        const data =
            payoutSnap.data();


        if (bankName) {

            bankName.value =
                data.bankName || "";

        }


        if (accountName) {

            accountName.value =
                data.accountName || "";

        }


        if (accountNumber) {

            accountNumber.value =
                data.accountNumber || "";

        }


        console.log(
            "Bank details loaded."
        );


    } catch (error) {

        console.error(
            "Load bank details error:",
            error
        );

        showStatus(
            "Unable to load your bank details.",
            "error"
        );

    }

}


// ==========================================
// SAVE BANK DETAILS
// ==========================================

if (bankForm) {

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


            const selectedBank =
                bankName.value.trim();

            const selectedAccountName =
                accountName.value.trim();

            const selectedAccountNumber =
                accountNumber.value.trim();


            // ==========================================
            // VALIDATION
            // ==========================================

            if (!selectedBank) {

                showStatus(
                    "Please select your bank.",
                    "error"
                );

                return;

            }


            if (!selectedAccountName) {

                showStatus(
                    "Please enter the account name.",
                    "error"
                );

                return;

            }


            if (!selectedAccountNumber) {

                showStatus(
                    "Please enter your account number.",
                    "error"
                );

                return;

            }


            if (
                !/^\d{10}$/.test(
                    selectedAccountNumber
                )
            ) {

                showStatus(
                    "Account number must be exactly 10 digits.",
                    "error"
                );

                return;

            }


            try {

                saveBtn.disabled = true;

                saveBtn.textContent =
                    "Saving...";


                const payoutRef =
                    doc(
                        db,
                        "payoutSettings",
                        currentUser.uid
                    );


                await setDoc(
                    payoutRef,
                    {

                        userId:
                            currentUser.uid,

                        bankName:
                            selectedBank,

                        accountName:
                            selectedAccountName,

                        accountNumber:
                            selectedAccountNumber,

                        updatedAt:
                            serverTimestamp()

                    },
                    {
                        merge: true
                    }
                );


                showStatus(
                    "Bank details saved successfully.",
                    "success"
                );


                console.log(
                    "Bank details saved."
                );


            } catch (error) {

                console.error(
                    "Save bank details error:",
                    error
                );


                showStatus(
                    "Unable to save bank details. Please try again.",
                    "error"
                );


            } finally {

                saveBtn.disabled =
                    false;

                saveBtn.textContent =
                    "Save Bank Details";

            }

        }
    );

}


// ==========================================
// STATUS MESSAGE
// ==========================================

function showStatus(
    message,
    type
) {

    if (!statusMessage) {
        return;
    }


    statusMessage.textContent =
        message;


    statusMessage.className =
        `status-message ${type}`;


    setTimeout(
        () => {

            statusMessage.textContent =
                "";

            statusMessage.className =
                "status-message";

        },
        5000
    );

}