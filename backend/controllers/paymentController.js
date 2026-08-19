import axios from "axios";
import { db } from "../firebase-admin.js";

export const initializePayment = async (req, res) => {
    try {

        const {
            email,
            amount,
            plan,
            userId
        } = req.body;

        if (!email || !amount || !plan || !userId) {
            return res.status(400).json({
                status: false,
                message: "Missing payment information."
            });
        }

        const response = await axios.post(
            "https://api.paystack.co/transaction/initialize",
            {
                email,
                amount: Number(amount) * 100,

                callback_url:
                    process.env.PAYSTACK_CALLBACK_URL,

                metadata: {
                    paymentType: "upgrade",
                    userId,
                    plan,
                    amount: Number(amount)
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

        res.json({
            status: true,
            authorization_url:
                response.data.data.authorization_url,

            access_code:
                response.data.data.access_code,

            reference:
                response.data.data.reference
        });

    } catch (error) {

        console.error(
            "Paystack initialize error:",
            error.response?.data ||
            error.message
        );

        res.status(500).json({
            status: false,
            message:
                "Payment initialization failed."
        });
    }
};


export const verifyPayment = async (req, res) => {

    try {

        const { reference } =
            req.params;


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


        const metadata =
            transaction.metadata || {};


        // =====================================
        // UPGRADE PAYMENT
        // =====================================

        if (
            metadata.paymentType ===
            "upgrade"
        ) {

            const userId =
                metadata.userId;

            const plan =
                metadata.plan;


            if (!userId || !plan) {

                return res.status(400).json({
                    status: false,
                    message:
                        "Upgrade information is missing."
                });

            }


            // Get existing user
            const userRef =
                db.collection("users")
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


            // =====================================
            // PLAN DURATION
            // =====================================

            let durationMs;


            if (plan === "daily") {

                durationMs =
                    24 * 60 * 60 * 1000;

            } else if (
                plan === "weekly"
            ) {

                durationMs =
                    7 * 24 * 60 * 60 * 1000;

            } else if (
                plan === "monthly"
            ) {

                durationMs =
                    30 * 24 * 60 * 60 * 1000;

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


            // =====================================
            // IMPORTANT
            // KEEP accountType = seller
            // =====================================

            await userRef.update({

                // DO NOT change this to daily/weekly/monthly
                accountType:
                    existingUser.accountType ||
                    "seller",

                plan:
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

                userId:
                    userId,

                plan:
                    plan,

                accountType:
                    existingUser.accountType ||
                    "seller",

                planExpiresAt:
                    expiresAt.toISOString()

            });

        }


        // =====================================
        // PRODUCT PAYMENT
        // =====================================

        const orderRef =
            db.collection("orders").doc();


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
                transaction.amount / 100,

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


        res.status(500).json({

            status: false,

            message:
                "Payment verification failed.",

            error:
                error.response?.data ||
                error.message

        });

    }

};