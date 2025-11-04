import express, { Request } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db";  // Import the PostgreSQL pool to interact with the database
import { generateInvoice } from "../services/invoiceGenerator";
import { sendInvoiceEmail, sendStatusUpdateEmail } from "../services/emailService";

// Define a type for the payload (user data) in the JWT
interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

// Extend Express Request interface to include 'user'
declare module "express-serve-static-core" {
  interface Request {
    user?: JwtPayload;
  }
}

const router = express.Router();

// Middleware to verify JWT token
router.use((req, res, next) => {
  const auth = req.headers.authorization;  // Get the Authorization header

  // If no token is provided, respond with 401 (Unauthorized)
  if (!auth) {
    return res.status(401).send("Missing token");
  }

  const token = auth.split(" ")[1];  // Extract token from "Bearer <token>" format

  // If token is missing after "Bearer", return an error
  if (!token) {
    return res.status(401).send("Missing token after Bearer");
  }

  try {
    // Verify the token using the JWT secret (from environment variable or fallback to default secret)
    const payload = jwt.verify(token, process.env.JWT_SECRET || "TuIeYA9rhGKIR5crjoKI9ttxyzRJkWtM") as JwtPayload;

    // Attach the decoded user info to the request object
    (req as any).user = payload;

    // Continue to the next middleware or route handler
    next();
  } catch (err) {
    // If token verification fails, respond with 401 (Unauthorized)
    console.error("JWT verification failed:", err);
    return res.status(401).send("Invalid token");
  }
});

