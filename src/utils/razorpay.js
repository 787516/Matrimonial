import Razorpay from "razorpay";

export const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_RePnMjlgg8jejR",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "9y05YPq2oZTw0hMyNk32DdS5"
});

