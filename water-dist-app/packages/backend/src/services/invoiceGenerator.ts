import PDFDocument from "pdfkit";
import { pool } from "../db";
import fs from "fs";
import path from "path";

interface InvoiceData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  tax: number;
  total: number;
  invoiceDate: Date;
}

/**
 * Generate a PDF invoice for an order
 */
export async function generateInvoice(orderId: string): Promise<string> {
  try {
    // Fetch order details from database
    const orderResult = await pool.query(
      `SELECT o.id, o.woo_order_id, o.customer_name, o.customer_email,
              o.customer_phone, o.address_text, o.amount_total, o.created_at
       FROM orders o
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      throw new Error("Order not found");
    }

    const order = orderResult.rows[0];

    // Create invoices directory if it doesn't exist
    const invoicesDir = path.join(__dirname, "../../invoices");
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const filename = `invoice-${order.woo_order_id}-${Date.now()}.pdf`;
    const filepath = path.join(invoicesDir, filename);

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc
      .fontSize(20)
      .text("WATER DISTRIBUTION", 50, 50)
      .fontSize(10)
      .text("Invoice", 50, 80)
      .text(`Invoice Number: INV-${order.woo_order_id}`, 50, 95)
      .text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 50, 110);

    // Customer details
    doc
      .fontSize(12)
      .text("Bill To:", 50, 150)
      .fontSize(10)
      .text(order.customer_name, 50, 170)
      .text(order.customer_email, 50, 185)
      .text(order.customer_phone || "N/A", 50, 200)
      .text(order.address_text, 50, 215);

    // Table header
    const tableTop = 280;
    doc
      .fontSize(10)
      .text("Description", 50, tableTop)
      .text("Amount", 400, tableTop, { width: 90, align: "right" });

    // Draw line
    doc
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Table content (simple version - you can expand this)
    const itemY = tableTop + 30;
    doc
      .fontSize(10)
      .text("Water Delivery Order", 50, itemY)
      .text(`R ${parseFloat(order.amount_total).toFixed(2)}`, 400, itemY, {
        width: 90,
        align: "right",
      });

    // Total
    const totalY = itemY + 40;
    doc
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .moveTo(50, totalY - 10)
      .lineTo(550, totalY - 10)
      .stroke();

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Total:", 350, totalY)
      .text(`R ${parseFloat(order.amount_total).toFixed(2)}`, 400, totalY, {
        width: 90,
        align: "right",
      });

    // Footer
    doc
      .fontSize(8)
      .font("Helvetica")
      .text(
        "Thank you for your business!",
        50,
        totalY + 60,
        { align: "center", width: 500 }
      )
      .text(
        "For questions about this invoice, please contact support@water.co.za",
        50,
        totalY + 75,
        { align: "center", width: 500 }
      );

    // Finalize PDF
    doc.end();

    // Wait for file to be written
    await new Promise((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    // Save invoice record to database
    await pool.query(
      "INSERT INTO invoices (order_id, pdf_path, created_at) VALUES ($1, $2, NOW())",
      [orderId, filepath]
    );

    console.log(`✅ Invoice generated: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error("Invoice generation error:", error);
    throw error;
  }
}

/**
 * Get invoice path for an order
 */
export async function getInvoicePath(orderId: string): Promise<string | null> {
  try {
    const result = await pool.query(
      "SELECT pdf_path FROM invoices WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1",
      [orderId]
    );

    return result.rows.length > 0 ? result.rows[0].pdf_path : null;
  } catch (error) {
    console.error("Get invoice path error:", error);
    return null;
  }
}
