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

        if (!email || amount === undefined) {

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
            Boolean(plan && userId);

        const isProductPayment =
            Boolean(productId && sellerId);


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

        // This will contain the seller's
        // Paystack subaccount for product payments.
        let subaccountCode = null;


        // ======================================
        // UPGRADE PAYMENT
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
        // PRODUCT PAYMENT
        // ======================================

        if (isProductPayment) {

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


            const sellerData =
                sellerSnap.data();


            // ==================================
            // GET SUBACCOUNT
            // ==================================

            subaccountCode =
                sellerData.subaccountCode;


            if (!subaccountCode) {

                return res.status(400).json({

                    status: false,

                    message:
                        "Seller does not have a Paystack subaccount."

                });

            }


            // ==================================
            // PRODUCT METADATA
            // ==================================

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


            console.log(
                "Seller ID:",
                sellerId
            );

            console.log(
                "Seller subaccount:",
                subaccountCode
            );

        }


        // ======================================
        // PAYSTACK REQUEST
        // ======================================

        const paymentData = {

            email,

            amount:
                Math.round(
                    paymentAmount * 100
                ),

            callback_url:
                process.env.PAYSTACK_CALLBACK_URL,

            metadata

        };


        // ======================================
        // ADD SUBACCOUNT
        // ======================================

        if (isProductPayment) {

            paymentData.subaccount =
                subaccountCode;

        }


        // ======================================
        // DEBUG
        // ======================================

        console.log(
            "PAYSTACK PAYMENT DATA:"
        );

        console.log(
            JSON.stringify(
                paymentData,
                null,
                2
            )
        );


        // ======================================
        // INITIALIZE WITH PAYSTACK
        // ======================================

        const response =
            await axios.post(

                "https://api.paystack.co/transaction/initialize",

                paymentData,

                {

                    headers:
                        paystackHeaders

                }

            );


        // ======================================
        // CHECK RESPONSE
        // ======================================

        if (
            !response.data.status
        ) {

            return res.status(400).json({

                status: false,

                message:
                    response.data.message ||
                    "Unable to initialize payment."

            });

        }


        // ======================================
        // SUCCESS
        // ======================================

        console.log(
            "Paystack payment initialized:",
            response.data.data.reference
        );


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


        return res.status(

            error.response?.status || 500

        ).json({

            status: false,

            message:
                error.response?.data?.message ||
                "Payment initialization failed.",

            error:
                error.response?.data ||
                error.message

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
        // VALIDATE REFERENCE
        // ======================================

        if (!reference) {

            return res.status(400).json({

                status: false,

                message:
                    "Payment reference is required."

            });

        }


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


        // ======================================
        // PAYSTACK RESPONSE
        // ======================================

        if (
            !response.data.status
        ) {

            return res.status(400).json({

                status: false,

                message:
                    response.data.message ||
                    "Unable to verify payment."

            });

        }


        const transaction =
            response.data.data;


        // ======================================
        // CHECK PAYMENT STATUS
        // ======================================

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


            // ==================================
            // GET USER
            // ==================================

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

            }

            else if (
                plan === "weekly"
            ) {

                durationMs =
                    7 *
                    24 *
                    60 *
                    60 *
                    1000;

            }

            else if (
                plan === "monthly"
            ) {

                durationMs =
                    30 *
                    24 *
                    60 *
                    60 *
                    1000;

            }

            else {

                return res.status(400).json({

                    status: false,

                    message:
                        "Invalid plan."

                });

            }


            // ==================================
            // DATES
            // ==================================

            const now =
                new Date();


            const expiresAt =
                new Date(

                    now.getTime() +
                    durationMs

                );


            // ==================================
            // UPDATE USER
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


            // ==================================
            // RESPONSE
            // ==================================

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


            // ==================================
            // VALIDATION
            // ==================================

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


            const sellerData =
                sellerSnap.data();


            // ==================================
            // GET SUBACCOUNT
            // ==================================

            const subaccountCode =
                sellerData.subaccountCode;


            if (!subaccountCode) {

                return res.status(400).json({

                    status: false,

                    message:
                        "Seller does not have a Paystack subaccount."

                });

            }


            // ==================================
            // AMOUNT
            // ==================================

            const paidAmount =
                transaction.amount / 100;


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

                subaccountCode,

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
                    "Payment verified and order created successfully.",

                orderId:
                    orderRef.id,

                amount:
                    paidAmount,

                sellerAmount,

                zibaCommission,

                subaccountCode,

                paymentReference:
                    transaction.reference

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


        return res.status(

            error.response?.status || 500

        ).json({

            status: false,

            message:
                error.response?.data?.message ||
                "Payment verification failed."

        });

    }

};