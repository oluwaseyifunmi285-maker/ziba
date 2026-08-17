// success.js

// Get the payment reference from the URL
const params = new URLSearchParams(window.location.search);

const reference = params.get("reference");

const referenceElement = document.getElementById("reference");

if (reference) {

    referenceElement.textContent = "Payment Reference: " + reference;

} else {

    referenceElement.textContent = "No payment reference found.";

}

// This is where we'll verify the payment later
async function verifyPayment() {

    if (!reference) return;

    try {

        // We'll replace this with your backend URL later
        console.log("Verifying payment:", reference);

        // Example:
        // const response = await fetch("http://localhost:3000/verify-payment", {
        //     method: "POST",
        //     headers: {
        //         "Content-Type": "application/json"
        //     },
        //     body: JSON.stringify({
        //         reference
        //     })
        // });

    } catch (error) {

        console.error(error);

    }

}

verifyPayment();