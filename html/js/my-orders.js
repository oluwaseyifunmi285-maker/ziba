
import { auth, db } from "./firebase-config.js";

import {
    collection,
    query,
    where,
    getDocs,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


const ordersContainer =
    document.getElementById("ordersContainer");


// ==========================================
// LOAD MY ORDERS
// ==========================================

async function loadMyOrders() {

    const user = auth.currentUser;


    if (!user) {

        ordersContainer.innerHTML =
            "<p>Please log in to view your orders.</p>";

        return;
    }


    try {

        const ordersRef =
            collection(db, "orders");


        const q = query(

            ordersRef,

            where(
                "buyerId",
                "==",
                user.uid
            ),

            orderBy(
                "createdAt",
                "desc"
            )

        );


        const snapshot =
            await getDocs(q);


        // ==================================
        // NO ORDERS
        // ==================================

        if (snapshot.empty) {

            ordersContainer.innerHTML =
                "<p>You have no orders yet.</p>";

            return;

        }


        ordersContainer.innerHTML = "";


        snapshot.forEach((orderDoc) => {

            const order =
                orderDoc.data();


            // ==================================
            // PAYMENT STATUS
            // ==================================

            const paymentStatus =
                order.paymentStatus ||
                "awaiting_payment";


            // ==================================
            // ORDER STATUS
            // ==================================

            const orderStatus =
                order.orderStatus ||
                "pending";


            // ==================================
            // PAYMENT MESSAGE
            // ==================================

            let paymentMessage = "";


            if (
                paymentStatus ===
                "awaiting_payment"
            ) {

                paymentMessage = `
                    <span class="payment-pending">
                        Awaiting Payment
                    </span>
                `;

            }


            else if (
                paymentStatus ===
                "buyer_confirmed"
            ) {

                paymentMessage = `
                    <span class="payment-submitted">
                        Payment Submitted
                    </span>

                    <small>
                        Waiting for seller confirmation.
                    </small>
                `;

            }


            else if (
                paymentStatus ===
                "seller_confirmed"
            ) {

                paymentMessage = `
                    <span class="payment-submitted">
                        Seller Confirmed Payment ✓
                    </span>

                    <small>
                        Waiting for Ziba admin verification.
                    </small>
                `;

            }


            else if (
                paymentStatus ===
                "paid"
            ) {

                paymentMessage = `
                    <span class="payment-paid">
                        Payment Verified ✓
                    </span>

                    <small>
                        Ziba admin has verified the payment.
                    </small>
                `;

            }


            else {

                paymentMessage = `
                    <span>
                        ${escapeHtml(paymentStatus)}
                    </span>
                `;

            }


            // ==================================
            // ORDER STATUS MESSAGE
            // ==================================

            let orderStatusMessage =
                formatOrderStatus(
                    orderStatus
                );


            // ==================================
            // FULL ORDER CARD
            // ==================================

            ordersContainer.innerHTML += `

                <div
                    class="order-card"
                    data-order-id="${orderDoc.id}"
                >

                    <h2>
                        ${escapeHtml(
                            order.productName ||
                            "Product"
                        )}
                    </h2>


                    <p>

                        <strong>
                            Amount:
                        </strong>

                        ₦${Number(
                            order.amount || 0
                        ).toLocaleString()}

                    </p>


                    <!-- PAYMENT -->

                    <div class="order-payment-status">

                        <p>

                            <strong>
                                Payment:
                            </strong>

                        </p>

                        <div>
                            ${paymentMessage}
                        </div>

                    </div>


                    <!-- ORDER STATUS -->

                    <p>

                        <strong>
                            Order Status:
                        </strong>

                        <span class="order-status">

                            ${orderStatusMessage}

                        </span>

                    </p>


                    <!-- SELLER -->

                    <p>

                        <strong>
                            Seller:
                        </strong>

                        ${escapeHtml(
                            order.sellerId ||
                            "Unknown"
                        )}

                    </p>


                    <!-- ==================================
                         PAYMENT PROGRESS
                    ================================== -->

                    <div class="payment-progress">

                        <div
                            class="payment-step ${
                                paymentStatus !==
                                "awaiting_payment"
                                    ? "completed"
                                    : "active"
                            }"
                        >

                            <i class="fas fa-credit-card"></i>

                            <span>
                                Payment
                            </span>

                        </div>


                        <div
                            class="payment-step ${
                                paymentStatus ===
                                "seller_confirmed" ||
                                paymentStatus ===
                                "paid"
                                    ? "completed"
                                    : ""
                            }"
                        >

                            <i class="fas fa-store"></i>

                            <span>
                                Seller Confirmed
                            </span>

                        </div>


                        <div
                            class="payment-step ${
                                paymentStatus ===
                                "paid"
                                    ? "completed"
                                    : ""
                            }"
                        >

                            <i class="fas fa-shield-check"></i>

                            <span>
                                Admin Verified
                            </span>

                        </div>

                    </div>


                    ${
                        paymentStatus ===
                        "seller_confirmed"

                        ?

                        `

                        <div class="buyer-payment-notice">

                            <i class="fas fa-clock"></i>

                            <div>

                                <strong>
                                    Seller has confirmed your payment.
                                </strong>

                                <small>
                                    Your payment is now waiting
                                    for Ziba admin verification.
                                </small>

                            </div>

                        </div>

                        `

                        :

                        paymentStatus ===
                        "paid"

                        ?

                        `

                        <div class="buyer-payment-success">

                            <i class="fas fa-circle-check"></i>

                            <div>

                                <strong>
                                    Payment verified by Ziba admin.
                                </strong>

                                <small>
                                    The seller can now process your order.
                                </small>

                            </div>

                        </div>

                        `

                        :

                        ""

                    }

                </div>

            `;

        });


    } catch (error) {

        console.error(
            "My orders error:",
            error
        );


        ordersContainer.innerHTML =
            "<p>Unable to load your orders.</p>";

    }

}


// ==========================================
// FORMAT ORDER STATUS
// ==========================================

function formatOrderStatus(
    status
) {

    switch (status) {

        case "pending":

            return "Pending";


        case "payment_verification":

            return "Payment Verification";


        case "processing":

            return "Processing";


        case "shipped":

            return "Shipped";


        case "delivered":

            return "Delivered";


        default:

            return status;

    }

}


// ==========================================
// SECURITY
// ==========================================

function escapeHtml(
    value
) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// ==========================================
// AUTH
// ==========================================

auth.onAuthStateChanged(
    (user) => {

        if (user) {

            loadMyOrders();

        } else {

            ordersContainer.innerHTML =
                "<p>Please log in first.</p>";

        }

    }
);

