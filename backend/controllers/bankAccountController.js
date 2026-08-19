import { db } from "../firebase-admin.js";


// ==========================================
// GET SELLER BANK ACCOUNT
// ==========================================

export const getBankAccount = async (req, res) => {

    try {

        const { userId } = req.params;

        if (!userId) {

            return res.status(400).json({
                status: false,
                message: "User ID is required."
            });

        }


        const userRef =
            db.collection("users").doc(userId);

        const userSnap =
            await userRef.get();


        if (!userSnap.exists) {

            return res.status(404).json({
                status: false,
                message: "Seller account not found."
            });

        }


        const userData =
            userSnap.data();


        if (
            !userData.bankCode ||
            !userData.accountNumber
        ) {

            return res.status(404).json({
                status: false,
                message: "No bank account connected."
            });

        }


        return res.json({

            status: true,

            bankCode:
                userData.bankCode,

            accountNumber:
                userData.accountNumber,

            accountName:
                userData.accountName || "",

            bankName:
                userData.bankName || "",

            bankConnected:
                userData.bankConnected || false

        });

    }

    catch (error) {

        console.error(
            "Get bank account error:",
            error
        );

        return res.status(500).json({

            status: false,

            message:
                "Unable to load bank account."

        });

    }

};



// ==========================================
// SAVE SELLER BANK ACCOUNT
// ==========================================

export const verifyBankAccount = async (req, res) => {

    try {

        const {
            userId,
            bankName,
            bankCode,
            accountName,
            accountNumber
        } = req.body;


        // ======================================
        // VALIDATION
        // ======================================

        if (
            !userId ||
            !bankName ||
            !accountName ||
            !accountNumber
        ) {

            return res.status(400).json({

                status: false,

                message:
                    "Bank name, account name, account number and user ID are required."

            });

        }


        // ======================================
        // ACCOUNT NUMBER VALIDATION
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


        // ======================================
        // SAVE BANK DETAILS
        // ======================================

        await userRef.update({

            bankName:
                bankName.trim(),

            bankCode:
                bankCode || "",

            accountName:
                accountName.trim(),

            accountNumber:
                accountNumber.trim(),

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

        return res.json({

            status: true,

            message:
                "Bank account saved successfully.",

            bankName:
                bankName.trim(),

            bankCode:
                bankCode || "",

            accountName:
                accountName.trim(),

            accountNumber:
                accountNumber.trim()

        });

    }

    catch (error) {

        console.error(
            "Save bank account error:",
            error
        );

        return res.status(500).json({

            status: false,

            message:
                "Unable to save bank account."

        });

    }

};