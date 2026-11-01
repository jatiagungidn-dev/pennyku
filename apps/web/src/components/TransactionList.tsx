import { formatIDR } from "../lib/format";
import type { Transaction } from "../lib/transactions";

type TransactionListProps = {
  transactions: Transaction[];
};

export default function TransactionList({
  transactions,
}: TransactionListProps) {
  return (
    <div className="transaction-history">
      <h3>Recent transactions</h3>

      {transactions.length === 0 ? (
        <p>Belum ada transaksi. Yuk, catat transaksi pertamamu!</p>
      ) : (
        <div className="wallet-list">
          {transactions.map((transaction) => (
            <article className="wallet-item" key={transaction.id}>
              <div className="wallet-item-icon">
                {transaction.type === "income" ? "↙" : "↗"}
              </div>

              <div className="wallet-item-details">
                <strong>
                  {transaction.description ||
                    transaction.category_name ||
                    (transaction.type === "income" ? "Income" : "Expense")}
                </strong>

                <span>
                  {transaction.wallet_name ?? "Wallet"} ·{" "}
                  {transaction.category_name ?? "Uncategorized"} ·{" "}
                  {transaction.transaction_date}
                </span>
              </div>

              <strong className="wallet-item-balance">
                {transaction.type === "income" ? "+" : "-"}
                {formatIDR(Number(transaction.amount))}
              </strong>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
