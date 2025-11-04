import express from 'express';
import { pool } from '../db';
import { geocodeAddress } from '../services/googleMaps';
import { assignBestDistributor, createAssignment } from '../services/orderAssignment';

const router = express.Router();

// WooCommerce webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    // Extract WooCommerce order ID from the request body
    const wcOrderId = req.body.id?.toString();

    // Validate the order ID
    if (!wcOrderId) return res.status(400).send('Invalid order ID');

    // Check if the order already exists in the database
    const existing = await pool.query(
      'SELECT id FROM orders WHERE woo_order_id = $1',
      [wcOrderId]
    );

    // If order already exists, respond with existing=true
    if ((existing.rowCount ?? 0) > 0) {
      return res.json({ ok: true, existing: true });
    }

    // Extract customer information from the request body
    const customer = req.body.billing || {};
    const fullAddress = `${customer.address_1 || ''}, ${customer.city || ''}, ${customer.postcode || ''}, South Africa`;

    // Geocode the customer address
    console.log(`Geocoding address: ${fullAddress}`);
    const location = await geocodeAddress(fullAddress);

    // Insert the new order into the database
    const insertResult = await pool.query(
      `INSERT INTO orders (woo_order_id, customer_name, customer_phone, customer_email, address_text, lat, lng, amount_total, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        wcOrderId,
        `${customer.first_name || ''} ${customer.last_name || ''}`,
        customer.phone,
        customer.email,
        fullAddress,
        location?.lat || null,
        location?.lng || null,
        req.body.total || '0.00',
        'new', // Initial status
      ]
    );

    const orderId = insertResult.rows[0].id;

    // Assign to best distributor if location was successfully geocoded
    if (location) {
      console.log(`Assigning order ${orderId} to nearest distributor...`);
      const distributorId = await assignBestDistributor(location);

      if (distributorId) {
        await createAssignment(orderId, distributorId, 100);
        console.log(`✅ Order ${wcOrderId} assigned to distributor ${distributorId}`);
      } else {
        console.warn(`⚠️ No distributor available for order ${wcOrderId}`);
        // Order remains in 'new' status for manual assignment
      }
    } else {
      console.warn(`⚠️ Could not geocode address for order ${wcOrderId}`);
    }

    // Respond with a success message
    res.json({ ok: true, orderId, assigned: !!location });
  } catch (err) {
    // Catch and log any errors, then send a 500 status code response
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
