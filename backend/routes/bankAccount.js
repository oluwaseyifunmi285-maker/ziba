// routes/bankAccount.js

import express from "express";

import {
    getBankAccount,
    verifyBankAccount
} from "../controllers/bankAccountController.js";

const router = express.Router();

router.get(
    "/:userId",
    getBankAccount
);

router.post(
    "/verify",
    verifyBankAccount
);

export default router;