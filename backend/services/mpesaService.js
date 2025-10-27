// backend/services/mpesaService.js
const { v4: uuidv4 } = require("uuid");
const { USE_REAL_MPESA, MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL } = require("../config/db");
const fetch = require("node-fetch"); // if using real implementation uncomment fetch usage
const db = require("../config/db");
const PaymentModel = require("../models/paymentModel");

// MOCK mode active by default
const mockSendStkPush = async ({ amount, phone, parent_type, parent_id, branch_id, created_by }) => {
  // create a pending payment entry in DB with a fake checkout id
  const payment = {
    id: uuidv4(),
    parent_type,
    parent_id,
    amount,
    method: "MPESA",
    reference: null,
    created_by,
    branch_id
  };
  const record = await PaymentModel.create(payment);
  // create a fake checkoutRequestID that will be used to simulate callback
  const checkoutRequestID = "MOCK-" + uuidv4();
  // store a mapping in payments.updated_at or reference? We'll update reference after callback simulation
  // For now return checkoutRequestID and payment id
  return { checkoutRequestID, paymentId: record.id };
};

// Real Daraja logic (commented — replace mock with this when ready)
/*
async function getDarajaToken() {
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");
  const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  const r = await fetch(url, { headers: { Authorization: `Basic ${auth}` }});
  const j = await r.json();
  return j.access_token;
}

async function realSendStkPush({ amount, phone, parent_type, parent_id, branch_id, created_by }) {
  const token = await getDarajaToken();
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0,14);
  const pass = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: pass,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: MPESA_CALLBACK_URL,
    AccountReference: parent_id,
    TransactionDesc: `Payment for ${parent_type}:${parent_id}`
  };
  const resp = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  const data = await resp.json();
  // store initial payment row with status pending, use data.CheckoutRequestID as reference
  // ...
  return data;
}
*/

module.exports = {
  sendStkPush: async (opts) => {
    if (USE_REAL_MPESA) {
      // uncomment and implement realSendStkPush when ready
      // return await realSendStkPush(opts);
    }
    return await mockSendStkPush(opts);
  },

  // helper to simulate a callback (for testing local dev)
  simulateMpesaCallback: async ({ checkoutRequestID, paymentId, resultCode = 0, mpesaReceipt = "MOCKRECEIPT123", amount }) => {
    // Update payment reference and store a note in payments.reference
    const q = `UPDATE payments SET reference=$1, updated_at=extract(epoch from now())::bigint WHERE id=$2 RETURNING *`;
    const res = await db.query(q, [mpesaReceipt, paymentId]);
    // You could also update parent record (e.g., car_registry.mpesa_ref) here
    return res.rows[0];
  }
};
