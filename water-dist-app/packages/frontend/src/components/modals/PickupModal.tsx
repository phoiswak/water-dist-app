import type { Order } from "../../types/Order";
import "../../styles/Modal.css";

interface PickupModalProps {
  isOpen: boolean;
  order: Order | null;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function PickupModal({
  isOpen,
  order,
  isLoading,
  onConfirm,
  onClose,
}: PickupModalProps) {
  if (!isOpen || !order) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Mark Order as Picked Up</h3>
        <p>Confirm you have picked up order #{order.woo_order_id}?</p>
        <div className="modal-order-details">
          <p>
            <strong>Customer:</strong> {order.customer_name}
          </p>
          <p>
            <strong>Delivery Address:</strong> {order.address_text}
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
            className="modal-btn confirm-btn pickup-confirm"
            disabled={isLoading}
          >
            {isLoading ? "Updating..." : "🚚 Confirm Pickup"}
          </button>
        </div>
      </div>
    </div>
  );
}