// Route to fetch the list of orders assigned to the logged-in distributor
router.get("/", async (req, res) => {
  try {
    const user = req.user;

    // For demo: if user has demo-id, show all orders
    // In production, this would only show orders assigned to the specific distributor
    let query;
    let params;

    if (user?.id === 'demo-id') {
      // Demo mode: show all orders
      query = `SELECT o.id, o.woo_order_id, o.customer_name, o.customer_phone,
                      o.address_text, o.amount_total, o.status, o.created_at,
                      a.status as assignment_status, a.offered_at
               FROM orders o
               LEFT JOIN assignments a ON o.id = a.order_id
               ORDER BY o.created_at DESC
               LIMIT 50`;
      params = [];
    } else {
      // Production mode: only show assigned orders
      query = `SELECT o.id, o.woo_order_id, o.customer_name, o.customer_phone,
                      o.address_text, o.amount_total, o.status, o.created_at,
                      a.status as assignment_status, a.offered_at
               FROM orders o
               LEFT JOIN assignments a ON o.id = a.order_id
               WHERE o.assigned_distributor_id = $1
               ORDER BY o.created_at DESC
               LIMIT 50`;
      params = [user?.id];
    }

    const q = await pool.query(query, params);

    // Respond with the fetched rows as JSON
    res.json(q.rows);
  } catch (error) {
    // Handle any database errors
    console.error("Database query error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route to accept an order
router.post("/:orderId/accept", async (req, res) => {
  const client = await pool.connect();

  try {
    const { orderId } = req.params;
    const user = req.user;

    await client.query("BEGIN");

    // Verify the order exists and get its status
    let orderCheck;
    if (user?.id === 'demo-id') {
      // Demo mode: just check if order exists
      orderCheck = await client.query(
        "SELECT id, status, assigned_distributor_id FROM orders WHERE id = $1",
        [orderId]
      );
    } else {
      // Production mode: verify ownership
      orderCheck = await client.query(
        "SELECT id, status, assigned_distributor_id FROM orders WHERE id = $1 AND assigned_distributor_id = $2",
        [orderId, user?.id]
      );
    }

    if (orderCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found or not assigned to you" });
    }

    if (orderCheck.rows[0].status !== "assigned") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Order cannot be accepted in current status" });
    }

    // Update order status to 'accepted'
    await client.query(
      "UPDATE orders SET status = 'accepted', updated_at = NOW() WHERE id = $1",
      [orderId]
    );

    // Update assignment status
    await client.query(
      "UPDATE assignments SET status = 'accepted', accepted_at = NOW() WHERE order_id = $1",
      [orderId]
    );

    await client.query("COMMIT");

    res.json({ success: true, message: "Order accepted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Accept order error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

// Route to reject an order
router.post("/:orderId/reject", async (req, res) => {
  const client = await pool.connect();

  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const user = req.user;

    await client.query("BEGIN");

    // Verify the order exists
    let orderCheck;
    if (user?.id === 'demo-id') {
      orderCheck = await client.query(
        "SELECT id, status, assigned_distributor_id FROM orders WHERE id = $1",
        [orderId]
      );
    } else {
      orderCheck = await client.query(
        "SELECT id, status, assigned_distributor_id FROM orders WHERE id = $1 AND assigned_distributor_id = $2",
        [orderId, user?.id]
      );
    }

    if (orderCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found or not assigned to you" });
    }

    // Update assignment to rejected
    await client.query(
      `UPDATE assignments
       SET status = 'rejected', rejected_at = NOW(), rejection_reason = $1
       WHERE order_id = $2`,
      [reason || "No reason provided", orderId]
    );

    // Update order back to 'new' for reassignment
    await client.query(
      `UPDATE orders
       SET status = 'new', assigned_distributor_id = NULL, updated_at = NOW()
       WHERE id = $1`,
      [orderId]
    );

    // Decrease distributor capacity (skip in demo mode)
    if (user?.id !== 'demo-id' && orderCheck.rows[0].assigned_distributor_id) {
      await client.query(
        "UPDATE distributors SET current_capacity = GREATEST(current_capacity - 1, 0) WHERE id = $1",
        [orderCheck.rows[0].assigned_distributor_id]
      );
    }

    await client.query("COMMIT");

    res.json({ success: true, message: "Order rejected. It will be reassigned." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Reject order error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

// Route to update order status (picked_up, delivered, etc.)
router.patch("/:orderId/status", async (req, res) => {
  const client = await pool.connect();

  try {
    const { orderId } = req.params;
    const { status, proofOfDeliveryUrl } = req.body;
    const user = req.user;

    const validStatuses = ["accepted", "picked_up", "delivered", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await client.query("BEGIN");

    // Verify the order exists
    let orderCheck;
    if (user?.id === 'demo-id') {
      orderCheck = await client.query(
        "SELECT id, assigned_distributor_id FROM orders WHERE id = $1",
        [orderId]
      );
    } else {
      orderCheck = await client.query(
        "SELECT id, assigned_distributor_id FROM orders WHERE id = $1 AND assigned_distributor_id = $2",
        [orderId, user?.id]
      );
    }

    if (orderCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found" });
    }

    // Update order status
    let updateQuery;
    let updateValues;

    if (status === "delivered" && proofOfDeliveryUrl) {
      updateQuery = `UPDATE orders
                     SET status = $1, proof_of_delivery_url = $2, delivered_at = NOW(), updated_at = NOW()
                     WHERE id = $3`;
      updateValues = [status, proofOfDeliveryUrl, orderId];
    } else {
      updateQuery = `UPDATE orders
                     SET status = $1, updated_at = NOW()
                     WHERE id = $2`;
      updateValues = [status, orderId];
    }

    await client.query(updateQuery, updateValues);

    // If delivered, free up distributor capacity (skip in demo mode)
    if (status === "delivered" && user?.id !== 'demo-id' && orderCheck.rows[0].assigned_distributor_id) {
      await client.query(
        "UPDATE distributors SET current_capacity = GREATEST(current_capacity - 1, 0) WHERE id = $1",
        [orderCheck.rows[0].assigned_distributor_id]
      );
    }

    await client.query("COMMIT");

    // Send status update notification to customer
    await sendStatusUpdateEmail(orderId, status);

    // Generate and send invoice if delivered
    if (status === "delivered") {
      try {
        const invoicePath = await generateInvoice(orderId);
        await sendInvoiceEmail(orderId, invoicePath);
      } catch (error) {
        console.error("Invoice generation/sending failed:", error);
        // Don't fail the status update if invoice fails
      }
    }

    res.json({ success: true, message: "Order status updated" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update status error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

// Route to manually generate and send invoice
router.post("/:orderId/invoice", async (req, res) => {
  try {
    const { orderId } = req.params;
    const user = req.user;

    // Verify the order exists
    let orderCheck;
    if (user?.id === 'demo-id') {
      orderCheck = await pool.query(
        "SELECT id FROM orders WHERE id = $1",
        [orderId]
      );
    } else {
      orderCheck = await pool.query(
        "SELECT id FROM orders WHERE id = $1 AND assigned_distributor_id = $2",
        [orderId, user?.id]
      );
    }

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Generate invoice
    const invoicePath = await generateInvoice(orderId);

    // Send invoice email
    await sendInvoiceEmail(orderId, invoicePath);

    res.json({ success: true, message: "Invoice generated and sent", path: invoicePath });
  } catch (error) {
    console.error("Invoice generation error:", error);
    res.status(500).json({ error: "Failed to generate invoice" });
  }
});

export default router;
