
import axios from "axios";

import { db } from "../firebase-admin.js";


// ==========================================
// ZIBA PREMIUM PLANS
// ==========================================

const PLANS = {

    daily: {
        amount: 500,
        durationDays: 1,
        name: "Ziba Daily"
    },

    weekly: {
        amount: 3000,
        durationDays: 7,
        name: "Ziba Weekly"
    },

    monthly: {
        amount: 10000,
        durationDays: 30,
        name: "Ziba Monthly"
    }

};


// ==========================================
// INITIALIZE PAYMENT
// ==========================================

export const initializePayment = async (req, res) => {

    try {

        const {
            email,
            amount,
            plan,
            userId,

            // Product payment fields
            productId,
            productName,
            buyerName,
            buyerId,
            sellerId

        } = req.body;


        // ======================================
        // CHECK EMAIL
        // ======================================

        if (!email) {

            return res.status(400).json({

                status: false,

                message:
                    "Email is required."

            });

        }


        // ======================================
        // PREMIUM PLAN PAYMENT
        // ======================================

        if (plan) {

            const selectedPlan =
                PLANS[plan];


            if (!selectedPlan) {

                return res.status(400).json({

                    status: false,

                    message:
                        "Invalid upgrade plan."

                });

            }


            // IMPORTANT:
            // Never trust the price sent from
            // the browser.
            //
            // We use the server-side price.

            const planAmount =
                selectedPlan.amount;


            console.log(
                "Initializing Ziba upgrade:",
                {
                    userId,
                    plan,
                    amount: planAmount
                }
            );


            const response =
                await axios.post(

                    "https://api.paystack.co/transaction/initialize",

                    {

                        email,

                        amount:
                            planAmount * 100,

                        callback_url:
                            process.env.PAYSTACK_CALLBACK_URL,

                        metadata: {

                            paymentType:
                                "upgrade",

                            userId:
                                userId || null,

                            plan,

                            planName:
                                selectedPlan.name,

                            durationDays:
                                selectedPlan.durationDays

                        }

                    },

                    {

                        headers: {

                            Authorization:
                                `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

                            "Content-Type":
                                "application/json"

                        }

                    }

                );


            const paystackData =
                response.data;


            // ==================================
            // RETURN PAYSTACK URL
            // ==================================

            return res.json({

                status:
                    paystackData.status,

                message:
                    paystackData.message,

                authorization_url:
                    paystackData.data?.authorization_url,

                access_code:
                    paystackData.data?.access_code,

                reference:
                    paystackData.data?.reference

            });

        }


        // ======================================
        // NORMAL PRODUCT PAYMENT
        // ======================================

        if (!amount) {

            return res.status(400).json({

                status: false,

                message:
                    "Amount is required."

            });

        }


        const response =
            await axios.post(

                "https://api.paystack.co/transaction/initialize",

                {

                    email,

                    amount:
                        Number(amount) * 100,

                    callback_url:
                        process.env.PAYSTACK_CALLBACK_URL,

                    metadata: {

                        paymentType:
                            "product",

                        productId:
                            productId || null,

                        productName:
                            productName || "",

                        buyerName:
                            buyerName || "",

                        buyerId:
                            buyerId || null,

                        sellerId:
                            sellerId || null

                    }

                },

                {

                    headers: {

                        Authorization:
                            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

                        "Content-Type":
                            "application/json"

                    }

                }

            );


        // ======================================
        // RETURN NORMALIZED RESPONSE
        // ======================================

        return res.json({

            status:
                response.data.status,

            message:
                response.data.message,

            authorization_url:
                response.data.data?.authorization_url,

            access_code:
                response.data.data?.access_code,

            reference:
                response.data.data?.reference

        });


    } catch (error) {

        console.error(

            "Payment initialization error:",

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

                    headers: {

                        Authorization:
                            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`

                    }

                }

            );


        const transaction =
            response.data.data;


        // ======================================
        // PAYMENT FAILED
        // ======================================

        if (
            transaction.status !==
            "success"
        ) {

            return res.status(400).json({

                status: false,

                message:
                    "Payment was not successful."

            });

        }


        // ======================================
        // METADATA
        // ======================================

        const metadata =
            transaction.metadata || {};


        // ======================================
        // ZIBA ACCOUNT UPGRADE
        // ======================================

        if (
            metadata.paymentType ===
            "upgrade"
        ) {

            const userId =
                metadata.userId;


            const plan =
                metadata.plan;


            const durationDays =
                Number(
                    metadata.durationDays
                );


            if (
                !userId ||
                !plan ||
                !durationDays
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
                    .collection(
                        "users"
                    )
                    .doc(userId);


            const userSnap =
                await userRef.get();


            if (
                !userSnap.exists
            ) {

                return res.status(404).json({

                    status: false,

                    message:
                        "User account not found."

                });

            }


            const userData =
                userSnap.data();


            // ==================================
            // CALCULATE EXPIRY
            // ==================================

            const now =
                new Date();


            let startDate =
                now;


            // If the user already has an
            // active premium plan, extend
            // from its expiry date.

            if (
                userData.planExpiresAt
            ) {

                const existingExpiry =
                    userData.planExpiresAt
                        .toDate
                        ? userData.planExpiresAt.toDate()
                        : new Date(
                            userData.planExpiresAt
                        );


                if (
                    existingExpiry > now
                ) {

                    startDate =
                        existingExpiry;

                }

            }


            const expiresAt =
                new Date(
                    startDate.getTime() +
                    durationDays *
                    24 *
                    60 *
                    60 *
                    1000
                );


            // ==================================
            // UPDATE USER PLAN
            // ==================================

            await userRef.update({

                plan:
                    plan,

                accountType:
                    plan,

                isPremium:
                    true,

                planStartedAt:
                    now,

                planExpiresAt:
                    expiresAt,

                lastPaymentReference:
                    transaction.reference,

                lastPaymentAmount:
                    transaction.amount / 100,

                lastPaymentStatus:
                    "paid",

                updatedAt:
                    now

            });


            // ==================================
            // SAVE PAYMENT
            // ==================================

            const paymentRef =
                db
                    .collection(
                        "payments"
                    )
                    .doc();


            await paymentRef.set({

                userId:

                    userId,

                email:

                    transaction
                        .customer
                        ?.email ||
                    "",

                paymentType:
                    "upgrade",

                plan:

                    plan,

                planName:

                    metadata.planName ||
                    "",

                amount:

                    transaction.amount /
                    100,

                reference:

                    transaction.reference,

                paymentStatus:
                    "paid",

                durationDays:

                    durationDays,

                createdAt:
                    now,

                expiresAt:
                    expiresAt

            });


            console.log(

                "Ziba plan activated:",

                {
                    userId,
                    plan,
                    expiresAt
                }

            );


            // ==================================
            // RETURN SUCCESS
            // ==================================

            return res.json({

                status: true,

                paymentType:
                    "upgrade",

                message:
                    "Payment verified and account upgraded.",

                plan:
                    plan,

                expiresAt:
                    expiresAt,

                paymentReference:
                    transaction.reference

            });

        }


        // ======================================
        // NORMAL PRODUCT ORDER
        // ======================================

        const orderRef =
            db
                .collection(
                    "orders"
                )
                .doc();


        await orderRef.set({

            buyerId:
                metadata.buyerId ||
                null,

            buyerName:
                metadata.buyerName ||
                "",

            buyerEmail:
                transaction.customer
                    ?.email ||
                "",

            sellerId:
                metadata.sellerId ||
                null,

            productId:
                metadata.productId ||
                "",

            productName:
                metadata.productName ||
                "",

            amount:
                transaction.amount /
                100,

            paymentReference:
                transaction.reference,

            paymentStatus:
                "paid",

            orderStatus:
                "pending",

            createdAt:
                new Date()

        });


        return res.json({

            status: true,

            paymentType:
                "product",

            message:
                "Payment verified and order created.",

            orderId:
                orderRef.id

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
                "Payment verification failed.",

            error:
                error.response?.data ||
                error.message

        });

    }

};

