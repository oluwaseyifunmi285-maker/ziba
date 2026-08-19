
import express from "express";

import {
    getBankAccount,
    verifyBankAccount
} from "../controllers/bankAccountController.js";


const router =
    express.Router();


// ==========================================
// GET SELLER BANK ACCOUNT
// ==========================================

router.get(
    "/:userId",
    getBankAccount
);


// ==========================================
// VERIFY + SAVE SELLER BANK ACCOUNT
// ==========================================

router.post(
    "/verify",
    verifyBankAccount
);


export default router;

