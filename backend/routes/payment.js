import express from "express";

import {
    createOrder,
    buyerConfirmPayment,
    getPendingPayments,
    verifyPayment
} from "../controllers/paymentController.js";

const router = express.Router();


router.post(
    "/order",
    createOrder
);


router.post(
    "/order/buyer-confirm",
    buyerConfirmPayment
);


router.get(
    "/pending",
    getPendingPayments
);


router.post(
    "/verify/:paymentId",
    verifyPayment
);


export default router;