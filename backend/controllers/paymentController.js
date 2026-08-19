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
export const verifyPayment = async (req, res) => {
    try {

        const { reference } = req.params;

        // ==========================================
        // VERIFY PAYMENT WITH PAYSTACK
        // ==========================================

        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization:
                        `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                }
            }
        );

        const transaction = response.data.data;


        // ==========================================
        // CHECK PAYMENT STATUS
        // ==========================================

        if (transaction.status !== "success") {

            return res.status(400).json({
                status: false,
                message: "Payment was not successful."
            });

        }


        // ==========================================
        // PAYMENT INFORMATION
        // ==========================================

        const metadata =
            transaction.metadata || {};

        const buyerId =
            metadata.buyerId || null;

        const sellerId =
            metadata.sellerId || null;

        const productId =
            metadata.productId || "";

        const productName =
            metadata.productName || "";

        const buyerName =
            metadata.buyerName || "";

        const amount =
            transaction.amount / 100;


        // ==========================================
        // SELLER IS REQUIRED
        // ==========================================

        if (!sellerId) {

            return res.status(400).json({
                status: false,
                message:
                    "Seller information is missing from this payment."
            });

        }


        // ==========================================
        // PREVENT DUPLICATE PAYMENT PROCESSING
        // ==========================================

        const existingPayment =
            await db
                .collection("payments")
                .doc(reference)
                .get();


        if (existingPayment.exists) {

            const existingData =
                existingPayment.data();

            return res.json({
                status: true,
                message:
                    "Payment has already been processed.",
                orderId:
                    existingData.orderId || null
            });

        }


        // ==========================================
        // REFERENCES
        // ==========================================

        const sellerRef =
            db.collection("users").doc(sellerId);

        const orderRef =
            db.collection("orders").doc();

        const paymentRef =
            db.collection("payments").doc(reference);


        // ==========================================
        // FIRESTORE TRANSACTION
        // ==========================================

        const result =
            await db.runTransaction(
                async (transactionDb) => {

                    // Get seller first
                    const sellerSnap =
                        await transactionDb.get(
                            sellerRef
                        );


                    if (!sellerSnap.exists) {

                        throw new Error(
                            "Seller account not found."
                        );

                    }


                    const sellerData =
                        sellerSnap.data();


                    // Current seller balance
                    const currentBalance =
                        Number(
                            sellerData.availableBalance ||
                            sellerData.walletBalance ||
                            sellerData.balance ||
                            0
                        );


                    // ==================================
                    // NEW BALANCE
                    // ==================================

                    const newBalance =
                        currentBalance + amount;


                    // ==================================
                    // UPDATE SELLER BALANCE
                    // ==================================

                    transactionDb.update(
                        sellerRef,
                        {
                            availableBalance:
                                newBalance
                        }
                    );


                    // ==================================
                    // CREATE ORDER
                    // ==================================

                    transactionDb.set(
                        orderRef,
                        {
                            buyerId:
                                buyerId,

                            buyerName:
                                buyerName,

                            buyerEmail:
                                transaction.customer?.email ||
                                "",

                            sellerId:
                                sellerId,

                            productId:
                                productId,

                            productName:
                                productName,

                            amount:
                                amount,

                            paymentReference:
                                transaction.reference,

                            paymentStatus:
                                "paid",

                            orderStatus:
                                "pending",

                            createdAt:
                                new Date()
                        }
                    );


                    // ==================================
                    // SAVE PAYMENT RECORD
                    // ==================================

                    transactionDb.set(
                        paymentRef,
                        {
                            reference:
                                reference,

                            buyerId:
                                buyerId,

                            sellerId:
                                sellerId,

                            productId:
                                productId,

                            amount:
                                amount,

                            status:
                                "success",

                            type:
                                "product",

                            orderId:
                                orderRef.id,

                            createdAt:
                                new Date()
                        }
                    );


                    return {
                        orderId:
                            orderRef.id,

                        sellerBalance:
                            newBalance
                    };

                }
            );


        // ==========================================
        // SUCCESS
        // ==========================================

        console.log(
            "✅ Payment processed successfully"
        );

        console.log(
            "Seller:",
            sellerId
        );

        console.log(
            "Amount:",
            amount
        );

        console.log(
            "New seller balance:",
            result.sellerBalance
        );


        res.json({

            status: true,

            message:
                "Payment verified successfully.",

            orderId:
                result.orderId,

            sellerBalance:
                result.sellerBalance

        });


    } catch (error) {

        console.error(
            "❌ Payment verification error:",
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