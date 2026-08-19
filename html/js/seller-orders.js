
import { auth, db } from "./firebase-config.js";

import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


// ==========================================
// ELEMENT
// ==========================================

const ordersContainer =
    document.getElementById("ordersContainer");


// ==========================================
// LOAD SELLER ORDERS
// ==========================================

async function loadSellerOrders() {

    const user = auth.currentUser;

    if (!user) {

        if (ordersContainer) {

            ordersContainer.innerHTML =
                "<p>Please log in to view your orders.</p>";

        }

        return;
    }


    try {

        const ordersRef =
            collection(db, "orders");


        const q = query(

            ordersRef,

            where(
                "sellerId",
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
                "<p>No orders yet.</p>";

            return;

        }


        ordersContainer.innerHTML = "";


        snapshot.forEach((orderDoc) => {

            const order =
                orderDoc.data();


            const orderId =
                orderDoc.id;


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
            // PAYMENT CLASS
            // ==================================

            let paymentClass =
                "payment-pending";


            if (
                paymentStatus ===
                "buyer_confirmed"
            ) {

                paymentClass =
                    "payment-submitted";

            }


            if (
                paymentStatus ===
                "seller_confirmed"
            ) {

                paymentClass =
                    "payment-submitted";

            }


            if (
                paymentStatus ===
                "paid"
            ) {

                paymentClass =
                    "payment-paid";

            }


            // ==================================
            // ADMIN VERIFIED?
            // ==================================

            const adminVerified =
                order.adminVerified === true;


            // ==================================
            // CAN PROCESS ORDER?
            //
            // ONLY AFTER ADMIN VERIFICATION
            // ==================================

            const canProcess =
                paymentStatus === "paid" &&
                adminVerified;


            // ==================================
            // CAN SELLER VERIFY?
            //
            // BUYER MUST HAVE CONFIRMED FIRST
            // ==================================

            const canSellerVerify =
                paymentStatus ===
                "buyer_confirmed" &&
                order.sellerConfirmed !== true;


            // ==================================
            // PAYMENT ACTION
            // ==================================

            let paymentAction = "";


            // ----------------------------------
            // BUYER CONFIRMED
            // SELLER NEEDS TO CHECK BANK
            // ----------------------------------

            if (canSellerVerify) {

                paymentAction = `

                    <div class="seller-payment-verification">

                        <div class="verification-info">

                            <i class="fas fa-money-check-dollar"></i>

                            <div>

                                <strong>
                                    Buyer says payment was made
                                </strong>

                                <small>
                                    Check your bank account before confirming.
                                </small>

                            </div>

                        </div>


                        <button
                            type="button"
                            class="verify-payment-btn"
                            data-id="${orderId}"
                        >

                            <i class="fas fa-check-circle"></i>

                            I Confirm Payment

                        </button>

                    </div>

                `;

            }


            // ----------------------------------
            // SELLER CONFIRMED
            // WAITING FOR ADMIN
            // ----------------------------------

            if (
                paymentStatus ===
                "seller_confirmed"
            ) {

                paymentAction = `

                    <div class="seller-payment-pending">

                        <i class="fas fa-clock"></i>

                        <div>

                            <strong>
                                Payment Confirmed by Seller
                            </strong>

                            <small>
                                Waiting for Ziba admin verification.
                            </small>

                        </div>

                    </div>

                `;

            }


            // ----------------------------------
            // ADMIN VERIFIED
            // ----------------------------------

            if (
                paymentStatus === "paid" &&
                adminVerified
            ) {

                paymentAction = `

                    <div class="payment-success">

                        <i class="fas fa-circle-check"></i>

                        <div>

                            <strong>
                                Payment Verified by Admin
                            </strong>

                            <small>
                                You can now process this order.
                            </small>

                        </div>

                    </div>

                `;

            }


            // ==================================
            // PAYMENT WARNING
            // ==================================

            let paymentWarning = "";


            if (
                paymentStatus ===
                "awaiting_payment"
            ) {

                paymentWarning = `

                    <small class="payment-warning">

                        Waiting for the buyer to make payment.

                    </small>

                `;

            }


            if (
                paymentStatus ===
                "buyer_confirmed"
            ) {

                paymentWarning = `

                    <small class="payment-warning">

                        Buyer has confirmed payment.
                        Check your bank account and confirm
                        the payment if you received it.

                    </small>

                `;

            }


            if (
                paymentStatus ===
                "seller_confirmed"
            ) {

                paymentWarning = `

                    <small class="payment-warning">

                        You confirmed the payment.
                        Waiting for Ziba admin verification.

                    </small>

                `;

            }


            if (
                paymentStatus === "paid" &&
                adminVerified
            ) {

                paymentWarning = `

                    <small class="payment-success-text">

                        Admin has verified the payment.
                        You can process the order.

                    </small>

                `;

            }


            // ==================================
            // ORDER CARD
            // ==================================

            ordersContainer.innerHTML += `

                <div
                    class="order-card"
                    data-order-id="${orderId}"
                >

                    <h2>
                        ${escapeHtml(
                            order.productName ||
                            "Product"
                        )}
                    </h2>


                    <p>

                        <strong>
                            Buyer:
                        </strong>

                        ${escapeHtml(
                            order.buyerName ||
                            "Unknown"
                        )}

                    </p>


                    <p>

                        <strong>
                            Buyer Email:
                        </strong>

                        ${escapeHtml(
                            order.buyerEmail ||
                            "Not provided"
                        )}

                    </p>


                    <p>

                        <strong>
                            Amount:
                        </strong>

                        ₦${Number(
                            order.amount || 0
                        ).toLocaleString()}

                    </p>


                    <p>

                        <strong>
                            Payment:
                        </strong>

                        <span class="${paymentClass}">

                            ${formatPaymentStatus(
                                paymentStatus
                            )}

                        </span>

                    </p>


                    ${
                        order.paymentReference
                        ?
                        `

                        <p>

                            <strong>
                                Payment Reference:
                            </strong>

                            ${escapeHtml(
                                order.paymentReference
                            )}

                        </p>

                        `
                        :
                        ""
                    }


                    <p>

                        <strong>
                            Order Status:
                        </strong>

                        ${formatOrderStatus(
                            orderStatus
                        )}

                    </p>


                    <!-- PAYMENT VERIFICATION -->

                    ${paymentAction}


                    <!-- ORDER ACTIONS -->

                    <div class="order-actions">

                        <label>
                            Update Order
                        </label>


                        <select
                            class="status-select"
                            data-id="${orderId}"
                            ${!canProcess ? "disabled" : ""}
                        >

                            <option
                                value="pending"
                                ${
                                    orderStatus ===
                                    "pending"
                                    ? "selected"
                                    : ""
                                }
                            >
                                Pending
                            </option>


                            <option
                                value="processing"
                                ${
                                    orderStatus ===
                                    "processing"
                                    ? "selected"
                                    : ""
                                }
                            >
                                Processing
                            </option>


                            <option
                                value="shipped"
                                ${
                                    orderStatus ===
                                    "shipped"
                                    ? "selected"
                                    : ""
                                }
                            >
                                Shipped
                            </option>


                            <option
                                value="delivered"
                                ${
                                    orderStatus ===
                                    "delivered"
                                    ? "selected"
                                    : ""
                                }
                            >
                                Delivered
                            </option>

                        </select>


                        ${paymentWarning}

                    </div>

                </div>

            `;

        });


    } catch (error) {

        console.error(
            "Seller orders error:",
            error
        );


        if (ordersContainer) {

            ordersContainer.innerHTML =
                "<p>Unable to load orders.</p>";

        }

    }

}


// ==========================================
// SELLER CONFIRMS PAYMENT
// ==========================================

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                ".verify-payment-btn"
            );


        if (!button) {
            return;
        }


        const orderId =
            button.dataset.id;


        const seller =
            auth.currentUser;


        if (!seller) {

            alert(
                "Please log in first."
            );

            return;

        }


        const confirmed =
            confirm(

                "Have you checked your bank account and confirmed that you received this payment?"

            );


        if (!confirmed) {
            return;
        }


        try {

            button.disabled = true;


            button.innerHTML = `

                <i class="fas fa-spinner fa-spin"></i>

                Confirming...

            `;


            // ==================================
            // GET ORDER DIRECTLY
            // ==================================

            const orderRef =
                doc(
                    db,
                    "orders",
                    orderId
                );


            const orderSnapshot =
                await getDoc(orderRef);


            if (!orderSnapshot.exists()) {

                throw new Error(
                    "Order not found."
                );

            }


            const order =
                orderSnapshot.data();


            // ==================================
            // SECURITY
            // ==================================

            if (
                order.sellerId !==
                seller.uid
            ) {

                throw new Error(
                    "You are not authorized to verify this order."
                );

            }


            // ==================================
            // PAYMENT MUST BE BUYER CONFIRMED
            // ==================================

            if (
                order.paymentStatus !==
                "buyer_confirmed"
            ) {

                throw new Error(

                    "This payment is not waiting for seller confirmation."

                );

            }


            // ==================================
            // SELLER CONFIRMS PAYMENT
            // ==================================

            await updateDoc(

                orderRef,

                {

                    sellerConfirmed:
                        true,

                    sellerConfirmedBy:
                        seller.uid,

                    sellerConfirmedAt:
                        serverTimestamp(),

                    paymentStatus:
                        "seller_confirmed",

                    adminVerified:
                        false,

                    updatedAt:
                        serverTimestamp()

                }

            );


           alert(
    "Payment verified successfully. " +
    "Waiting for Ziba admin verification."
);

// Automatically return to seller dashboard
window.location.href = "seller-dashboard.html";


            await loadSellerOrders();


        } catch (error) {

            console.error(
                "Seller payment verification error:",
                error
            );


            alert(
                error.message ||
                "Unable to confirm payment."
            );


            button.disabled =
                false;


            button.innerHTML = `

                <i class="fas fa-check-circle"></i>

                I Confirm Payment

            `;

        }

    }
);


