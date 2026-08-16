import { auth } from "./firebase-config.js";

const params = new URLSearchParams(window.location.search);
const reference = params.get("reference");

const message = document.querySelector("p");

async function verifyPayment() {

    if (!reference) {
        message.textContent = "Payment reference not found.";
        return;
    }

    try {

        const response = await fetch(
            `http://localhost:3000/api/payment/verify/${reference}`
        );

        const data = await response.json();

        console.log("Verification response:", data);

        if (data.status) {

            message.textContent =
                "Payment confirmed! Your order has been created.";

            console.log("Order ID:", data.orderId);

        } else {

            message.textContent =
                data.message || "Payment could not be verified.";

        }

    } catch (error) {

        console.error("Verification error:", error);

        message.textContent =
            "Unable to verify payment. Please try again.";

    }
}

verifyPayment();