import { auth, db } from "./firebase-config.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


const params =
    new URLSearchParams(window.location.search);

const productId =
    params.get("id");


// ==========================================
// ELEMENTS
// ==========================================

const productImage =
    document.getElementById("productImage");

const productName =
    document.getElementById("productName");

const productPrice =
    document.getElementById("productPrice");

const payBtn =
    document.getElementById("payBtn");


// ==========================================
// VARIABLES
// ==========================================

let product = null;

let orderId = null;


// ==========================================
// BACKEND
// ==========================================

const BACKEND_URL =
    "https://ziba-backend-wkzv.onrender.com";


// ==========================================
// LOAD PRODUCT
// ==========================================

async function loadProduct() {

    if (!productId) {

        productName.textContent =
            "Product not found.";

        return;

    }


    try {

        const productRef =
            doc(
                db,
                "products",
                productId
            );


        const productSnap =
            await getDoc(productRef);


        if (!productSnap.exists()) {

            productName.textContent =
                "Product not found.";

            return;

        }


        product =
            productSnap.data();


        // ==================================
        // IMAGE
        // ==================================

        productImage.src =
            product.imageUrls?.[0] ||
            "https://via.placeholder.com/300x220?text=No+Image";


        // ==================================
        // NAME
        // ==================================

        productName.textContent =
            product.productName ||
            "Unnamed Product";


        // ==================================
        // PRICE
        // ==================================

        productPrice.textContent =
            `₦${Number(
                product.price || 0
            ).toLocaleString()}`;


        console.log(
            "Checkout product loaded:",
            product
        );

    }

    catch (error) {

        console.error(
            "Checkout product error:",
            error
        );


        productName.textContent =
            "Unable to load product.";

    }

}


// ==========================================
// CREATE ORDER
// ==========================================

payBtn.addEventListener(
    "click",
    async () => {

        // ==================================
        // CHECK LOGIN
        // ==================================

        const currentUser =
            auth.currentUser;


        if (!currentUser) {

            alert(
                "Please login before placing an order."
            );

            return;

        }


        // ==================================
        // BUYER INFORMATION
        // ==================================

        const buyerName =
            document
                .getElementById("buyerName")
                .value
                .trim();


        const buyerEmail =
            document
                .getElementById("buyerEmail")
                .value
                .trim();


        const buyerId =
            currentUser.uid;


        // ==================================
        // SELLER
        // ==================================

        const sellerId =
            product?.sellerId;


        // ==================================
        // VALIDATION
        // ==================================

        if (
            !buyerName ||
            !buyerEmail
        ) {

            alert(
                "Please enter your name and email."
            );

            return;

        }


        if (!product) {

            alert(
                "Product is still loading. Please try again."
            );

            return;

        }


        if (!sellerId) {

            alert(
                "This product does not have a seller."
            );

            return;

        }


        const amount =
            Number(product.price);


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {

            alert(
                "Invalid product price."
            );

            return;

        }


        // ==================================
        // DISABLE BUTTON
        // ==================================

        payBtn.disabled =
            true;

        payBtn.textContent =
            "Creating Order...";


        try {

            // ==================================
            // SEND ORDER TO BACKEND
            // ==================================

            const response =
                await fetch(

                    `${BACKEND_URL}/api/payment/order`,

                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                buyerId,

                                buyerName,

                                buyerEmail,

                                sellerId,

                                productId,

                                productName:
                                    product.productName,

                                amount

                            })

                    }

                );


            const data =
                await response.json();


            console.log(
                "Create order response:",
                data
            );


            // ==================================
            // FAILED
            // ==================================

            if (!response.ok || !data.status) {

                alert(

                    data.message ||
                    "Unable to create order."

                );


                payBtn.disabled =
                    false;

                payBtn.textContent =
                    "Buy Now";


                return;

            }


            // ==================================
            // SAVE ORDER ID
            // ==================================

            orderId =
                data.orderId;


            // ==================================
            // SHOW PAYMENT DETAILS
            // ==================================

            showPaymentDetails(
                data
            );


        }

        catch (error) {

            console.error(
                "Create order error:",
                error
            );


            alert(
                "Unable to connect to Ziba server."
            );


            payBtn.disabled =
                false;

            payBtn.textContent =
                "Buy Now";

        }

    }
);


