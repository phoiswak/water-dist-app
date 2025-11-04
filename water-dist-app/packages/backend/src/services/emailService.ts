import sgMail from "@sendgrid/mail";
import { pool } from "../db";
import fs from "fs";

// Initialize SendGrid
const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
}

/**
 * Send invoice email to customer and distributor
 */
export async function sendInvoiceEmail(
  orderId: string,
  invoicePath: string
): Promise<boolean> {
  try {
    if (!apiKey) {
      console.warn("SendGrid API key not configured");
      return false;
    }

    // Get order details
    const orderResult = await pool.query(
      `SELECT o.customer_name, o.customer_email, o.woo_order_id, o.amount_total,
              d.name as distributor_name, d.contact->>'email' as distributor_email
       FROM orders o
       LEFT JOIN distributors d ON o.assigned_distributor_id = d.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      throw new Error("Order not found");
    }

    const order = orderResult.rows[0];

    // Read PDF file
    const pdfBuffer = fs.readFileSync(invoicePath);
    const pdfBase64 = pdfBuffer.toString("base64");

    // Email to customer
    const customerEmail = {
      to: order.customer_email,
      from: process.env.SENDGRID_FROM_EMAIL || "noreply@water.co.za",
      subject: `Invoice for Order #${order.woo_order_id}`,
      text: `Dear ${order.customer_name},\n\nThank you for your order! Please find attached your invoice for order #${order.woo_order_id}.\n\nTotal Amount: R ${parseFloat(order.amount_total).toFixed(2)}\n\nBest regards,\nWater Distribution Team`,
      html: `
        <p>Dear ${order.customer_name},</p>
        <p>Thank you for your order! Please find attached your invoice for order #${order.woo_order_id}.</p>
        <p><strong>Total Amount: R ${parseFloat(order.amount_total).toFixed(2)}</strong></p>
        <p>Best regards,<br/>Water Distribution Team</p>
      `,
      attachments: [
        {
          content: pdfBase64,
          filename: `invoice-${order.woo_order_id}.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    };

    await sgMail.send(customerEmail);
    console.log(`✅ Invoice email sent to customer: ${order.customer_email}`);

    // Log notification
    await pool.query(
      `INSERT INTO notifications (order_id, type, recipient, subject, message, sent_at, status)
       VALUES ($1, 'email', $2, $3, $4, NOW(), 'sent')`,
      [
        orderId,
        order.customer_email,
        customerEmail.subject,
        "Invoice email sent",
      ]
    );

    return true;
  } catch (error) {
    console.error("Send invoice email error:", error);

    // Log failed notification
    await pool.query(
      `INSERT INTO notifications (order_id, type, recipient, message, status, error_message, created_at)
       VALUES ($1, 'email', $2, $3, 'failed', $4, NOW())`,
      [orderId, "unknown", "Failed to send invoice", String(error)]
    );

    return false;
  }
}

/**
 * Send order assignment notification to distributor
 */
export async function sendOrderAssignmentEmail(
  orderId: string,
  distributorId: string
): Promise<boolean> {
  try {
    if (!apiKey) {
      console.warn("SendGrid API key not configured");
      return false;
    }

    // Get order and distributor details
    const result = await pool.query(
      `SELECT o.woo_order_id, o.customer_name, o.address_text, o.amount_total,
              d.name as distributor_name, d.contact->>'email' as distributor_email,
              u.email as user_email
       FROM orders o
       LEFT JOIN distributors d ON d.id = $1
       LEFT JOIN users u ON d.user_id = u.id
       WHERE o.id = $2`,
      [distributorId, orderId]
    );

    if (result.rows.length === 0) {
      throw new Error("Order or distributor not found");
    }

    const data = result.rows[0];
    const recipientEmail = data.user_email || data.distributor_email;

    if (!recipientEmail) {
      console.warn("No email found for distributor");
      return false;
    }

    const email = {
      to: recipientEmail,
      from: process.env.SENDGRID_FROM_EMAIL || "noreply@water.co.za",
      subject: `New Order Assigned: #${data.woo_order_id}`,
      text: `Hello ${data.distributor_name},\n\nYou have been assigned a new order:\n\nOrder #${data.woo_order_id}\nCustomer: ${data.customer_name}\nDelivery Address: ${data.address_text}\nAmount: R ${parseFloat(data.amount_total).toFixed(2)}\n\nPlease log in to accept or reject this order.\n\nBest regards,\nWater Distribution System`,
      html: `
        <p>Hello ${data.distributor_name},</p>
        <p>You have been assigned a new order:</p>
        <ul>
          <li><strong>Order #:</strong> ${data.woo_order_id}</li>
          <li><strong>Customer:</strong> ${data.customer_name}</li>
          <li><strong>Delivery Address:</strong> ${data.address_text}</li>
          <li><strong>Amount:</strong> R ${parseFloat(data.amount_total).toFixed(2)}</li>
        </ul>
        <p>Please log in to accept or reject this order.</p>
        <p>Best regards,<br/>Water Distribution System</p>
      `,
    };

    await sgMail.send(email);
    console.log(`✅ Assignment email sent to distributor: ${recipientEmail}`);

    // Log notification
    await pool.query(
      `INSERT INTO notifications (order_id, type, recipient, subject, message, sent_at, status)
       VALUES ($1, 'email', $2, $3, $4, NOW(), 'sent')`,
      [orderId, recipientEmail, email.subject, "Order assignment notification"]
    );

    return true;
  } catch (error) {
    console.error("Send assignment email error:", error);
    return false;
  }
}

/**
 * Send order status update to customer
 */
export async function sendStatusUpdateEmail(
  orderId: string,
  status: string
): Promise<boolean> {
  try {
    if (!apiKey) {
      console.warn("SendGrid API key not configured");
      return false;
    }

    const result = await pool.query(
      `SELECT customer_name, customer_email, woo_order_id
       FROM orders
       WHERE id = $1`,
      [orderId]
    );

    if (result.rows.length === 0) {
      throw new Error("Order not found");
    }

    const order = result.rows[0];

    const statusMessages: Record<string, string> = {
      accepted: "Your order has been accepted by the distributor and will be processed soon.",
      picked_up: "Your order has been picked up and is on its way!",
      delivered: "Your order has been successfully delivered. Thank you!",
      cancelled: "Your order has been cancelled. Please contact support for more information.",
    };

    const message = statusMessages[status] || "Your order status has been updated.";

    const email = {
      to: order.customer_email,
      from: process.env.SENDGRID_FROM_EMAIL || "noreply@water.co.za",
      subject: `Order Update: #${order.woo_order_id}`,
      text: `Dear ${order.customer_name},\n\n${message}\n\nOrder #${order.woo_order_id}\n\nBest regards,\nWater Distribution Team`,
      html: `
        <p>Dear ${order.customer_name},</p>
        <p>${message}</p>
        <p><strong>Order #${order.woo_order_id}</strong></p>
        <p>Best regards,<br/>Water Distribution Team</p>
      `,
    };

    await sgMail.send(email);
    console.log(`✅ Status update email sent: ${order.customer_email}`);

    // Log notification
    await pool.query(
      `INSERT INTO notifications (order_id, type, recipient, subject, message, sent_at, status)
       VALUES ($1, 'email', $2, $3, $4, NOW(), 'sent')`,
      [orderId, order.customer_email, email.subject, message]
    );

    return true;
  } catch (error) {
    console.error("Send status update email error:", error);
    return false;
  }
}
