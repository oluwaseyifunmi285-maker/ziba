import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


// ======================================================
// BACKEND API
// ======================================================

// IMPORTANT:
// Your frontend is running on 127.0.0.1:5500
// Your backend is running on Render.

const BACKEND_URL =
    "https://ziba-backend-wkzv.onrender.com";

const BANK_API_URL =
    `${BACKEND_URL}/api/bank-account`;


// ======================================================
// ELEMENTS
// ======================================================

const sellerName =
    document.getElementById("sellerName");

const sellerPlan =
    document.getElementById("sellerPlan");

const sellerBalance =
    document.getElementById("sellerBalance");

const withdrawDescription =
    document.getElementById("withdrawDescription");

const totalProducts =
    document.getElementById("totalProducts");

const totalOrders =
    document.getElementById("totalOrders");

const logoutBtn =
    document.getElementById("logoutBtn");

const messageBadge =
    document.getElementById("messageBadge");

const mobileMessageBadge =
    document.getElementById("mobileMessageBadge");

const sellerProfileImage =
    document.getElementById("sellerProfileImage");

const sellerProfileIcon =
    document.getElementById("sellerProfileIcon");


// ======================================================
// BANK ACCOUNT ELEMENTS
// ======================================================

const bankAccountForm =
    document.getElementById("bankAccountForm");

const bankNameInput =
    document.getElementById("bankName");

const accountNameInput =
    document.getElementById("accountName");

const accountNumberInput =
    document.getElementById("accountNumber");

const bankCodeInput =
    document.getElementById("bankCode");

const saveBankAccountBtn =
    document.getElementById("saveBankAccountBtn");

const bankAccountMessage =
    document.getElementById("bankAccountMessage");

const connectedBankAccount =
    document.getElementById("connectedBankAccount");

const connectedBankDetails =
    document.getElementById("connectedBankDetails");


// ======================================================
// PAYMENT NOTIFICATION ELEMENTS
// ======================================================

const paymentNotificationSection =
    document.getElementById(
        "paymentNotificationSection"
    );

const paymentNotificationText =
    document.getElementById(
        "paymentNotificationText"
    );


// ======================================================
// CURRENT SELLER
// ======================================================

let currentSellerId = null;


// ======================================================
// AUTH
// ======================================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href =
            "login.html";

        return;
    }


    currentSellerId =
        user.uid;


    try {

        const userRef =
            doc(
                db,
                "users",
                user.uid
            );


        const userSnap =
            await getDoc(userRef);


        if (!userSnap.exists()) {

            alert(
                "User profile not found."
            );

            window.location.href =
                "login.html";

            return;
        }


        const userData =
            userSnap.data();


        // ==================================================
        // SELLER ACCESS
        // ==================================================

        if (
            userData.accountType !== "seller"
        ) {

            alert(
                "Access denied."
            );

            window.location.href =
                "index.html";

            return;
        }


        // ==================================================
        // SELLER NAME
        // ==================================================

        if (sellerName) {

            sellerName.textContent =
                "Welcome, " +
                (
                    userData.fullName ||
                    "Seller"
                );
        }


        // ==================================================
        // PLAN
        // ==================================================

        if (sellerPlan) {

            sellerPlan.textContent =
                userData.plan ||
                "Free";
        }


        // ==================================================
        // PROFILE IMAGE
        // ==================================================

        const profilePicture =
            userData.profilePicture ||
            userData.photoURL ||
            "";


        if (
            profilePicture &&
            sellerProfileImage
        ) {

            sellerProfileImage.src =
                profilePicture;

            sellerProfileImage.style.display =
                "block";


            if (sellerProfileIcon) {

                sellerProfileIcon.style.display =
                    "none";
            }

        } else {

            if (sellerProfileImage) {

                sellerProfileImage.style.display =
                    "none";
            }


            if (sellerProfileIcon) {

                sellerProfileIcon.style.display =
                    "block";
            }
        }


        // ==================================================
        // LOAD PRODUCTS
        // ==================================================

        const productsQuery =
            query(
                collection(
                    db,
                    "products"
                ),
                where(
                    "sellerId",
                    "==",
                    user.uid
                )
            );


        const productsSnapshot =
            await getDocs(
                productsQuery
            );


        if (totalProducts) {

            totalProducts.textContent =
                productsSnapshot.size;
        }


        loadProducts(
            productsSnapshot
        );


        // ==================================================
        // LOAD BALANCE / ORDERS
        // ==================================================

        await loadSellerBalance(
            user.uid
        );


        // ==================================================
        // LOAD BANK ACCOUNT
        // ==================================================

        await loadBankAccount(
            user.uid
        );


        // ==================================================
        // PAYMENT NOTIFICATIONS
        // ==================================================

        listenForSellerPayments(
            user.uid
        );


        // ==================================================
        // CHAT
        // ==================================================

        listenForUnreadMessages(
            user.uid
        );


    } catch (error) {

        console.error(
            "Seller dashboard error:",
            error
        );

        alert(
            "Something went wrong."
        );
    }

});


