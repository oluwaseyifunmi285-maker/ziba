import { db } from "../firebase-admin.js";


// ==========================================
// CREATE PRODUCT ORDER
// BUYER CLICKS "BUY NOW"
// ==========================================

export const createOrder = async (req, res) => {

    try {

        const {
            buyerId,
            buyerName,
            buyerEmail,
            sellerId,
            productId,
            productName,
            amount
        } = req.body;


        // ======================================
        // VALIDATION
        // ======================================

        if (
            !buyerId ||
            !buyerName ||
            !buyerEmail ||
            !sellerId ||
            !productId ||
            !productName ||
            amount === undefined ||
            amount === null
        ) {

            return res.status(400).json({

                status: false,

                message:
                    "Missing required order information."

            });

        }


        const numericAmount =
            Number(amount);


        if (
            !Number.isFinite(numericAmount) ||
            numericAmount <= 0
        ) {

            return res.status(400).json({

                status: false,

                message:
                    "Invalid order amount."

            });

        }


        // ======================================
        // GET SELLER
        // ======================================

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


        const seller =
            sellerSnap.data();


        // ======================================
        // CHECK SELLER BANK ACCOUNT
        // ======================================

        if (
            !seller.bankConnected ||
            !seller.bankName ||
            !seller.accountName ||
            !seller.accountNumber
        ) {

            return res.status(400).json({

                status: false,

                message:
                    "Seller has not connected a complete bank account."

            });

        }


        // ======================================
        // CREATE ORDER
        // ======================================

        const orderRef =
            await db
                .collection("orders")
                .add({

                    buyerId,

                    buyerName,

                    buyerEmail,

                    sellerId,

                    productId,

                    productName,

                    amount:
                        numericAmount,


                    // ==========================
                    // PAYMENT
                    // ==========================

                    paymentMethod:
                        "bank_transfer",

                    paymentStatus:
                        "awaiting_payment",

                    buyerConfirmed:
                        false,

                    adminVerified:
                        false,


                    // ==========================
                    // ORDER
                    // ==========================

                    orderStatus:
                        "pending",


                    // ==========================
                    // MONEY
                    // ==========================

                    commission:
                        0,

                    sellerAmount:
                        0,


                    createdAt:
                        new Date(),

                    updatedAt:
                        new Date()

                });


        // ======================================
        // RETURN SELLER BANK DETAILS
        // ======================================

        return res.status(201).json({

            status: true,

            message:
                "Order created successfully.",

            orderId:
                orderRef.id,


            paymentDetails: {

                amount:
                    numericAmount,

                bankName:
                    seller.bankName,

                accountName:
                    seller.accountName,

                accountNumber:
                    seller.accountNumber

            }

        });

    }


    catch (error) {

        console.error(
            "Create order error:",
            error
        );


        return res.status(500).json({

            status: false,

            message:
                "Unable to create order."

        });

    }

};



// ==========================================
// BUYER CONFIRMS BANK TRANSFER
// ==========================================

export const buyerConfirmPayment = async (req, res) => {

    try {

        const {
            orderId,
            buyerId
        } = req.body;


        // ======================================
        // VALIDATION
        // ======================================

        if (
            !orderId ||
            !buyerId
        ) {

            return res.status(400).json({

                status: false,

                message:
                    "Order ID and buyer ID are required."

            });

        }


        // ======================================
        // GET ORDER
        // ======================================

        const orderRef =
            db
                .collection("orders")
                .doc(orderId);


        const orderSnap =
            await orderRef.get();


        if (!orderSnap.exists) {

            return res.status(404).json({

                status: false,

                message:
                    "Order not found."

            });

        }


        const order =
            orderSnap.data();


        // ======================================
        // CHECK BUYER
        // ======================================

        if (
            order.buyerId !== buyerId
        ) {

            return res.status(403).json({

                status: false,

                message:
                    "You are not authorized to confirm this order."

            });

        }


        // ======================================
        // ALREADY VERIFIED
        // ======================================

        if (
            order.adminVerified === true
        ) {

            return res.status(400).json({

                status: false,

                message:
                    "This payment has already been verified."

            });

        }


        // ======================================
        // ALREADY SUBMITTED
        // ======================================

        if (
            order.buyerConfirmed === true
        ) {

            return res.status(400).json({

                status: false,

                message:
                    "Payment has already been submitted for verification."

            });

        }


        // ======================================
        // UPDATE ORDER
        // ======================================

        await orderRef.update({

            buyerConfirmed:
                true,

            paymentStatus:
                "buyer_confirmed",

            orderStatus:
                "payment_verification",

            buyerConfirmedAt:
                new Date(),

            updatedAt:
                new Date()

        });


        // ======================================
        // SUCCESS
        // ======================================

        return res.json({

            status: true,

            message:
                "Payment submitted successfully. Waiting for admin verification.",

            orderId

        });

    }


    catch (error) {

        console.error(
            "Buyer confirmation error:",
            error
        );


        return res.status(500).json({

            status: false,

            message:
                "Unable to submit payment confirmation."

        });

    }

};



