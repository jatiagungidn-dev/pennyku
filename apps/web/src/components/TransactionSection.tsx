import type { Transaction } from "../lib/transactions";
import type { Wallet } from "../lib/wallets";
import TransactionForm from "./TransactionForm";
import TransactionList from "./TransactionList";

type TransactionSectionProps = {
  wallets: Wallet[];
  transactions: Transaction[];
  onTransactionCreated: (transaction: Transaction) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export default function TransactionSection({
  wallets,
  transactions,
  onTransactionCreated,
  onError,
  onSuccess,
}: TransactionSectionProps) {
  return (
    <section className="transaction-section">
      <div className="section-heading">
        <div>
          <h2>Transactions</h2>
          <p>Catat uang masuk dan keluar dari wallet-mu.</p>
        </div>
      </div>

      <TransactionForm
        wallets={wallets}
        onTransactionCreated={onTransactionCreated}
        onError={onError}
        onSuccess={onSuccess}
      />

      <TransactionList transactions={transactions} />
    </section>
  );
}
