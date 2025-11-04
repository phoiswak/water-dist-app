import React, { useState } from "react";
import axios from "axios";
import "../styles/Login.css";

export default function Login() {
  // States for email input and loading status
  const [email, setEmail] = useState("phosiwak@gmail.com");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle form submission
  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      // Make the POST request to the backend API
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE}/auth/login`,
        { email }
      );

      // Store the access token in localStorage
      localStorage.setItem("accessToken", res.data.accessToken);

      // Redirect the user to the /orders page
      window.location.href = "/orders";
    } catch {
      // If login fails, show an error message
      setError("Login failed. Please check your email.");
    } finally {
      // Reset loading state
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      {/* Left side - Branding */}
      <div className="login-branding">
        <div className="login-branding-content">
          <h1>Water Distribution</h1>
          <p>
            Manage your water delivery orders efficiently. Login to access your
            distributor dashboard.
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="login-form-section">
        <div className="login-form-card">
          <h2>Distributor Login</h2>
          <p>Enter your email to access your account</p>

          <form onSubmit={submit}>
            {/* Display error message if login fails */}
            {error && <div className="login-error">{error}</div>}

            <label className="login-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              placeholder="distributor@example.com"
              required
            />

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="login-footer">
            Need help? Contact your administrator
          </div>
        </div>
      </div>
    </div>
  );
}
