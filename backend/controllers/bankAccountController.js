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

                status: false,

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

                status: false,

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

                status: false,

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

            subaccountCode:
                userData.subaccountCode || "",

            bankConnected:
                userData.bankConnected || false

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
// VERIFY + CREATE PAYSTACK SUBACCOUNT
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


        // ======================================
        // VALIDATE ACCOUNT NUMBER
        // ======================================

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
        // VERIFY BANK ACCOUNT WITH PAYSTACK
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


        console.log(
            "Account resolved:",
            verifiedAccountName
        );


        // ======================================
        // CHECK IF SELLER ALREADY HAS SUBACCOUNT
        // ======================================

        if (
            userData.subaccountCode &&
            userData.bankCode === bankCode &&
            userData.accountNumber === accountNumber
        ) {

            console.log(
                "Seller already has a Paystack subaccount:",
                userData.subaccountCode
            );


            // Update the verified account information
            await userRef.update({

                accountName:
                    verifiedAccountName,

                bankConnected:
                    true,

                updatedAt:
                    new Date()

            });


            return res.json({

                status: true,

                message:
                    "Bank account verified successfully.",

                accountName:
                    verifiedAccountName,

                bankCode:
                    bankCode,

                accountNumber:
                    accountNumber,

                subaccountCode:
                    userData.subaccountCode

            });

        }


        // ======================================
        // CREATE PAYSTACK SUBACCOUNT
        // ======================================

        console.log(
            "Creating Paystack subaccount..."
        );


        const subaccountResponse =
            await axios.post(

                "https://api.paystack.co/subaccount",

                {

                    business_name:
                        verifiedAccountName,

                    settlement_bank:
                        bankCode,

                    account_number:
                        accountNumber,

                    percentage_charge:
                        5,

                    description:
                        "Ziba marketplace seller",

                    primary_contact_email:
                        email ||
                        userData.email ||
                        ""

                },

                {

                    headers:
                        paystackHeaders

                }

            );


        if (
            !subaccountResponse.data.status
        ) {

            return res.status(400).json({

                status: false,

                message:
                    subaccountResponse.data.message ||
                    "Unable to create Paystack subaccount."

            });

        }


        // ======================================
        // GET SUBACCOUNT DATA
        // ======================================

        const subaccount =
            subaccountResponse.data.data;


        const subaccountCode =
            subaccount.subaccount_code;


        if (!subaccountCode) {

            console.error(
                "Paystack did not return a subaccount code:",
                subaccountResponse.data
            );


            return res.status(500).json({

                status: false,

                message:
                    "Paystack created the subaccount but did not return a subaccount code."

            });

        }


        console.log(
            "Paystack subaccount created:",
            subaccountCode
        );


        // ======================================
        // SAVE SELLER BANK + SUBACCOUNT
        // ======================================

        await userRef.update({

            bankCode:
                bankCode,

            accountNumber:
                accountNumber,

            accountName:
                verifiedAccountName,

            subaccountCode:
                subaccountCode,

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
            "Bank account connected successfully:",
            verifiedAccountName
        );


        return res.json({

            status: true,

            message:
                "Bank account verified and Paystack subaccount created successfully.",

            accountName:
                verifiedAccountName,

            bankCode:
                bankCode,

            accountNumber:
                accountNumber,

            subaccountCode:
                subaccountCode

        });


    } catch (error) {

        console.error(
            "Bank verification error:",
            error.response?.data ||
            error.message
        );


        return res.status(

            error.response?.status || 500

        ).json({

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