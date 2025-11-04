import { useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import { useToast } from "../hooks/useToast";
import { AcceptOrderModal } from "../components/modals/AcceptOrderModal";
import { RejectOrderModal } from "../components/modals/RejectOrderModal";
import { PickupModal } from "../components/modals/PickupModal";
import { DeliveredModal } from "../components/modals/DeliveredModal";
import { InvoiceModal } from "../components/modals/InvoiceModal";
import type { Order } from "../types/Order";
import "../styles/AssignedOrders.css";

// Helper function to extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const responseData = error.response?.data as Record<string, unknown> | undefined;
    if (responseData?.error && typeof responseData.error === "string") {
      return responseData.error;
    }
    if (responseData?.message && typeof responseData.message === "string") {
      return responseData.message;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unknown error occurred";
}

export default function AssignedOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [showAcceptModal, setShowAcceptModal] = useState<boolean>(false);
  const [showPickupModal, setShowPickupModal] = useState<boolean>(false);
  const [showDeliveredModal, setShowDeliveredModal] = useState<boolean>(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const toast = useToast();

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
      toast.success("Order accepted successfully!");
      await loadOrders();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to accept order");
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
      toast.success("Order rejected. It will be reassigned.");
      await loadOrders();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to reject order");
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

      const statusMessages: Record<string, string> = {
        "picked_up": "Order marked as picked up!",
        "delivered": "Order marked as delivered!",
      };
      toast.success(statusMessages[newStatus] || "Status updated successfully!");
      await loadOrders();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  }

  // Open invoice modal
  function openInvoiceModal(order: Order) {
    setSelectedOrder(order);
    setShowInvoiceModal(true);
  }

  // Generate invoice
  async function handleGenerateInvoice() {
    if (!selectedOrder) return;

    setActionLoading(selectedOrder.id);
    try {
      const token = getToken();
      await axios.post(
        `${import.meta.env.VITE_API_BASE}/orders/${selectedOrder.id}/invoice`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowInvoiceModal(false);
      toast.success("Invoice generated and sent to customer!");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to generate invoice");
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
            onClick={() => openInvoiceModal(order)}
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

      {/* Modal Components */}
      <AcceptOrderModal
        isOpen={showAcceptModal}
        order={selectedOrder}
        isLoading={selectedOrder ? actionLoading === selectedOrder.id : false}
        onConfirm={handleAccept}
        onClose={() => setShowAcceptModal(false)}
      />

      <RejectOrderModal
        isOpen={showRejectModal}
        order={selectedOrder}
        reason={rejectReason}
        isLoading={selectedOrder ? actionLoading === selectedOrder.id : false}
        onReasonChange={setRejectReason}
        onConfirm={handleReject}
        onClose={() => setShowRejectModal(false)}
      />

      <PickupModal
        isOpen={showPickupModal}
        order={selectedOrder}
        isLoading={selectedOrder ? actionLoading === selectedOrder.id : false}
        onConfirm={() => handleStatusUpdate("picked_up")}
        onClose={() => setShowPickupModal(false)}
      />

      <DeliveredModal
        isOpen={showDeliveredModal}
        order={selectedOrder}
        isLoading={selectedOrder ? actionLoading === selectedOrder.id : false}
        onConfirm={() => handleStatusUpdate("delivered")}
        onClose={() => setShowDeliveredModal(false)}
      />

      <InvoiceModal
        isOpen={showInvoiceModal}
        order={selectedOrder}
        isLoading={selectedOrder ? actionLoading === selectedOrder.id : false}
        onConfirm={handleGenerateInvoice}
        onClose={() => setShowInvoiceModal(false)}
      />
    </div>
  );
}
