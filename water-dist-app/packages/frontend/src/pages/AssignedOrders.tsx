import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/AssignedOrders.css";

// Define the Order type for TypeScript
type Order = {
  id: string;
  woo_order_id: string;
  customer_name: string;
  customer_phone: string;
  address_text: string;
  amount_total: string;
  status: string;
  created_at: string;
};

export default function AssignedOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [showAcceptModal, setShowAcceptModal] = useState<boolean>(false);
  const [showPickupModal, setShowPickupModal] = useState<boolean>(false);
  const [showDeliveredModal, setShowDeliveredModal] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");

  // Get token helper
  const getToken = () => localStorage.getItem("accessToken");

  // Function to load orders from the API
  async function loadOrders() {
    setLoading(true);
    setError("");

    try {
      const token = getToken();
      if (!token) {
        setError("No token found. Please log in.");
        return;
      }

      const res = await axios.get(`${import.meta.env.VITE_API_BASE}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOrders(res.data);
    } catch (err) {
      setError("Failed to load orders. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Open accept modal
  function openAcceptModal(order: Order) {
    setSelectedOrder(order);
    setShowAcceptModal(true);
  }

  // Accept order
  async function handleAccept() {
    if (!selectedOrder) return;

    setActionLoading(selectedOrder.id);
    try {
      const token = getToken();
      await axios.post(
        `${import.meta.env.VITE_API_BASE}/orders/${selectedOrder.id}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowAcceptModal(false);
      await loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to accept order");
    } finally {
      setActionLoading(null);
    }
  }

  // Open reject modal
  function openRejectModal(order: Order) {
    setSelectedOrder(order);
    setRejectReason("");
    setShowRejectModal(true);
  }

  // Reject order
  async function handleReject() {
    if (!selectedOrder) return;

    setActionLoading(selectedOrder.id);
    try {
      const token = getToken();
      await axios.post(
        `${import.meta.env.VITE_API_BASE}/orders/${selectedOrder.id}/reject`,
        { reason: rejectReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowRejectModal(false);
      await loadOrders();
      alert("Order rejected. It will be reassigned.");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to reject order");
    } finally {
      setActionLoading(null);
    }
  }

  // Open pickup modal
  function openPickupModal(order: Order) {
    setSelectedOrder(order);
    setShowPickupModal(true);
  }

  // Open delivered modal
  function openDeliveredModal(order: Order) {
    setSelectedOrder(order);
    setShowDeliveredModal(true);
  }

  // Update order status
  async function handleStatusUpdate(newStatus: string) {
    if (!selectedOrder) return;

    setActionLoading(selectedOrder.id);
    try {
      const token = getToken();
      await axios.patch(
        `${import.meta.env.VITE_API_BASE}/orders/${selectedOrder.id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Close the appropriate modal
      if (newStatus === "picked_up") setShowPickupModal(false);
      if (newStatus === "delivered") setShowDeliveredModal(false);

      await loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  }

  // Generate invoice
  async function handleGenerateInvoice(orderId: string) {
    setActionLoading(orderId);
    try {
      const token = getToken();
      await axios.post(
        `${import.meta.env.VITE_API_BASE}/orders/${orderId}/invoice`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Invoice generated and sent to customer!");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to generate invoice");
    } finally {
      setActionLoading(null);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    window.location.href = "/login";
  };

  // Render action buttons based on status
  const renderActions = (order: Order) => {
    const isLoading = actionLoading === order.id;

    if (order.status === "assigned") {
      return (
        <div className="order-actions">
          <button
            onClick={() => openAcceptModal(order)}
            disabled={isLoading}
            className="action-btn accept-btn"
          >
            {isLoading ? "..." : "✓ Accept"}
          </button>
          <button
            onClick={() => openRejectModal(order)}
            disabled={isLoading}
            className="action-btn reject-btn"
          >
            {isLoading ? "..." : "✗ Reject"}
          </button>
        </div>
      );
    }

    if (order.status === "accepted") {
      return (
        <div className="order-actions">
          <button
            onClick={() => openPickupModal(order)}
            disabled={isLoading}
            className="action-btn pickup-btn"
          >
            {isLoading ? "..." : "🚚 Picked Up"}
          </button>
        </div>
      );
    }

    if (order.status === "picked_up") {
      return (
        <div className="order-actions">
          <button
            onClick={() => openDeliveredModal(order)}
            disabled={isLoading}
            className="action-btn deliver-btn"
          >
            {isLoading ? "..." : "📦 Delivered"}
          </button>
        </div>
      );
    }

    if (order.status === "delivered") {
      return (
        <div className="order-actions">
          <button
            onClick={() => handleGenerateInvoice(order.id)}
            disabled={isLoading}
            className="action-btn invoice-btn"
          >
            {isLoading ? "..." : "📄 Invoice"}
          </button>
        </div>
      );
    }

    return <span className="no-actions">No actions available</span>;
  };

  return (
    <div className="orders-container">
      {/* Header */}
      <header className="orders-header">
        <h1>Water Distribution</h1>
        <button onClick={handleLogout} className="orders-logout-btn">
          Logout
        </button>
      </header>

      {/* Main content */}
      <div className="orders-main">
        <div className="orders-card">
          <div className="orders-header-row">
            <h2>Assigned Orders</h2>
            <button onClick={loadOrders} className="refresh-btn" disabled={loading}>
              {loading ? "⟳ Loading..." : "⟳ Refresh"}
            </button>
          </div>

          {error && <div className="orders-error">{error}</div>}

          {loading ? (
            <div className="orders-loading">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="orders-empty">
              <div className="orders-empty-icon">📦</div>
              <p>No orders available</p>
              <p>New orders will appear here when assigned to you.</p>
            </div>
          ) : (
            <div className="orders-table-wrapper">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => {
                    const statusClass = o.status.toLowerCase();
                    return (
                      <tr key={o.id}>
                        <td>{i + 1}</td>
                        <td className="order-id">#{o.woo_order_id}</td>
                        <td className="customer-name">{o.customer_name}</td>
                        <td className="phone">{o.customer_phone || "N/A"}</td>
                        <td className="address">{o.address_text}</td>
                        <td className="amount">
                          R {parseFloat(o.amount_total).toFixed(2)}
                        </td>
                        <td>
                          <span className={`orders-status-badge ${statusClass}`}>
                            {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                          </span>
                        </td>
                        <td>{renderActions(o)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Accept Modal */}
      {showAcceptModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowAcceptModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Accept Order #{selectedOrder.woo_order_id}</h3>
            <p>Confirm you want to accept this order for delivery?</p>
            <div className="modal-order-details">
              <p><strong>Customer:</strong> {selectedOrder.customer_name}</p>
              <p><strong>Address:</strong> {selectedOrder.address_text}</p>
              <p><strong>Amount:</strong> R {parseFloat(selectedOrder.amount_total).toFixed(2)}</p>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowAcceptModal(false)}
                className="modal-btn cancel-btn"
                disabled={actionLoading === selectedOrder.id}
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                className="modal-btn confirm-btn accept-confirm"
                disabled={actionLoading === selectedOrder.id}
              >
                {actionLoading === selectedOrder.id ? "Accepting..." : "✓ Confirm Accept"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Reject Order #{selectedOrder.woo_order_id}</h3>
            <p>Please provide a reason for rejecting this order:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Out of delivery area, No capacity, etc."
              rows={4}
              className="reject-textarea"
            />
            <div className="modal-actions">
              <button
                onClick={() => setShowRejectModal(false)}
                className="modal-btn cancel-btn"
                disabled={actionLoading === selectedOrder.id}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="modal-btn confirm-btn"
                disabled={actionLoading === selectedOrder.id || !rejectReason.trim()}
              >
                {actionLoading === selectedOrder.id ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pickup Modal */}
      {showPickupModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowPickupModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Mark Order as Picked Up</h3>
            <p>Confirm you have picked up order #{selectedOrder.woo_order_id}?</p>
            <div className="modal-order-details">
              <p><strong>Customer:</strong> {selectedOrder.customer_name}</p>
              <p><strong>Delivery Address:</strong> {selectedOrder.address_text}</p>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowPickupModal(false)}
                className="modal-btn cancel-btn"
                disabled={actionLoading === selectedOrder.id}
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusUpdate("picked_up")}
                className="modal-btn confirm-btn pickup-confirm"
                disabled={actionLoading === selectedOrder.id}
              >
                {actionLoading === selectedOrder.id ? "Updating..." : "🚚 Confirm Pickup"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivered Modal */}
      {showDeliveredModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowDeliveredModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Mark Order as Delivered</h3>
            <p>Confirm you have delivered order #{selectedOrder.woo_order_id}?</p>
            <div className="modal-order-details">
              <p><strong>Customer:</strong> {selectedOrder.customer_name}</p>
              <p><strong>Address:</strong> {selectedOrder.address_text}</p>
              <p><strong>Amount:</strong> R {parseFloat(selectedOrder.amount_total).toFixed(2)}</p>
            </div>
            <p className="modal-note">Invoice will be automatically generated and sent to the customer.</p>
            <div className="modal-actions">
              <button
                onClick={() => setShowDeliveredModal(false)}
                className="modal-btn cancel-btn"
                disabled={actionLoading === selectedOrder.id}
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusUpdate("delivered")}
                className="modal-btn confirm-btn delivered-confirm"
                disabled={actionLoading === selectedOrder.id}
              >
                {actionLoading === selectedOrder.id ? "Updating..." : "📦 Confirm Delivery"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
