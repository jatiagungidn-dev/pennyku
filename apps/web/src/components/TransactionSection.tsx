import { useState } from "react";
import type { Transaction } from "../services/transaction.service";
import type { Wallet } from "../services/wallet.service";
import TransactionForm from "./TransactionForm";
import TransactionList from "./TransactionList";

type TransactionSectionProps = {
  wallets: Wallet[];
  transactions: Transaction[];
  onTransactionSaved: (transaction: Transaction) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export default function TransactionSection({
  wallets,
  transactions,
  onTransactionSaved,
  onError,
  onSuccess,
}: TransactionSectionProps) {
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

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
        onEdit={setEditingTransaction}
      />
    </section>
  );
}
