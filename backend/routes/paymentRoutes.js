// backend/routes/paymentRoutes.js
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.post("/payments", paymentController.createPayment);
router.post("/payments/stk", paymentController.initiateMpesaStk);
router.post("/payments/mpesa/callback", paymentController.mpesaCallback);

module.exports = router;
