import axios from "axios";
import { db } from "../firebase-admin.js";


// ==========================================
// PAYSTACK HEADERS
// ==========================================

const paystackHeaders = {
    Authorization:
        `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

    "Content-Type":
        "application/json"
};


// ==========================================
// INITIALIZE PAYMENT
// ==========================================

export const initializePayment = async (req, res) => {

    try {

        const {
            email,
            amount,

            // Upgrade information
            plan,
            userId,

            // Product information
            productId,
            productName,
            buyerName,
            buyerId,
            sellerId

        } = req.body;


        // ======================================
        // BASIC VALIDATION
        // ======================================

        if (!email || !amount) {

            return res.status(400).json({

                status: false,

                message:
                    "Email and amount are required."

            });

        }


        const paymentAmount =
            Number(amount);


        if (
            !Number.isFinite(paymentAmount) ||
            paymentAmount <= 0
        ) {

            return res.status(400).json({

                status: false,

                message:
                    "Invalid payment amount."

            });

        }


        // ======================================
        // DETERMINE PAYMENT TYPE
        // ======================================

        const isUpgrade =
            plan && userId;


        const isProductPayment =
            productId && sellerId;


        if (
            !isUpgrade &&
            !isProductPayment
        ) {

            return res.status(400).json({

                status: false,

                message:
                    "Invalid payment information."

            });

        }


        // ======================================
        // METADATA
        // ======================================

        let metadata;


        // ======================================
        // UPGRADE
        // ======================================

        if (isUpgrade) {

            metadata = {

                paymentType:
                    "upgrade",

                userId,

                plan,

                amount:
                    paymentAmount

            };

        }


        // ======================================
        // PRODUCT
        // ======================================

        if (isProductPayment) {

            metadata = {

                paymentType:
                    "product",

                buyerId:
                    buyerId || null,

                buyerName:
                    buyerName || "",

                sellerId,

                productId,

                productName:
                    productName || "",

                amount:
                    paymentAmount

            };

        }


        // ======================================
        // PAYSTACK REQUEST
        // ======================================

        const response =
            await axios.post(

                "https://api.paystack.co/transaction/initialize",

                {

                    email,

                    amount:
                        paymentAmount * 100,

                    callback_url:
                        process.env.PAYSTACK_CALLBACK_URL,

                    metadata

                },

                {
                    headers:
                        paystackHeaders
                }

            );


        // ======================================
        // RESPONSE
        // ======================================

        return res.json({

            status: true,

            message:
                "Payment initialized successfully.",

            data: {

                authorization_url:
                    response.data.data.authorization_url,

                access_code:
                    response.data.data.access_code,

                reference:
                    response.data.data.reference

            }

        });


    } catch (error) {

        console.error(
            "Paystack initialize error:",

            error.response?.data ||
            error.message
        );


        return res.status(500).json({

            status: false,

            message:
                error.response?.data?.message ||
                "Payment initialization failed."

        });

    }

};



// ==========================================
// VERIFY PAYMENT
// ==========================================

export const verifyPayment = async (req, res) => {

    try {

        const {
            reference
        } = req.params;


        // ======================================
        // VERIFY WITH PAYSTACK
        // ======================================

        const response =
            await axios.get(

                `https://api.paystack.co/transaction/verify/${reference}`,

                {
                    headers:
                        paystackHeaders
                }

            );


        const transaction =
            response.data.data;


        if (
            transaction.status !==
            "success"
        ) {

            return res.json({

                status: false,

                message:
                    "Payment was not successful."

            });

        }


        // ======================================
        // GET METADATA
        // ======================================

        const metadata =
            transaction.metadata || {};


        // ======================================
        // UPGRADE PAYMENT
        // ======================================

        if (
            metadata.paymentType ===
            "upgrade"
        ) {

            const userId =
                metadata.userId;

            const plan =
                metadata.plan;


            if (
                !userId ||
                !plan
            ) {

                return res.status(400).json({

                    status: false,

                    message:
                        "Upgrade information is missing."

                });

            }


            const userRef =
                db
                    .collection("users")
                    .doc(userId);


            const userSnap =
                await userRef.get();


            if (!userSnap.exists) {

                return res.status(404).json({

                    status: false,

                    message:
                        "User account not found."

                });

            }


            const existingUser =
                userSnap.data();


            // ==================================
            // PLAN DURATION
            // ==================================

            let durationMs;


            if (
                plan === "daily"
            ) {

                durationMs =
                    24 *
                    60 *
                    60 *
                    1000;

            } else if (
                plan === "weekly"
            ) {

                durationMs =
                    7 *
                    24 *
                    60 *
                    60 *
                    1000;

            } else if (
                plan === "monthly"
            ) {

                durationMs =
                    30 *
                    24 *
                    60 *
                    60 *
                    1000;

            } else {

                return res.status(400).json({

                    status: false,

                    message:
                        "Invalid plan."

                });

            }


            const now =
                new Date();


            const expiresAt =
                new Date(
                    now.getTime() +
                    durationMs
                );


            // ==================================
            // UPDATE SELLER
            // ==================================

            await userRef.update({

                accountType:
                    String(
                        existingUser.accountType ||
                        "seller"
                    ).trim(),

                plan,

                isPremium:
                    true,

                lastPaymentAmount:
                    transaction.amount / 100,

                lastPaymentReference:
                    transaction.reference,

                lastPaymentStatus:
                    "paid",

                planStartedAt:
                    now,

                planExpiresAt:
                    expiresAt,

                updatedAt:
                    now

            });


            return res.json({

                status: true,

                message:
                    "Payment verified and account upgraded.",

                userId,

                plan,

                accountType:
                    String(
                        existingUser.accountType ||
                        "seller"
                    ).trim(),

                planExpiresAt:
                    expiresAt.toISOString()

            });

        }



        // ======================================
        // PRODUCT PAYMENT
        // ======================================

        if (
            metadata.paymentType ===
            "product"
        ) {

            const sellerId =
                metadata.sellerId;

            const buyerId =
                metadata.buyerId;

            const productId =
                metadata.productId;


            if (
                !sellerId ||
                !productId
            ) {

                return res.status(400).json({

                    status: false,

                    message:
                        "Product payment information is missing."

                });

            }


            // ==================================
            // GET SELLER
            // ==================================

            const sellerRef =
                db
                    .collection("users")
                    .doc(sellerId);


            const sellerSnap =
                await sellerRef.get();


            if (!sellerSnap.exists) {

                return res.status(404).json({

                    status: false,

                    message:
                        "Seller account not found."

                });

            }


            // ==================================
            // AMOUNT
            // ==================================

            const paidAmount =
                transaction.amount / 100;


            /*
             * FOR NOW:
             *
             * The money is received by Ziba's
             * Paystack account.
             *
             * We record the seller's share in
             * availableBalance.
             *
             * Later, when your Paystack business
             * account/subaccount is approved,
             * we can change this to automatic
             * Paystack splitting.
             */


            // ==================================
            // ZIBA COMMISSION
            // ==================================

            const zibaCommission =
                Math.round(
                    paidAmount * 0.05
                );


            const sellerAmount =
                paidAmount -
                zibaCommission;


            // ==================================
            // GET CURRENT BALANCE
            // ==================================

            const sellerData =
                sellerSnap.data();


            const currentBalance =
                Number(
                    sellerData.availableBalance ||
                    0
                );


            const newBalance =
                currentBalance +
                sellerAmount;


            // ==================================
            // UPDATE SELLER BALANCE
            // ==================================

            await sellerRef.update({

                availableBalance:
                    newBalance,

                updatedAt:
                    new Date()

            });


            // ==================================
            // CREATE ORDER
            // ==================================

            const orderRef =
                db
                    .collection("orders")
                    .doc();


            await orderRef.set({

                buyerId:
                    buyerId || null,

                buyerName:
                    metadata.buyerName || "",

                buyerEmail:
                    transaction.customer?.email ||
                    "",

                sellerId,

                productId,

                productName:
                    metadata.productName ||
                    "",

                amount:
                    paidAmount,

                sellerAmount,

                zibaCommission,

                paymentReference:
                    transaction.reference,

                paymentStatus:
                    "paid",

                orderStatus:
                    "pending",

                createdAt:
                    new Date()

            });


            // ==================================
            // RESPONSE
            // ==================================

            return res.json({

                status: true,

                message:
                    "Payment verified and seller balance updated.",

                orderId:
                    orderRef.id,

                amount:
                    paidAmount,

                sellerAmount,

                zibaCommission,

                sellerBalance:
                    newBalance

            });

        }


        // ======================================
        // UNKNOWN PAYMENT
        // ======================================

        return res.status(400).json({

            status: false,

            message:
                "Unknown payment type."

        });


    } catch (error) {

        console.error(

            "Payment verification error:",

            error.response?.data ||
            error.message

        );


        return res.status(500).json({

            status: false,

            message:
                "Payment verification failed."

        });

    }

};