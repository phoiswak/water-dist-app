import type { Order } from "../../types/Order";
import "../../styles/Modal.css";

interface DeliveredModalProps {
  isOpen: boolean;
  order: Order | null;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeliveredModal({
  isOpen,
  order,
  isLoading,
  onConfirm,
  onClose,
}: DeliveredModalProps) {
  if (!isOpen || !order) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Mark Order as Delivered</h3>
        <p>Confirm you have delivered order #{order.woo_order_id}?</p>
        <div className="modal-order-details">
          <p>
            <strong>Customer:</strong> {order.customer_name}
          </p>
          <p>
            <strong>Address:</strong> {order.address_text}
          </p>
          <p>
            <strong>Amount:</strong> R {parseFloat(order.amount_total).toFixed(2)}
          </p>
        </div>
        <p className="modal-note">
          Invoice will be automatically generated and sent to the customer.
        </p>
        <div className="modal-actions">
          <button
            onClick={onClose}
            className="modal-btn cancel-btn"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="modal-btn confirm-btn delivered-confirm"
            disabled={isLoading}
          >
            {isLoading ? "Updating..." : "📦 Confirm Delivery"}
          </button>
        </div>
      </div>
    </div>
  );
}