// ======================================================
// LOAD PRODUCTS
// ======================================================

function loadProducts(snapshot) {

    const productsContainer =
        document.getElementById(
            "productsContainer"
        );


    if (!productsContainer) return;


    productsContainer.innerHTML =
        "";


    if (snapshot.empty) {

        productsContainer.innerHTML =
            "<p>You haven't posted any products yet.</p>";

        return;
    }


    snapshot.forEach(
        (productDoc) => {

            const product =
                productDoc.data();


            const productCard =
                document.createElement(
                    "div"
                );


            productCard.className =
                "product-card";


            const image =
                product.imageUrls?.[0] ||
                product.image ||
                "https://via.placeholder.com/300x180?text=No+Image";


            productCard.innerHTML = `

                <img
                    src="${image}"
                    alt="${
                        product.productName ||
                        "Product"
                    }"
                >

                <div class="product-info">

                    <h3>
                        ${
                            product.productName ||
                            "Unnamed Product"
                        }
                    </h3>

                    <p>
                        ₦${
                            Number(
                                product.price || 0
                            ).toLocaleString()
                        }
                    </p>

                    <p>
                        ${
                            product.location ||
                            "Location not provided"
                        }
                    </p>

                </div>

            `;


            productsContainer.appendChild(
                productCard
            );

        }
    );

}


// ======================================================
// LOAD SELLER BANK ACCOUNT
// ======================================================

async function loadBankAccount(userId) {

    try {

        const response =
            await fetch(
                `${BANK_API_URL}/${userId}`
            );


        /*
        Check response before trying
        to parse JSON.
        */

        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        if (
            !contentType.includes(
                "application/json"
            )
        ) {

            const text =
                await response.text();

            console.error(
                "Bank API returned non-JSON:",
                text
            );

            throw new Error(
                `Bank API error: ${response.status}`
            );
        }


        const data =
            await response.json();


        if (!response.ok) {

            if (
                response.status === 404
            ) {

                showBankForm();

                return;
            }


            throw new Error(
                data.message ||
                "Unable to load bank account."
            );
        }


        if (
            data.status === true
        ) {

            showConnectedBankAccount(
                data
            );


            if (bankNameInput) {

                bankNameInput.value =
                    data.bankName || "";
            }


            if (accountNameInput) {

                accountNameInput.value =
                    data.accountName || "";
            }


            if (accountNumberInput) {

                accountNumberInput.value =
                    data.accountNumber || "";
            }


            if (bankCodeInput) {

                bankCodeInput.value =
                    data.bankCode || "";
            }
        }

    } catch (error) {

        console.error(
            "Load bank account error:",
            error
        );


        showBankMessage(
            error.message,
            "error"
        );
    }

}


// ======================================================
// SHOW CONNECTED BANK ACCOUNT
// ======================================================

function showConnectedBankAccount(data) {

    if (
        connectedBankAccount
    ) {

        connectedBankAccount.style.display =
            "flex";
    }


    if (
        connectedBankDetails
    ) {

        const maskedAccount =
            maskAccountNumber(
                data.accountNumber
            );


        connectedBankDetails.textContent =
            `${data.bankName || "Bank"} • ` +
            `${data.accountName || ""} • ` +
            `${maskedAccount}`;
    }

}


// ======================================================
// SHOW BANK FORM
// ======================================================

function showBankForm() {

    if (
        connectedBankAccount
    ) {

        connectedBankAccount.style.display =
            "none";
    }

}


// ======================================================
// MASK ACCOUNT NUMBER
// ======================================================

function maskAccountNumber(
    accountNumber
) {

    if (!accountNumber) {

        return "";
    }


    const value =
        String(accountNumber);


    if (
        value.length <= 4
    ) {

        return value;
    }


    return (
        "******" +
        value.slice(-4)
    );

}


// ======================================================
// BANK MESSAGE
// ======================================================

function showBankMessage(
    message,
    type = "success"
) {

    if (!bankAccountMessage) return;


    bankAccountMessage.textContent =
        message;


    bankAccountMessage.className =
        "bank-account-message " +
        type;


    bankAccountMessage.style.display =
        "block";


    setTimeout(
        () => {

            bankAccountMessage.style.display =
                "none";

        },
        5000
    );

}


// ======================================================
// SAVE / VERIFY BANK ACCOUNT
// ======================================================