// ==========================================
// SHOW PAYMENT DETAILS
// ==========================================

function showPaymentDetails(data) {

    const payment =
        data.paymentDetails;


    // ==================================
    // REMOVE OLD PAYMENT BOX
    // ==================================

    const oldBox =
        document.getElementById(
            "paymentDetailsBox"
        );


    if (oldBox) {

        oldBox.remove();

    }


    // ==================================
    // CREATE PAYMENT BOX
    // ==================================

    const box =
        document.createElement(
            "div"
        );


    box.id =
        "paymentDetailsBox";


    box.innerHTML = `

        <div class="payment-box">

            <h3>
                Make Payment
            </h3>

            <p>
                Transfer the exact amount below
                to the seller's account.
            </p>


            <div class="payment-row">

                <span>
                    Amount
                </span>

                <strong>
                    ₦${Number(
                        payment.amount
                    ).toLocaleString()}
                </strong>

            </div>


            <div class="payment-row">

                <span>
                    Bank
                </span>

                <strong>
                    ${payment.bankName || "Not provided"}
                </strong>

            </div>


            <div class="payment-row">

                <span>
                    Account Name
                </span>

                <strong>
                    ${payment.accountName || "Not provided"}
                </strong>

            </div>


            <div class="payment-row">

                <span>
                    Account Number
                </span>

                <strong>
                    ${payment.accountNumber || "Not provided"}
                </strong>

            </div>


            <p class="payment-warning">

                ⚠️ Make sure you transfer the exact amount
                before confirming payment.

            </p>


            <button
                id="confirmBuyerPaymentBtn"
                type="button"
            >
                I've Made Payment
            </button>

        </div>

    `;


    // ==================================
    // INSERT AFTER PAY BUTTON
    // ==================================

    payBtn.parentElement.appendChild(
        box
    );


    // ==================================
    // HIDE ORIGINAL BUTTON
    // ==================================

    payBtn.style.display =
        "none";


    // ==================================
    // BUYER CONFIRM BUTTON
    // ==================================

    document
        .getElementById(
            "confirmBuyerPaymentBtn"
        )
        .addEventListener(
            "click",
            confirmBuyerPayment
        );

}


// ==========================================
// BUYER CONFIRM PAYMENT
// ==========================================

async function confirmBuyerPayment() {

    const currentUser =
        auth.currentUser;


    if (!currentUser) {

        alert(
            "Please login again."
        );

        return;

    }


    if (!orderId) {

        alert(
            "Order ID is missing."
        );

        return;

    }


    const confirmBtn =
        document.getElementById(
            "confirmBuyerPaymentBtn"
        );


    confirmBtn.disabled =
        true;

    confirmBtn.textContent =
        "Submitting...";


    try {

        const response =
            await fetch(

                `${BACKEND_URL}/api/payment/order/buyer-confirm`,

                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            orderId,

                            buyerId:
                                currentUser.uid

                        })

                }

            );


        const data =
            await response.json();


        console.log(
            "Buyer confirmation:",
            data
        );


        if (
            !response.ok ||
            !data.status
        ) {

            alert(

                data.message ||
                "Unable to submit payment."

            );


            confirmBtn.disabled =
                false;

            confirmBtn.textContent =
                "I've Made Payment";


            return;

        }


        // ==================================
        // SUCCESS
        // ==================================

        confirmBtn.textContent =
            "Payment Submitted ✓";


        confirmBtn.disabled =
            true;


        alert(
            "Payment submitted successfully. The seller will verify your payment."
        );


    }

    catch (error) {

        console.error(
            "Buyer confirmation error:",
            error
        );


        alert(
            "Unable to contact Ziba server."
        );


        confirmBtn.disabled =
            false;

        confirmBtn.textContent =
            "I've Made Payment";

    }

}


// ==========================================
// LOAD
// ==========================================

loadProduct();