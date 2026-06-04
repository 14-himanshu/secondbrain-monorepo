import type { Request, Response } from "express";
import { UserModel } from "../db.js";
import { createRazorpayOrder, verifyRazorpaySignature } from "../services/razorpay.service.js";

// Pro plan cost in INR
const PRO_PLAN_PRICE = 999;

export const createCheckoutOrderController = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create Razorpay order
    const order = await createRazorpayOrder(PRO_PLAN_PRICE, "INR");
    
    return res.json({ 
      orderId: order.id, 
      amount: order.amount, 
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    return res.status(500).json({ message: "Failed to create order" });
  }
};

export const verifyPaymentController = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (isValid) {
      // Payment is verified, upgrade user
      await UserModel.findByIdAndUpdate(req.userId, {
        subscriptionPlan: 'pro',
        subscriptionStatus: 'active',
        subscriptionPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });

      return res.json({ success: true, message: "Payment verified successfully" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({ message: "Failed to verify payment" });
  }
};
