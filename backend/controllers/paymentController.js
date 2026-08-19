import axios from "axios";
import { db } from "../firebase-admin.js";


// =====================================================
// INITIALIZE PAYMENT
// =====================================================

export const initializePayment = async (req, res) => {

    try {

        const {
            email,
            amount,

            // Product payment
            productId,
            productName,
            buyerName,
            buyerId,
            sellerId,

            // Upgrade payment
            userId,
            plan,
            paymentType

        } = req.body;


        // =================================================
        // BASIC VALIDATION
        // =================================================

        if (!email) {

            return res.status(400).json({
                status: false,
                message: "Email is required."
            });

        }


        if (!amount || Number(amount) <= 0) {

            return res.status(400).json({
                status: false,
                message: "Valid payment amount is required."
            });

        }


        // =================================================
        // UPGRADE PAYMENT
        // =================================================

        if (
            paymentType === "upgrade"
        ) {

            if (!userId) {

                return res.status(400).json({
                    status: false,
                    message: "User ID is required."
                });

            }


            if (!plan) {

                return res.status(400).json({
                    status: false,
                    message: "Plan is required."
                });

            }


            // Only allow your actual plans

            const allowedPlans = [
                "daily",
                "weekly",
                "monthly"
            ];


            if (
                !allowedPlans.includes(
                    String(plan).toLowerCase()
                )
            ) {

                return res.status(400).json({
                    status: false,
                    message: "Invalid upgrade plan."
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
                                "upgrade",

                            userId,

                            plan,

                            amount:
                                Number(amount)

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


            return res.json(
                response.data
            );

        }


        // =================================================
        // PRODUCT PAYMENT
        // =================================================

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
                            productId || "",

                        productName:
                            productName || "",

                        buyerName:
                            buyerName || "",

                        buyerId:
                            buyerId || "",

                        sellerId:
                            sellerId || ""

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


        return res.json(
            response.data
        );


    } catch (error) {

        console.error(
            "Payment initialization error:",
            error.response?.data ||
            error.message
        );


        return res.status(500).json({

            status: false,

            message:
                "Payment initialization failed.",

            error:
                error.response?.data ||
                error.message

        });

    }

};



// =====================================================
// VERIFY PAYMENT
// =====================================================

export const verifyPayment = async (
    req,
    res
) => {

    try {

        const {
            reference
        } = req.params;


        // =================================================
        // VERIFY WITH PAYSTACK
        // =================================================

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


        // =================================================
        // CHECK SUCCESS
        // =================================================

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


        // =================================================
        // GET METADATA
        // =================================================

        const metadata =
            transaction.metadata || {};


        // =================================================
        // UPGRADE PAYMENT
        // =================================================

        if (
            metadata.paymentType ===
            "upgrade"
        ) {

            const userId =
                metadata.userId;


            const plan =
                String(
                    metadata.plan || ""
                ).toLowerCase();


            if (!userId || !plan) {

                return res.status(400).json({

                    status: false,

                    message:
                        "Upgrade information is missing."

                });

            }


            // =============================================
            // DETERMINE PLAN DURATION
            // =============================================

            let durationMilliseconds;


            switch (plan) {

                case "daily":

                    durationMilliseconds =
                        24 *
                        60 *
                        60 *
                        1000;

                    break;


                case "weekly":

                    durationMilliseconds =
                        7 *
                        24 *
                        60 *
                        60 *
                        1000;

                    break;


                case "monthly":

                    durationMilliseconds =
                        30 *
                        24 *
                        60 *
                        60 *
                        1000;

                    break;


                default:

                    return res.status(400).json({

                        status: false,

                        message:
                            "Invalid plan."

                    });

            }


            // =============================================
            // EXPIRATION DATE
            // =============================================

            const planExpiresAt =
                new Date(
                    Date.now() +
                    durationMilliseconds
                );


            // =============================================
            // UPDATE USER
            // =============================================

            await db
                .collection("users")
                .doc(userId)
                .update({

                    plan,

                    isPremium:
                        true,

                    planExpiresAt,

                    lastPaymentReference:
                        transaction.reference,

                    lastPaymentAmount:
                        transaction.amount / 100,

                    updatedAt:
                        new Date()

                });


            console.log(
                "✅ Plan activated:",
                userId,
                plan
            );


            return res.json({

                status: true,

                type:
                    "upgrade",

                message:
                    "Payment verified and account upgraded.",

                plan,

                planExpiresAt,

                reference:
                    transaction.reference

            });

        }


        // =================================================
        // PRODUCT PAYMENT
        // =================================================

        const orderRef =
            db
                .collection("orders")
                .doc();


        await orderRef.set({

            buyerId:
                metadata.buyerId ||
                null,

            buyerName:
                metadata.buyerName ||
                "",

            buyerEmail:
                transaction.customer?.email ||
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

            type:
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