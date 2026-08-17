import axios from "axios";
import { db } from "../firebase-admin.js";

export const initializePayment = async (req, res) => {
    try {

        const {
            email,
            amount,
            productId,
            productName,
            buyerName,
            buyerId,
            sellerId
        } = req.body;

        const response = await axios.post(
            "https://api.paystack.co/transaction/initialize",
            {
                email,
                amount: amount * 100,
                callback_url: process.env.PAYSTACK_CALLBACK_URL,

                metadata: {
                    productId,
                    productName,
                    buyerName,
                    buyerId,
                    sellerId
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

        res.json(response.data);

    } catch (error) {

        console.error(
            error.response?.data ||
            error.message
        );

        res.status(500).json({
            message:
                "Payment initialization failed"
        });
    }
};export const verifyPayment = async (req, res) => {
    try {
        const { reference } = req.params;

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

        // Make sure Paystack actually says the payment succeeded
        if (transaction.status !== "success") {
            return res.json({
                status: false,
                message: "Payment was not successful."
            });
        }

        // Information we attached when initializing the payment
        const metadata = transaction.metadata || {};

        // Create a new Firestore order
        const orderRef = db.collection("orders").doc();

        await orderRef.set({
            buyerId: metadata.buyerId || null,
            buyerName: metadata.buyerName || "",
            buyerEmail: transaction.customer?.email || "",

            sellerId: metadata.sellerId || null,

            productId: metadata.productId || "",
            productName: metadata.productName || "",

            amount: transaction.amount / 100,

            paymentReference: transaction.reference,

            paymentStatus: "paid",
            orderStatus: "pending",

            createdAt: new Date()
        });

        res.json({
            status: true,
            message: "Payment verified and order created.",
            orderId: orderRef.id
        });

    } catch (error) {

        console.error(
            "Payment verification error:",
            error.response?.data ||
            error.message
        );

        // res.status(500).json({
        //     status: false,
        //     message: "Payment verification failed"
        // });
        res.status(500).json({
    status: false,
    message: "Payment verification failed",
    error: error.response?.data || error.message
});
    }
};