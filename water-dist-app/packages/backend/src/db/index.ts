import { Pool } from "pg";
import dotenv from "dotenv";

// Load environment variables from the .env file
dotenv.config();

// Create a new pool instance using the DATABASE_URL from .env
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // DATABASE_URL in your .env file
});

// Function to initialize the database connection by running a simple query
export async function initDb() {
  try {
    // Test the connection with a simple query
    await pool.query("SELECT 1");
    console.log("Database connection successful");
  } catch (err) {
    // Log error if the connection fails
    console.error("Database connection failed", err);
    throw err; // Re-throw the error to ensure the app doesn’t continue if DB fails
  }
}
