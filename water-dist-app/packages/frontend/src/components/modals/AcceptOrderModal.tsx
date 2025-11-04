import type { Order } from "../../types/Order";
import "../../styles/Modal.css";

interface AcceptOrderModalProps {
  isOpen: boolean;
  order: Order | null;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function AcceptOrderModal({
  isOpen,
  order,
  isLoading,
  onConfirm,
  onClose,
}: AcceptOrderModalProps) {
  if (!isOpen || !order) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Accept Order #{order.woo_order_id}</h3>
        <p>Confirm you want to accept this order for delivery?</p>
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
            className="modal-btn confirm-btn accept-confirm"
            disabled={isLoading}
          >
            {isLoading ? "Accepting..." : "✓ Confirm Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
