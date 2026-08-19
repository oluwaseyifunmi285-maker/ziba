import axios from "axios";
import { db } from "../firebase-admin.js";


// ==========================================
// WITHDRAW SELLER FUNDS
// ==========================================

export const withdrawFunds = async (req, res) => {

    try {

        const {
            userId,
            email,
            amount,
            bankCode,
            accountNumber
        } = req.body;


        // ======================================
        // VALIDATION
        // ======================================

        if (
            !userId ||
            !amount ||
            !bankCode ||
            !accountNumber
        ) {

            return res.status(400).json({
                message: "Missing withdrawal information."
            });

        }


        const withdrawalAmount =
            Number(amount);


        if (
            !Number.isFinite(withdrawalAmount) ||
            withdrawalAmount < 100
        ) {

            return res.status(400).json({
                message:
                    "Minimum withdrawal amount is ₦100."
            });

        }


        if (
            !/^\d{10}$/.test(accountNumber)
        ) {

            return res.status(400).json({
                message:
                    "Invalid account number."
            });

        }


        // ======================================
        // GET SELLER
        // ======================================

        const userRef =
            db.collection("users").doc(userId);

        const userSnap =
            await userRef.get();


        if (!userSnap.exists) {

            return res.status(404).json({
                message: "Seller account not found."
            });

        }


        const userData =
            userSnap.data();


        // ======================================
        // GET REAL BALANCE
        // ======================================

        const availableBalance =
            Number(
                userData.availableBalance ??
                userData.walletBalance ??
                userData.balance ??
                0
            );


        // ======================================
        // CHECK BALANCE
        // ======================================

        if (
            withdrawalAmount >
            availableBalance
        ) {

            return res.status(400).json({
                message:
                    "Insufficient balance."
            });

        }


        // ======================================
        // PAYSTACK SECRET KEY
        // ======================================

        if (
            !process.env.PAYSTACK_SECRET_KEY
        ) {

            return res.status(500).json({
                message:
                    "Paystack secret key is not configured."
            });

        }


        const headers = {

            Authorization:
                `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

            "Content-Type":
                "application/json"

        };


        // ======================================
        // CREATE PAYSTACK TRANSFER RECIPIENT
        // ======================================

        const recipientResponse =
            await axios.post(

                "https://api.paystack.co/transferrecipient",

                {
                    type: "nuban",

                    name:
                        userData.fullName ||
                        userData.name ||
                        "Ziba Seller",

                    account_number:
                        accountNumber,

                    bank_code:
                        bankCode,

                    currency: "NGN"

                },

                {
                    headers
                }

            );


        if (
            !recipientResponse.data.status
        ) {

            return res.status(400).json({

                message:
                    recipientResponse.data.message ||
                    "Unable to create transfer recipient."

            });

        }


        const recipientCode =
            recipientResponse.data.data.recipient_code;


        // ======================================
        // CREATE WITHDRAWAL RECORD
        // ======================================

        const withdrawalRef =
            db.collection("withdrawals").doc();


        await withdrawalRef.set({

            userId,

            email:
                email ||
                userData.email ||
                "",

            amount:
                withdrawalAmount,

            bankCode,

            accountNumber,

            recipientCode,

            status: "processing",

            createdAt:
                new Date()

        });


        // ======================================
        // SEND PAYSTACK TRANSFER
        // ======================================

        const transferResponse =
            await axios.post(

                "https://api.paystack.co/transfer",

                {

                    source: "balance",

                    amount:
                        withdrawalAmount * 100,

                    recipient:
                        recipientCode,

                    reason:
                        "Ziba seller withdrawal"

                },

                {
                    headers
                }

            );


        if (
            !transferResponse.data.status
        ) {

            await withdrawalRef.update({

                status: "failed",

                failureReason:
                    transferResponse.data.message ||
                    "Transfer failed."

            });


            return res.status(400).json({

                message:
                    transferResponse.data.message ||
                    "Withdrawal failed."

            });

        }


        // ======================================
        // PAYSTACK TRANSFER DATA
        // ======================================

        const transfer =
            transferResponse.data.data;


        // ======================================
        // DEDUCT BALANCE
        // ======================================

        const newBalance =
            availableBalance -
            withdrawalAmount;


        await userRef.update({

            availableBalance:
                newBalance

        });


        // ======================================
        // UPDATE WITHDRAWAL
        // ======================================

        await withdrawalRef.update({

            status:
                transfer.status ||
                "pending",

            transferCode:
                transfer.transfer_code ||
                "",

            reference:
                transfer.reference ||
                ""

        });


        // ======================================
        // RESPONSE
        // ======================================

        return res.json({

            status: true,

            message:
                "Withdrawal request submitted successfully.",

            withdrawalId:
                withdrawalRef.id,

            amount:
                withdrawalAmount,

            balance:
                newBalance,

            transferStatus:
                transfer.status ||
                "pending"

        });

} catch (error) {

    console.error(
        "Withdrawal error:",
        error.response?.data ||
        error.message
    );

    const paystackMessage =
        error.response?.data?.message ||
        error.message ||
        "Withdrawal failed.";

    return res.status(
        error.response?.status || 500
    ).json({

        status: false,

        message:
            paystackMessage,

        error:
            error.response?.data || null

    });

}

};