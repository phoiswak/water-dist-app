import type { Order } from "../../types/Order";
import "../../styles/Modal.css";

interface InvoiceModalProps {
  isOpen: boolean;
  order: Order | null;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function InvoiceModal({
  isOpen,
  order,
  isLoading,
  onConfirm,
  onClose,
}: InvoiceModalProps) {
  if (!isOpen || !order) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Send Invoice Again?</h3>
        <p>
          Are you sure you want to send the invoice again for order #
          {order.woo_order_id}?
        </p>
        <div className="modal-order-details">
          <p>
            <strong>Customer:</strong> {order.customer_name}
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
            className="modal-btn confirm-btn"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "📄 Send Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}