if (bankAccountForm) {

    bankAccountForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (!currentSellerId) {

                showBankMessage(
                    "Seller is not authenticated.",
                    "error"
                );

                return;
            }


            const bankName =
                bankNameInput.value.trim();


            const accountName =
                accountNameInput.value.trim();


            const accountNumber =
                accountNumberInput.value.trim();


            const bankCode =
                bankCodeInput.value.trim();


            // ==========================================
            // VALIDATION
            // ==========================================

            if (
                !bankName ||
                !accountName ||
                !accountNumber
            ) {

                showBankMessage(
                    "Please complete your bank details.",
                    "error"
                );

                return;
            }


            if (
                !/^\d{10}$/.test(
                    accountNumber
                )
            ) {

                showBankMessage(
                    "Account number must contain exactly 10 digits.",
                    "error"
                );

                return;
            }


            // ==========================================
            // DISABLE BUTTON
            // ==========================================

            if (
                saveBankAccountBtn
            ) {

                saveBankAccountBtn.disabled =
                    true;


                saveBankAccountBtn.innerHTML =
                    `
                    <i class="fas fa-spinner fa-spin"></i>
                    Saving...
                    `;
            }


            try {

                const response =
                    await fetch(
                        `${BANK_API_URL}/verify`,
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    userId:
                                        currentSellerId,

                                    bankName:
                                        bankName,

                                    bankCode:
                                        bankCode,

                                    accountName:
                                        accountName,

                                    accountNumber:
                                        accountNumber

                                })

                        }
                    );


                const contentType =
                    response.headers.get(
                        "content-type"
                    ) || "";


                if (
                    !contentType.includes(
                        "application/json"
                    )
                ) {

                    const text =
                        await response.text();

                    console.error(
                        "Bank save returned non-JSON:",
                        text
                    );

                    throw new Error(
                        `Bank API error: ${response.status}`
                    );
                }


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "Unable to save bank account."
                    );
                }


                // ==========================================
                // SUCCESS
                // ==========================================

                showBankMessage(
                    data.message ||
                    "Bank account saved successfully.",
                    "success"
                );


                showConnectedBankAccount({

                    bankName:
                        data.bankName ||
                        bankName,

                    bankCode:
                        data.bankCode ||
                        bankCode,

                    accountName:
                        data.accountName ||
                        accountName,

                    accountNumber:
                        data.accountNumber ||
                        accountNumber

                });


                if (
                    accountNumberInput
                ) {

                    accountNumberInput.value =
                        data.accountNumber ||
                        accountNumber;
                }


            } catch (error) {

                console.error(
                    "Save bank account error:",
                    error
                );


                showBankMessage(
                    error.message ||
                    "Unable to save bank account.",
                    "error"
                );


            } finally {

                if (
                    saveBankAccountBtn
                ) {

                    saveBankAccountBtn.disabled =
                        false;


                    saveBankAccountBtn.innerHTML =
                        `
                        <i class="fas fa-building-columns"></i>
                        Save Bank Account
                        `;
                }

            }

        }
    );

}


// ======================================================
// SELLER PAYMENT NOTIFICATION
// ======================================================

function listenForSellerPayments(
    userId
) {

    const ordersQuery =
        query(
            collection(
                db,
                "orders"
            ),
            where(
                "sellerId",
                "==",
                userId
            )
        );


    onSnapshot(
        ordersQuery,
        (snapshot) => {

            let pendingPayment =
                null;


            snapshot.forEach(
                (orderDoc) => {

                    const order =
                        orderDoc.data();


                    if (
                        order.paymentStatus ===
                            "buyer_confirmed" &&
                        order.adminVerified !==
                            true
                    ) {

                        pendingPayment = {

                            id:
                                orderDoc.id,

                            ...order

                        };

                    }

                }
            );


            if (
                pendingPayment
            ) {

                showPaymentNotification(
                    pendingPayment
                );

            } else {

                hidePaymentNotification();

            }


            updateOrderCount(
                snapshot
            );

        },
        (error) => {

            console.error(
                "Seller payment listener error:",
                error
            );

        }
    );

}


// ======================================================
// PAYMENT NOTIFICATION UI
// ======================================================

function showPaymentNotification(
    order
) {

    if (
        paymentNotificationSection
    ) {

        paymentNotificationSection.style.display =
            "flex";
    }


    if (
        paymentNotificationText
    ) {

        const amount =
            Number(
                order.amount || 0
            ).toLocaleString();


        paymentNotificationText.textContent =
            `Buyer ${
                order.buyerName || ""
            } has confirmed payment of ₦${amount}. ` +
            `The payment is waiting for admin verification.`;

    }

}


