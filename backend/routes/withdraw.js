import express from "express";

import {
    withdrawFunds
} from "../controllers/withdrawalController.js";


const router =
    express.Router();


router.post(
    "/",
    withdrawFunds
);


export default router;