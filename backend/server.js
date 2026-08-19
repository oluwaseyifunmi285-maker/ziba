import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import paymentRoutes
    from "./routes/paymentRoutes.js";

import bankAccountRoutes
    from "./routes/bankAccount.js";


dotenv.config();


const app = express();


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// ==========================================
// TEST ROUTE
// ==========================================

app.get("/", (req, res) => {

    res.json({

        status: true,

        message:
            "Ziba backend is running."

    });

});


// ==========================================
// PAYMENT ROUTES
// ==========================================

app.use(
    "/api/payment",
    paymentRoutes
);


// ==========================================
// BANK ACCOUNT ROUTES
// ==========================================

app.use(
    "/api/bank-account",
    bankAccountRoutes
);


// ==========================================
// ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {

    console.error(
        "Server error:",
        err
    );


    res.status(500).json({

        status: false,

        message:
            "Internal server error."

    });

});


// ==========================================
// SERVER
// ==========================================

const PORT =
    process.env.PORT || 3000;


app.listen(PORT, () => {

    console.log(
        `🚀 Ziba backend running on port ${PORT}`
    );

});
