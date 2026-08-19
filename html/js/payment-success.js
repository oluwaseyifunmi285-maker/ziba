import { auth } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


const API_URL =
    "https://ziba-backend-wkzv.onrender.com";


onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        const params =
            new URLSearchParams(
                window.location.search
            );


        const reference =
            params.get("reference") ||
            params.get("trxref");


        if (!reference) {

            console.error(
                "No payment reference found."
            );

            alert(
                "Payment reference not found."
            );

            window.location.href =
                "dashboard.html";

            return;

        }


        await verifyPayment(
            reference
        );

    }
);


// ==========================================
// VERIFY PAYMENT
// ==========================================

async function verifyPayment(
    reference
) {

    try {

        const response =
            await fetch(

                `${API_URL}/api/payment/verify/${encodeURIComponent(reference)}`

            );


        const data =
            await response.json();


        console.log(
            "Verification response:",
            data
        );


        if (!response.ok ||
            !data.status) {

            throw new Error(
                data.message ||
                "Payment verification failed."
            );

        }


        // ==================================
        // UPGRADE PAYMENT
        // ==================================

        if (
            data.paymentType ===
            "upgrade"
        ) {

            console.log(
                "Plan activated:",
                data.plan
            );


            alert(
                `Payment successful! Your ${formatPlan(data.plan)} plan is now active.`
            );


            // Go back to dashboard

            window.location.href =
                "dashboard.html";


            return;

        }


        // ==================================
        // PRODUCT PAYMENT
        // ==================================

        if (
            data.paymentType ===
            "product"
        ) {

            console.log(
                "Order ID:",
                data.orderId
            );


            alert(
                "Payment successful! Your order has been created."
            );


            window.location.href =
                "dashboard.html";


            return;

        }


        // ==================================
        // FALLBACK
        // ==================================

        alert(
            "Payment successful!"
        );


        window.location.href =
            "dashboard.html";


    } catch (error) {

        console.error(
            "Payment verification error:",
            error
        );


        alert(
            error.message ||
            "Unable to verify payment."
        );

    }

}


// ==========================================
// FORMAT PLAN
// ==========================================

function formatPlan(
    plan
) {

    switch (plan) {

        case "daily":
            return "1 Day";

        case "weekly":
            return "1 Week";

        case "monthly":
            return "1 Month";

        default:
            return "Premium";

    }

}