// ======================================================
// HIDE PAYMENT NOTIFICATION
// ======================================================

function hidePaymentNotification() {

    if (
        paymentNotificationSection
    ) {

        paymentNotificationSection.style.display =
            "none";
    }

}


// ======================================================
// UPDATE ORDER COUNT
// ======================================================

function updateOrderCount(
    snapshot
) {

    if (!totalOrders) return;


    let count = 0;


    snapshot.forEach(
        () => {

            count++;

        }
    );


    totalOrders.textContent =
        count;

}


// ======================================================
// SELLER BALANCE
// ======================================================

async function loadSellerBalance(
    userId
) {

    try {

        const ordersQuery =
            query(
                collection(
                    db,
                    "orders"
                ),
                where(
                    "sellerId",
                    "==",
                    userId
                ),
                where(
                    "paymentStatus",
                    "==",
                    "paid"
                )
            );


        const ordersSnapshot =
            await getDocs(
                ordersQuery
            );


        let totalEarned =
            0;


        let orderCount =
            0;


        ordersSnapshot.forEach(
            (orderDoc) => {

                const order =
                    orderDoc.data();


                const amount =
                    Number(
                        order.sellerAmount ??
                        order.amount ??
                        0
                    );


                if (
                    amount > 0
                ) {

                    totalEarned +=
                        amount;

                    orderCount++;

                }

            }
        );


        // ==================================================
        // WITHDRAWALS
        // ==================================================

        const withdrawalsQuery =
            query(
                collection(
                    db,
                    "withdrawals"
                ),
                where(
                    "sellerId",
                    "==",
                    userId
                ),
                where(
                    "status",
                    "in",
                    [
                        "pending",
                        "processing",
                        "success"
                    ]
                )
            );


        const withdrawalsSnapshot =
            await getDocs(
                withdrawalsQuery
            );


        let totalWithdrawn =
            0;


        withdrawalsSnapshot.forEach(
            (withdrawalDoc) => {

                const withdrawal =
                    withdrawalDoc.data();


                totalWithdrawn +=
                    Number(
                        withdrawal.amount ||
                        0
                    );

            }
        );


        const balance =
            Math.max(
                0,
                totalEarned -
                totalWithdrawn
            );


        // ==================================================
        // DISPLAY BALANCE
        // ==================================================

        if (sellerBalance) {

            sellerBalance.textContent =
                "₦" +
                balance.toLocaleString();

        }


        if (
            withdrawDescription
        ) {

            withdrawDescription.textContent =
                "Available: ₦" +
                balance.toLocaleString();

        }


        if (totalOrders) {

            totalOrders.textContent =
                orderCount;

        }


        console.log(
            "Total earned:",
            totalEarned
        );


        console.log(
            "Total withdrawn:",
            totalWithdrawn
        );


        console.log(
            "Available balance:",
            balance
        );


    } catch (error) {

        console.error(
            "Balance loading error:",
            error
        );


        if (sellerBalance) {

            sellerBalance.textContent =
                "₦0";

        }


        if (
            withdrawDescription
        ) {

            withdrawDescription.textContent =
                "Unable to load balance";

        }

    }

}


// ======================================================
// UNREAD MESSAGES
// ======================================================

function listenForUnreadMessages(
    userId
) {

    const chatsQuery =
        query(
            collection(
                db,
                "chats"
            ),
            where(
                "participants",
                "array-contains",
                userId
            )
        );


    onSnapshot(
        chatsQuery,
        (snapshot) => {

            let unreadTotal =
                0;


            snapshot.forEach(
                (chatDoc) => {

                    const chat =
                        chatDoc.data();


                    const unread =
                        chat.unread ||
                        {};


                    unreadTotal +=
                        Number(
                            unread[userId] ||
                            0
                        );

                }
            );


            updateMessageBadges(
                unreadTotal
            );

        },
        (error) => {

            console.error(
                "Unread messages error:",
                error
            );

        }
    );

}


// ======================================================
// MESSAGE BADGES
// ======================================================

function updateMessageBadges(
    count
) {

    const badges = [

        messageBadge,

        mobileMessageBadge

    ];


    badges.forEach(
        (badge) => {

            if (!badge) return;


            if (
                count > 0
            ) {

                badge.textContent =
                    count > 99
                        ? "99+"
                        : count;


                badge.style.display =
                    "flex";

            } else {

                badge.style.display =
                    "none";

            }

        }
    );

}


// ======================================================
// LOGOUT
// ======================================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            try {

                await signOut(
                    auth
                );


                window.location.href =
                    "login.html";


            } catch (error) {

                alert(
                    error.message
                );

            }

        }
    );

}