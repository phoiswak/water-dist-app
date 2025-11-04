import type { Order } from "../../types/Order";
import "../../styles/Modal.css";

interface RejectOrderModalProps {
  isOpen: boolean;
  order: Order | null;
  reason: string;
  isLoading: boolean;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function RejectOrderModal({
  isOpen,
  order,
  reason,
  isLoading,
  onReasonChange,
  onConfirm,
  onClose,
}: RejectOrderModalProps) {
  if (!isOpen || !order) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Reject Order #{order.woo_order_id}</h3>
        <p>Please provide a reason for rejecting this order:</p>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="e.g., Out of delivery area, No capacity, etc."
          rows={4}
          className="reject-textarea"
        />
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
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? "Rejecting..." : "Confirm Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}
