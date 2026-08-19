
// ==========================================
// ZIBA ADMIN PAYMENT VERIFICATION
// ==========================================

import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


// ==========================================
// CONFIGURATION
// ==========================================

// IMPORTANT:
// Change this if your backend is deployed somewhere else.

const API_BASE_URL =
    "http://localhost:3000";


// ==========================================
// ELEMENTS
// ==========================================

const paymentsContainer =
    document.getElementById(
        "paymentsContainer"
    );

const pendingCount =
    document.getElementById(
        "pendingCount"
    );

const pendingAmount =
    document.getElementById(
        "pendingAmount"
    );

const refreshBtn =
    document.getElementById(
        "refreshBtn"
    );

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


// ==========================================
// ADMIN AUTH
// ==========================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        try {

            const userRef =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const userSnap =
                await getDoc(
                    userRef
                );


            if (!userSnap.exists()) {

                alert(
                    "Admin profile not found."
                );

                window.location.href =
                    "login.html";

                return;

            }


            const userData =
                userSnap.data();


            const isAdmin =
                userData.accountType === "admin" ||
                userData.role === "admin" ||
                userData.isAdmin === true;


            if (!isAdmin) {

                alert(
                    "Access denied. Admins only."
                );

                window.location.href =
                    "index.html";

                return;

            }


            // ==================================
            // LOAD PAYMENTS
            // ==================================

            await loadPendingPayments();

        } catch (error) {

            console.error(
                "Admin verification error:",
                error
            );


            paymentsContainer.innerHTML = `

                <div class="error-state">

                    <i class="fas fa-triangle-exclamation"></i>

                    <h3>
                        Unable to verify admin account
                    </h3>

                    <p>
                        Please refresh the page and try again.
                    </p>

                </div>

            `;

        }

    }
);


// ==========================================
// LOAD PENDING PAYMENTS
// ==========================================

async function loadPendingPayments() {

    try {

        paymentsContainer.innerHTML = `

            <div class="loading">

                <i class="fas fa-spinner fa-spin"></i>

                <p>
                    Loading payments...
                </p>

            </div>

        `;


        const response =
            await fetch(
                `${API_BASE_URL}/api/payment/pending`
            );


        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.status) {

            throw new Error(
                data.message ||
                "Unable to load payments."
            );

        }


        const payments =
            data.payments || [];


        // ==================================
        // UPDATE STATISTICS
        // ==================================

        updateStatistics(
            payments
        );


        // ==================================
        // EMPTY
        // ==================================

        if (payments.length === 0) {

            paymentsContainer.innerHTML = `

                <div class="empty-state">

                    <i class="fas fa-circle-check"></i>

                    <h3>
                        No payments awaiting verification
                    </h3>

                    <p>
                        All seller-confirmed payments have been reviewed.
                    </p>

                </div>

            `;

            return;

        }


        // ==================================
        // RENDER
        // ==================================

        paymentsContainer.innerHTML = "";


        payments.forEach(
            payment => {

                paymentsContainer.appendChild(
                    createPaymentCard(
                        payment
                    )
                );

            }
        );


    } catch (error) {

        console.error(
            "Load pending payments error:",
            error
        );


        paymentsContainer.innerHTML = `

            <div class="error-state">

                <i class="fas fa-triangle-exclamation"></i>

                <h3>
                    Unable to load payments
                </h3>

                <p>
                    ${escapeHTML(
                        error.message ||
                        "Please check that the Ziba backend is running."
                    )}
                </p>

            </div>

        `;

    }

}


// ==========================================
// STATISTICS
// ==========================================

function updateStatistics(
    payments
) {

    pendingCount.textContent =
        payments.length;


    const total =
        payments.reduce(
            (
                sum,
                payment
            ) => {

                return sum +
                    Number(
                        payment.amount || 0
                    );

            },
            0
        );


    pendingAmount.textContent =
        `₦${total.toLocaleString()}`;

}


// ==========================================
// CREATE PAYMENT CARD
// ==========================================

