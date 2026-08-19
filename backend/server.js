import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import paymentRoutes from "./routes/payment.js";
import withdrawRoutes from "./routes/withdraw.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {
    res.send("🚀 Ziba Backend Running");
});


// ==========================================
// PRODUCT PAYMENTS
// ==========================================

app.use(
    "/api/payment",
    paymentRoutes
);


// ==========================================
// SELLER WITHDRAWALS
// ==========================================

app.use(
    "/api/withdraw",
    withdrawRoutes
);


// ==========================================
// SERVER
// ==========================================

const PORT =
    process.env.PORT || 3000;

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `🚀 Server running on port ${PORT}`
        );
    }
);