// ==========================================
// GET PENDING PAYMENTS
// ADMIN
// ==========================================

export const getPendingPayments = async (req, res) => {

    try {

        const snapshot =
            await db
                .collection("orders")
                .where(
                    "paymentStatus",
                    "==",
                    "buyer_confirmed"
                )
                .get();


        const payments = [];


        snapshot.forEach((orderDoc) => {

            payments.push({

                id:
                    orderDoc.id,

                ...orderDoc.data()

            });

        });


        return res.json({

            status: true,

            payments

        });

    }


    catch (error) {

        console.error(
            "Get pending payments error:",
            error
        );


        return res.status(500).json({

            status: false,

            message:
                "Unable to load pending payments."

        });

    }

};



// ==========================================
// VERIFY PAYMENT
// ADMIN
// ==========================================

export const verifyPayment = async (req, res) => {

    try {

        const {
            paymentId
        } = req.params;


        // ======================================
        // GET ORDER
        // ======================================

        const orderRef =
            db
                .collection("orders")
                .doc(paymentId);


        const orderSnap =
            await orderRef.get();


        if (!orderSnap.exists) {

            return res.status(404).json({

                status: false,

                message:
                    "Order not found."

            });

        }


        const order =
            orderSnap.data();


        // ======================================
        // ALREADY VERIFIED
        // ======================================

        if (
            order.adminVerified === true
        ) {

            return res.status(400).json({

                status: false,

                message:
                    "Payment has already been verified."

            });

        }


        // ======================================
        // BUYER MUST CONFIRM FIRST
        // ======================================

        if (
            order.buyerConfirmed !== true
        ) {

            return res.status(400).json({

                status: false,

                message:
                    "Buyer has not confirmed payment yet."

            });

        }


        // ======================================
        // CALCULATE COMMISSION
        // ======================================

        const amount =
            Number(
                order.amount || 0
            );


        // Ziba commission = 10%
        const commissionRate =
            0.10;


        const commission =
            amount *
            commissionRate;


        const sellerAmount =
            amount -
            commission;


        // ======================================
        // UPDATE ORDER
        // ======================================

        await orderRef.update({

            paymentStatus:
                "paid",

            orderStatus:
                "pending",

            adminVerified:
                true,

            commission:
                commission,

            sellerAmount:
                sellerAmount,

            paidAt:
                new Date(),

            verifiedAt:
                new Date(),

            updatedAt:
                new Date()

        });


        // ======================================
        // UPDATE SELLER BALANCE
        // ======================================

        const sellerRef =
            db
                .collection("users")
                .doc(order.sellerId);


        const sellerSnap =
            await sellerRef.get();


        if (sellerSnap.exists) {

            const seller =
                sellerSnap.data();


            const currentBalance =
                Number(
                    seller.balance || 0
                );


            await sellerRef.update({

                balance:
                    currentBalance +
                    sellerAmount,

                updatedAt:
                    new Date()

            });

        }


        // ======================================
        // SUCCESS
        // ======================================

        return res.json({

            status: true,

            message:
                "Payment verified successfully.",

            orderId:
                paymentId,

            amount,

            commission,

            sellerAmount

        });

    }


    catch (error) {

        console.error(
            "Verify payment error:",
            error
        );


        return res.status(500).json({

            status: false,

            message:
                "Unable to verify payment."

        });

    }

};