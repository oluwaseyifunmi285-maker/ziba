
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import paymentRoutes from "./routes/payment.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Home Route
app.get("/", (req, res) => {
    res.send("🚀 Ziba Backend Running");
});

// Payment Routes
app.use("/api/payment", paymentRoutes);
app.get("/api/payment/verify/:reference", async (req, res) => {
    try {
        const { reference } = req.params;

        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                }
            }
        );

        const transaction = response.data.data;

        res.json({
            status: transaction.status === "success",
            data: transaction
        });

    } catch (error) {
        console.error(
            "Payment verification error:",
            error.response?.data || error.message
        );

        res.status(500).json({
            status: false,
            message: "Unable to verify payment"
        });
    }
});

// Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});