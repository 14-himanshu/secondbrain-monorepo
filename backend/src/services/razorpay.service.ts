import Razorpay from "razorpay";
import { getRazorpayKeyId, getRazorpayKeySecret } from "../config.js";
import crypto from "crypto";

let razorpayClient: Razorpay | null = null;

export const getRazorpayClient = () => {
  if (!razorpayClient) {
    const key_id = getRazorpayKeyId();
    const key_secret = getRazorpayKeySecret();
    if (!key_id || !key_secret) {
      throw new Error("Razorpay credentials not found");
    }
    razorpayClient = new Razorpay({
      key_id,
      key_secret,
    });
  }
  return razorpayClient;
};

export const createRazorpayOrder = async (amount: number, currency: string = "INR") => {
  const razorpay = getRazorpayClient();
  const options = {
    amount: amount * 100, // amount in the smallest currency unit
    currency,
    receipt: `receipt_${Date.now()}`
  };
  
  const order = await razorpay.orders.create(options);
  return order;
};

export const verifyRazorpaySignature = (
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
) => {
  const secret = getRazorpayKeySecret();
  if (!secret) throw new Error("Razorpay secret not found");

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body.toString())
    .digest("hex");

  return expectedSignature === razorpay_signature;
};
