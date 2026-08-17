
import { app } from "./firebase.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    getFirestore,
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


// ==========================================
// FIREBASE
// ==========================================

const auth = getAuth(app);
const db = getFirestore(app);


// ==========================================
// PAYSTACK PUBLIC KEY
// ==========================================

const PAYSTACK_PUBLIC_KEY =
    "YOUR_PAYSTACK_PUBLIC_KEY";


// ==========================================
// CURRENT USER
// ==========================================

let currentUser = null;


// ==========================================
// CHECK LOGIN
// ==========================================

onAuthStateChanged(auth, (user) => {

    if (!user) {

        window.location.href = "login.html";

        return;

    }

    currentUser = user;

});


// ==========================================
// PLAN BUTTONS
// ==========================================

const upgradeButtons =
    document.querySelectorAll(".upgrade-btn");


// ==========================================
// PLAN INFORMATION
// ==========================================

const plans = {

    pro: {

        name: "Ziba Pro",

        price: 5000,

        duration: "monthly"

    },

    business: {

        name: "Ziba Business",

        price: 15000,

        duration: "monthly"

    }

};


// ==========================================
// BUTTON CLICK
// ==========================================

upgradeButtons.forEach((button) => {

    button.addEventListener("click", () => {

        const planId =
            button.dataset.plan;

        const plan =
            plans[planId];


        if (!plan) {

            alert(
                "Invalid upgrade plan."
            );

            return;

        }


        startPayment(
            button,
            planId,
            plan
        );

    });

});


// ==========================================
// START PAYMENT
// ==========================================

function startPayment(
    button,
    planId,
    plan
) {

    if (!currentUser) {

        alert(
            "Please log in before upgrading your account."
        );

        window.location.href =
            "login.html";

        return;

    }


    if (
        PAYSTACK_PUBLIC_KEY ===
        "YOUR_PAYSTACK_PUBLIC_KEY"
    ) {

        alert(
            "Please add your Paystack public key to upgrade.js."
        );

        return;

    }


    // Disable button

    button.disabled = true;

    button.classList.add("loading");

    button.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        Opening payment...
    `;


    // ==========================================
    // PAYSTACK
    // ==========================================

    const paystack =
        new PaystackPop();


    paystack.newTransaction({

        key:
            PAYSTACK_PUBLIC_KEY,

        email:
            currentUser.email,

        amount:
            plan.price * 100,

        currency:
            "NGN",

        metadata: {

            userId:
                currentUser.uid,

            plan:
                planId,

            planName:
                plan.name,

            duration:
                plan.duration

        },


        // ==========================================
        // SUCCESS
        // ==========================================

        onSuccess:
            async (transaction) => {

                console.log(
                    "Upgrade payment successful:",
                    transaction
                );


                try {

                    // ==================================
                    // UPDATE USER ACCOUNT
                    // ==================================

                    const userRef =
                        doc(
                            db,
                            "users",
                            currentUser.uid
                        );


                    await updateDoc(
                        userRef,
                        {

                            accountPlan:
                                planId,

                            planName:
                                plan.name,

                            planPrice:
                                plan.price,

                            planDuration:
                                plan.duration,

                            planStatus:
                                "active",

                            upgradePaymentReference:
                                transaction.reference,

                            upgradedAt:
                                serverTimestamp()

                        }
                    );


                    // ==================================
                    // SUCCESS MESSAGE
                    // ==================================

                    alert(
                        `Congratulations! 🎉

Your account has been upgraded to ${plan.name}.`
                    );


                    // ==================================
                    // REDIRECT
                    // ==================================

                    window.location.href =
                        "profile.html";


                } catch (error) {

                    console.error(
                        "Account upgrade error:",
                        error
                    );


                    alert(
                        "Payment was successful, but your account could not be updated. Payment reference: " +
                        transaction.reference
                    );


                    resetButton(button);

                }

            },


        // ==========================================
        // PAYMENT LOADED
        // ==========================================

        onLoad:
            () => {

                button.innerHTML = `
                    <i class="fas fa-credit-card"></i>
                    Complete Payment
                `;

            },


        // ==========================================
        // CANCELLED
        // ==========================================

        onCancel:
            () => {

                alert(
                    "Upgrade payment was cancelled."
                );

                resetButton(button);

            },


        // ==========================================
        // ERROR
        // ==========================================

        onError:
            (error) => {

                console.error(
                    "Paystack upgrade error:",
                    error
                );

                alert(
                    "Payment failed. Please try again."
                );

                resetButton(button);

            }

    });

}


// ==========================================
// RESET BUTTON
// ==========================================

function resetButton(button) {

    button.disabled = false;

    button.classList.remove("loading");


    const planId =
        button.dataset.plan;


    if (planId === "pro") {

        button.innerHTML =
            "Upgrade to Pro";

    }

    else if (planId === "business") {

        button.innerHTML =
            "Upgrade to Business";

    }

}