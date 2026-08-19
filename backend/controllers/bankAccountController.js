
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
// GET SELLER BANK ACCOUNT
// ==========================================

export const getBankAccount = async (req, res) => {

    try {

        const { userId } = req.params;


        if (!userId) {

            return res.status(400).json({

                message:
                    "User ID is required."

            });

        }


        const userRef =
            db.collection("users").doc(userId);


        const userSnap =
            await userRef.get();


        if (!userSnap.exists) {

            return res.status(404).json({

                message:
                    "User account not found."

            });

        }


        const userData =
            userSnap.data();


        // ======================================
        // NO BANK ACCOUNT
        // ======================================

        if (
            !userData.bankCode ||
            !userData.accountNumber
        ) {

            return res.status(404).json({

                message:
                    "No bank account connected."

            });

        }


        // ======================================
        // RETURN SAVED BANK ACCOUNT
        // ======================================

        return res.json({

            status: true,

            bankCode:
                userData.bankCode,

            accountNumber:
                userData.accountNumber,

            accountName:
                userData.accountName || "",

            recipientCode:
                userData.recipientCode || "",

            bankConnected:
                true

        });


    } catch (error) {

        console.error(
            "Get bank account error:",
            error.response?.data ||
            error.message
        );


        return res.status(500).json({

            status: false,

            message:
                "Unable to load bank account."

        });

    }

};



// ==========================================
// VERIFY + SAVE BANK ACCOUNT
// ==========================================

export const verifyBankAccount = async (req, res) => {

    try {

        const {
            userId,
            email,
            bankCode,
            accountNumber
        } = req.body;


        // ======================================
        // VALIDATION
        // ======================================

        if (
            !userId ||
            !bankCode ||
            !accountNumber
        ) {

            return res.status(400).json({

                status: false,

                message:
                    "Bank code, account number and user ID are required."

            });

        }


        if (
            !/^\d{10}$/.test(accountNumber)
        ) {

            return res.status(400).json({

                status: false,

                message:
                    "Account number must contain exactly 10 digits."

            });

        }


        // ======================================
        // CHECK PAYSTACK KEY
        // ======================================

        if (
            !process.env.PAYSTACK_SECRET_KEY
        ) {

            return res.status(500).json({

                status: false,

                message:
                    "Paystack secret key is not configured."

            });

        }


        // ======================================
        // VERIFY ACCOUNT WITH PAYSTACK
        // ======================================

        console.log(
            "Verifying bank account:",
            bankCode,
            accountNumber
        );


        const resolveResponse =
            await axios.get(

                "https://api.paystack.co/bank/resolve",

                {

                    params: {

                        account_number:
                            accountNumber,

                        bank_code:
                            bankCode

                    },

                    headers:
                        paystackHeaders

                }

            );


        if (
            !resolveResponse.data.status
        ) {

            return res.status(400).json({

                status: false,

                message:
                    resolveResponse.data.message ||
                    "Unable to verify bank account."

            });

        }


        const resolvedAccount =
            resolveResponse.data.data;


        const verifiedAccountName =
            resolvedAccount.account_name;


        // ======================================
        // GET USER
        // ======================================

        const userRef =
            db.collection("users").doc(userId);


        const userSnap =
            await userRef.get();


        if (!userSnap.exists) {

            return res.status(404).json({

                status: false,

                message:
                    "Seller account not found."

            });

        }


        const userData =
            userSnap.data();


        // ======================================
        // CREATE PAYSTACK TRANSFER RECIPIENT
        // ======================================

        console.log(
            "Creating Paystack recipient..."
        );


        const recipientResponse =
            await axios.post(

                "https://api.paystack.co/transferrecipient",

                {

                    type: "nuban",

                    name:
                        verifiedAccountName,

                    account_number:
                        accountNumber,

                    bank_code:
                        bankCode,

                    currency:
                        "NGN"

                },

                {

                    headers:
                        paystackHeaders

                }

            );


        if (
            !recipientResponse.data.status
        ) {

            return res.status(400).json({

                status: false,

                message:
                    recipientResponse.data.message ||
                    "Unable to create Paystack recipient."

            });

        }


        const recipient =
            recipientResponse.data.data;


        const recipientCode =
            recipient.recipient_code;


        // ======================================
        // SAVE TO FIRESTORE
        // ======================================

        await userRef.update({

            bankCode:
                bankCode,

            accountNumber:
                accountNumber,

            accountName:
                verifiedAccountName,

            recipientCode:
                recipientCode,

            bankConnected:
                true,

            bankConnectedAt:
                new Date(),

            updatedAt:
                new Date()

        });


        // ======================================
        // SUCCESS
        // ======================================

        console.log(
            "Bank account connected:",
            verifiedAccountName
        );


        return res.json({

            status: true,

            message:
                "Bank account verified and connected successfully.",

            accountName:
                verifiedAccountName,

            bankCode:
                bankCode,

            accountNumber:
                accountNumber,

            recipientCode:
                recipientCode

        });


    } catch (error) {

        console.error(
            "Bank verification error:",
            error.response?.data ||
            error.message
        );


        return res.status(500).json({

            status: false,

            message:
                error.response?.data?.message ||
                "Unable to verify bank account.",

            error:
                error.response?.data ||
                error.message

        });

    }

};

