const express = require("express");
const crypto = require("crypto");
const twilio = require("twilio");
const cors = require("cors");
const bodyParser = require("body-parser");
const Razorpay = require("razorpay");
require("dotenv").config();

// 🔹 Load environment variables
const {
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    TWILIO_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER
} = process.env;

// 🔹 Check if all required env variables are present
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || !TWILIO_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error("❌ Missing environment variables! Check your .env file.");
    process.exit(1);
}

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// 🔹 Initialize Razorpay
const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
});

// 🔹 Initialize Twilio
const twilioClient = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);

app.get("/get-razorpay-key", (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
});

// ✅ Helper function to send SMS
async function sendSMS(to, message) {
    try {
        await twilioClient.messages.create({
            body: message,
            from: TWILIO_PHONE_NUMBER,
            to
        });
        console.log(`📩 SMS sent to ${to}`);
    } catch (error) {
        console.error("❌ Error sending SMS:", error.message);
    }
}

// ✅ Razorpay Payment Route (Create Order)
app.post("/pay", async (req, res) => {
    try {
        const { amount, email, phone, productinfo } = req.body;

        // Validation
        if (!amount || !email || !phone || !productinfo) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // Create a Razorpay order
        const order = await razorpay.orders.create({
            amount: amount * 100, // Convert to paise
            currency: "INR",
            receipt: `txn_${Date.now()}`,
            payment_capture: 1
        });

        console.log("✅ Order Created:", order);

        // Send SMS notification
        await sendSMS(phone, `Your payment of ₹${amount} for ${productinfo} is being processed. Order ID: ${order.id}.`);

        res.json({ success: true, order });
    } catch (error) {
        console.error("❌ Payment Error:", error.message);
        res.status(500).json({ success: false, message: "Payment request failed" });
    }
});

// ✅ Razorpay Payment Verification
app.post("/verify-payment", async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, phone } = req.body;

        // Validation
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Missing payment details" });
        }

        // Verify payment signature
        const hmac = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest("hex");

        if (generatedSignature === razorpay_signature) {
            console.log("✅ Payment Verified:", req.body);

            // Send confirmation SMS
            await sendSMS(phone, `✅ Payment Successful! Payment ID: ${razorpay_payment_id}, Amount: ₹${amount}. Thank you!`);

            res.json({ success: true, message: "Payment verified successfully" });
        } else {
            throw new Error("Invalid payment signature");
        }
    } catch (error) {
        console.error("❌ Payment Verification Error:", error.message);
        res.status(500).json({ success: false, message: "Payment verification failed" });
    }
});

// ✅ Send SMS API
app.post("/send-sms", async (req, res) => {
    try {
        const { phone, message } = req.body;

        // Validation
        if (!phone || !message) {
            return res.status(400).json({ success: false, message: "Phone and message are required" });
        }

        await sendSMS(phone, message);
        res.json({ success: true, message: "SMS sent successfully" });
    } catch (error) {
        console.error("❌ Error sending SMS:", error.message);
        res.status(500).json({ success: false, message: "Failed to send SMS" });
    }
});

// ✅ Start Server on Port 5001
const PORT = 5001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