// ==========================================
// UPDATE ORDER STATUS
// ==========================================

document.addEventListener(
    "change",
    async (event) => {

        if (
            !event.target.classList.contains(
                "status-select"
            )
        ) {

            return;
        }


        const select =
            event.target;


        const orderId =
            select.dataset.id;


        const newStatus =
            select.value;


        try {

            // ==================================
            // GET ORDER
            // ==================================

            const orderRef =
                doc(
                    db,
                    "orders",
                    orderId
                );


            const orderSnapshot =
                await getDoc(orderRef);


            if (!orderSnapshot.exists()) {

                alert(
                    "Order not found."
                );

                return;

            }


            const order =
                orderSnapshot.data();


            // ==================================
            // ONLY ADMIN VERIFIED PAYMENT
            // CAN PROCESS ORDER
            // ==================================

            if (
                newStatus !== "pending" &&
                (
                    order.paymentStatus !==
                    "paid" ||
                    order.adminVerified !==
                    true
                )
            ) {

                alert(

                    "This payment is still waiting for Ziba admin verification. " +
                    "You can only process the order after admin verification."

                );


                select.value =
                    order.orderStatus ||
                    "pending";


                return;

            }


            // ==================================
            // UPDATE ORDER
            // ==================================

            await updateDoc(

                orderRef,

                {

                    orderStatus:
                        newStatus,

                    updatedAt:
                        serverTimestamp()

                }

            );


            alert(
                "Order status updated!"
            );


            await loadSellerOrders();


        } catch (error) {

            console.error(
                "Status update error:",
                error
            );


            alert(
                "Unable to update order status."
            );

        }

    }
);


// ==========================================
// FORMAT PAYMENT STATUS
// ==========================================

function formatPaymentStatus(
    status
) {

    switch (status) {

        case "buyer_confirmed":

            return "Buyer Confirmed";

        case "seller_confirmed":

            return "Seller Verified • Awaiting Admin";

        case "submitted":

            return "Payment Submitted";

        case "paid":

            return "Payment Verified ✓";

        case "awaiting_payment":

            return "Awaiting Payment";

        case "pending":

            return "Awaiting Payment";

        default:

            return status;

    }

}


// ==========================================
// FORMAT ORDER STATUS
// ==========================================

function formatOrderStatus(
    status
) {

    switch (status) {

        case "payment_verification":

            return "Payment Verification";

        case "processing":

            return "Processing";

        case "shipped":

            return "Shipped";

        case "delivered":

            return "Delivered";

        case "pending":

            return "Pending";

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

            loadSellerOrders();

        } else {

            if (ordersContainer) {

                ordersContainer.innerHTML =
                    "<p>Please log in first.</p>";

            }

        }

    }
);
