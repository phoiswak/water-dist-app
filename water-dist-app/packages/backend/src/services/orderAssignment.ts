import { pool } from "../db";
import { calculateDistance } from "./googleMaps";

interface Distributor {
  id: string;
  name: string;
  lat: number;
  lng: number;
  current_capacity: number;
  max_capacity: number;
}

interface OrderLocation {
  lat: number;
  lng: number;
}

/**
 * Score and assign the best distributor for an order
 * Based on BRD algorithm: distance, capacity, and performance
 */
export async function assignBestDistributor(
  orderLocation: OrderLocation
): Promise<string | null> {
  try {
    // 1. Get all active distributors with available capacity
    const distributorsResult = await pool.query<Distributor>(
      `SELECT id, name, lat, lng, current_capacity, max_capacity
       FROM distributors
       WHERE active_flag = true
       AND current_capacity < max_capacity`
    );

    if (distributorsResult.rows.length === 0) {
      console.warn("No available distributors found");
      return null;
    }

    // 2. Calculate distance and score each distributor
    const scoredDistributors = await Promise.all(
      distributorsResult.rows.map(async (dist) => {
        // Calculate distance from distributor to order location
        const distanceData = await calculateDistance(
          { lat: dist.lat, lng: dist.lng },
          orderLocation
        );

        if (!distanceData) {
          return { ...dist, score: -1 }; // Invalid route
        }

        // Calculate score based on:
        // - Distance (shorter is better)
        // - Workload (less busy is better)
        const distanceScore = 100 - Math.min(distanceData.distance / 1000, 100); // km
        const workloadScore =
          ((dist.max_capacity - dist.current_capacity) / dist.max_capacity) * 100;

        // Weighted scoring: 60% distance, 40% workload
        const totalScore = distanceScore * 0.6 + workloadScore * 0.4;

        return {
          ...dist,
          distance: distanceData.distance,
          duration: distanceData.duration,
          score: totalScore,
        };
      })
    );

    // 3. Sort by highest score
    const validDistributors = scoredDistributors
      .filter((d) => d.score > 0)
      .sort((a, b) => b.score - a.score);

    if (validDistributors.length === 0) {
      console.warn("No valid routes found for any distributor");
      return null;
    }

    // 4. Return the best distributor ID
    const bestDistributor = validDistributors[0];
    console.log(
      `Assigned to distributor: ${bestDistributor.name} (Score: ${bestDistributor.score.toFixed(2)})`
    );

    return bestDistributor.id;
  } catch (error) {
    console.error("Error in distributor assignment:", error);
    return null;
  }
}

/**
 * Create an assignment record and update distributor capacity
 */
export async function createAssignment(
  orderId: string,
  distributorId: string,
  score: number
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Insert assignment record
    await client.query(
      `INSERT INTO assignments (order_id, distributor_id, score, status)
       VALUES ($1, $2, $3, 'pending')`,
      [orderId, distributorId, score]
    );

    // Update order status and assigned distributor
    await client.query(
      `UPDATE orders
       SET status = 'assigned', assigned_distributor_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [distributorId, orderId]
    );

    // Increment distributor's current capacity
    await client.query(
      `UPDATE distributors
       SET current_capacity = current_capacity + 1
       WHERE id = $1`,
      [distributorId]
    );

    await client.query("COMMIT");
    console.log(`Assignment created for order ${orderId} -> distributor ${distributorId}`);

    // Send notification to distributor (don't wait for it)
    try {
      const { sendOrderAssignmentEmail } = await import("./emailService");
      await sendOrderAssignmentEmail(orderId, distributorId);
    } catch (emailError) {
      console.error("Failed to send assignment notification:", emailError);
      // Don't throw - assignment was successful
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating assignment:", error);
    throw error;
  } finally {
    client.release();
  }
}