function createPaymentCard(
    payment
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "payment-card";


    const amount =
        Number(
            payment.amount || 0
        );


    const commission =
        Number(
            payment.commission || 0
        );


    const sellerAmount =
        Number(
            payment.sellerAmount || 0
        );


    card.innerHTML = `

        <!-- ================= TOP ================= -->

        <div class="payment-top">

            <div>

                <div class="product-name">

                    ${escapeHTML(
                        payment.productName ||
                        "Product"
                    )}

                </div>


                <div class="order-id">

                    Order ID:
                    ${escapeHTML(
                        payment.id ||
                        "Unknown"
                    )}

                </div>

            </div>


            <span class="status-badge">

                Seller Verified

            </span>

        </div>


        <!-- ================= PAYMENT INFO ================= -->

        <div class="payment-info">


            <div class="info-box">

                <span>
                    Buyer
                </span>

                <strong>
                    ${escapeHTML(
                        payment.buyerName ||
                        "Unknown"
                    )}
                </strong>

            </div>


            <div class="info-box">

                <span>
                    Buyer Email
                </span>

                <strong>
                    ${escapeHTML(
                        payment.buyerEmail ||
                        "Not provided"
                    )}
                </strong>

            </div>


            <div class="info-box">

                <span>
                    Seller ID
                </span>

                <strong>
                    ${escapeHTML(
                        payment.sellerId ||
                        "Unknown"
                    )}
                </strong>

            </div>


            <div class="info-box amount-box">

                <span>
                    Order Amount
                </span>

                <strong>

                    ₦${amount.toLocaleString()}

                </strong>

            </div>


            ${
                payment.paymentReference

                ? `

                    <div class="info-box">

                        <span>
                            Payment Reference
                        </span>

                        <strong>
                            ${escapeHTML(
                                payment.paymentReference
                            )}
                        </strong>

                    </div>

                `

                : ""

            }


            <div class="info-box">

                <span>
                    Payment Method
                </span>

                <strong>
                    ${escapeHTML(
                        payment.paymentMethod ||
                        "Bank Transfer"
                    )}
                </strong>

            </div>


            <div class="info-box">

                <span>
                    Ziba Commission (10%)
                </span>

                <strong>
                    ₦${commission.toLocaleString()}
                </strong>

            </div>


            <div class="info-box">

                <span>
                    Seller Receives
                </span>

                <strong>
                    ₦${sellerAmount.toLocaleString()}
                </strong>

            </div>

        </div>


        <!-- ================= SELLER CONFIRMATION ================= -->

        <div class="seller-confirmed">

            <i class="fas fa-circle-check"></i>

            <div>

                <strong>
                    Seller has confirmed this payment
                </strong>

                <div>
                    This payment is waiting for Ziba admin verification.
                </div>

            </div>

        </div>


        <!-- ================= ACTION ================= -->

        <div class="payment-actions">

            <button
                class="verify-btn"
                data-payment-id="${escapeHTML(
                    payment.id
                )}"
            >

                <i class="fas fa-shield-check"></i>

                Verify Payment

            </button>

        </div>

    `;


    // ==========================================
    // VERIFY BUTTON
    // ==========================================

    const verifyBtn =
        card.querySelector(
            ".verify-btn"
        );


    verifyBtn.addEventListener(
        "click",
        async () => {

            await verifyPayment(
                payment,
                verifyBtn,
                card
            );

        }
    );


    return card;

}


// ==========================================
// VERIFY PAYMENT
// ==========================================

async function verifyPayment(
    payment,
    button,
    card
) {

    const amount =
        Number(
            payment.amount || 0
        );


    const confirmed =
        confirm(

            `Verify this payment?\n\n` +

            `Product: ${
                payment.productName ||
                "Product"
            }\n` +

            `Buyer: ${
                payment.buyerName ||
                "Unknown"
            }\n` +

            `Amount: ₦${
                amount.toLocaleString()
            }\n\n` +

            `This will mark the payment as PAID ` +
            `and credit the seller's Ziba balance.`

        );


    if (!confirmed) {

        return;

    }


    try {

        button.disabled =
            true;


        button.innerHTML = `

            <i class="fas fa-spinner fa-spin"></i>

            Verifying...

        `;


        const paymentId =
            payment.id;


        if (!paymentId) {

            throw new Error(
                "Payment ID is missing."
            );

        }


        // ==================================
        // CALL BACKEND
        // ==================================

        const response =
            await fetch(

                `${API_BASE_URL}/api/payment/verify/${encodeURIComponent(
                    paymentId
                )}`,

                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    }

                }

            );


        const data =
            await response.json();


        if (!response.ok ||
            !data.status
        ) {

            throw new Error(
                data.message ||
                "Unable to verify payment."
            );

        }


        // ==================================
        // SUCCESS
        // ==================================

        alert(

            "Payment verified successfully!\n\n" +

            `Order Amount: ₦${Number(
                data.amount || amount
            ).toLocaleString()}\n` +

            `Ziba Commission: ₦${Number(
                data.commission || 0
            ).toLocaleString()}\n` +

            `Seller Amount: ₦${Number(
                data.sellerAmount || 0
            ).toLocaleString()}`

        );


        // ==================================
        // REMOVE CARD
        // ==================================

        card.remove();


        // ==================================
        // REFRESH STATISTICS
        // ==================================

        await loadPendingPayments();


    } catch (error) {

        console.error(
            "Verify payment error:",
            error
        );


        alert(
            error.message ||
            "Unable to verify payment."
        );


        button.disabled =
            false;


        button.innerHTML = `

            <i class="fas fa-shield-check"></i>

            Verify Payment

        `;

    }

}


// ==========================================
// REFRESH
// ==========================================

refreshBtn.addEventListener(
    "click",
    async () => {

        refreshBtn.disabled =
            true;


        refreshBtn.innerHTML = `

            <i class="fas fa-spinner fa-spin"></i>

            Refreshing...

        `;


        await loadPendingPayments();


        refreshBtn.disabled =
            false;


        refreshBtn.innerHTML = `

            <i class="fas fa-sync-alt"></i>

            Refresh

        `;

    }
);


// ==========================================
// LOGOUT
// ==========================================

logoutBtn.addEventListener(
    "click",
    async (event) => {

        event.preventDefault();


        try {

            await signOut(
                auth
            );


            window.location.href =
                "login.html";


        } catch (error) {

            console.error(
                "Logout error:",
                error
            );


            alert(
                "Unable to logout."
            );

        }

    }
);


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


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

