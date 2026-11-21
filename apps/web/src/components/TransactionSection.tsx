import { useState } from "react";
import {
  deleteTransaction,
  type Transaction,
  type TransactionPagination,
} from "../services/transaction.service";
import type { Wallet } from "../services/wallet.service";
import TransactionForm from "./TransactionForm";
import TransactionList from "./TransactionList";
import { getApiErrorMessage } from "../lib/api";
import { formatIDR } from "../lib/format";

type TransactionSectionProps = {
  wallets: Wallet[];
  transactions: Transaction[];
  pagination: TransactionPagination;
  onPageChange: (page: number) => void;
  onTransactionSaved: (transaction: Transaction) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export default function TransactionSection({
  wallets,
  transactions,
  pagination,
  onPageChange,
  onTransactionSaved,
  onError,
  onSuccess,
}: TransactionSectionProps) {
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteTransaction() {
    if (!transactionToDelete) return;

    setDeleting(true);
    onError("");
    onSuccess("");

    try {
      await deleteTransaction(transactionToDelete.id);

      await onTransactionSaved(transactionToDelete);

      setTransactionToDelete(null);
      onSuccess("Transaksi berhasil dihapus.");
    } catch (err) {
      onError(getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="transaction-section">
      <div className="section-heading">
        <div>
          <h2>Transactions</h2>
          <p>Catat uang masuk dan keluar dari wallet-mu.</p>
        </div>
      </div>

      <TransactionForm
        key={editingTransaction?.id ?? "new-transaction"}
        wallets={wallets}
        initialTransaction={editingTransaction}
        onTransactionSaved={(saved) => {
          onTransactionSaved(saved);
          setEditingTransaction(null);
        }}
        onError={onError}
        onSuccess={onSuccess}
        onCancel={() => setEditingTransaction(null)}
      />

      <TransactionList
        transactions={transactions}
        pagination={pagination}
        onPageChange={onPageChange}
        onEdit={setEditingTransaction}
        onDelete={setTransactionToDelete}
      />

      {transactionToDelete && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => {
            if (!deleting) {
              setTransactionToDelete(null);
            }
          }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-transaction-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-icon">🗑</div>

            <h3 id="delete-transaction-title">Hapus transaksi ini?</h3>

            <p>
              {transactionToDelete.type === "income" ? "Income" : "Expense"}
              {" · "}
              <strong>{formatIDR(Number(transactionToDelete.amount))}</strong>
            </p>

            <p>
              Menghapus transaksi akan memperbarui saldo wallet dan ringkasan
              keuanganmu. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setTransactionToDelete(null)}
                disabled={deleting}
              >
                Keep transaction
              </button>

              <button
                type="button"
                className="danger-button solid"
                onClick={() => void handleDeleteTransaction()}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
