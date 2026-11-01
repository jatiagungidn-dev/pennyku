import { useEffect, useState, type FormEvent } from "react";
import {
  createWallet,
  deleteWallet,
  getWallets,
  type Wallet,
  type WalletType,
} from "../lib/wallets";
import { formatIDR } from "../lib/format";

type WalletSectionProps = {
  wallets: Wallet[];
  onWalletsChange: (wallets: Wallet[]) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

const walletTypeLabel: Record<WalletType, string> = {
  cash: "Cash",
  bank: "Bank",
  "e-wallet": "E-Wallet",
  other: "Other",
};

export default function WalletSection({
  wallets,
  onWalletsChange,
  onError,
  onSuccess,
}: WalletSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingWalletId, setDeletingWalletId] = useState<string | null>(null);
  const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<WalletType>("cash");
  const [balance, setBalance] = useState("0");

  async function loadWallets() {
    setLoading(true);

    try {
      const data = await getWallets();
      onWalletsChange(data);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Gagal memuat wallet.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWallets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const initialBalance = Number(balance);

    if (!Number.isFinite(initialBalance) || initialBalance < 0) {
      onError("Saldo awal harus berupa angka nol atau lebih.");
      setSaving(false);
      return;
    }

    try {
      const wallet = await createWallet({
        name: name.trim(),
        type,
        initial_balance: initialBalance,
      });

      onWalletsChange([wallet, ...wallets]);

      setName("");
      setType("cash");
      setBalance("0");
      setShowForm(false);
      onSuccess("Wallet berhasil dibuat!");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Gagal membuat wallet.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteWallet() {
    if (!walletToDelete) return;

    setDeletingWalletId(walletToDelete.id);
    onError("");
    onSuccess("");

    try {
      await deleteWallet(walletToDelete.id);

      onWalletsChange(wallets.filter((item) => item.id !== walletToDelete.id));

      onSuccess(`Wallet "${walletToDelete.name}" berhasil dihapus.`);
      setWalletToDelete(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Gagal menghapus wallet.");
    } finally {
      setDeletingWalletId(null);
    }
  }

  return (
    <section className="content-card wallet-section">
      <div className="section-heading">
        <div>
          <h2>My wallets</h2>
          <p>Semua tempat penyimpanan uangmu.</p>
        </div>

        <button
          className="primary-button"
          onClick={() => {
            setShowForm((current) => !current);
            onError("");
            onSuccess("");
          }}
        >
          {showForm ? "Cancel" : "+ Add wallet"}
        </button>
      </div>

      {showForm && (
        <form className="wallet-form" onSubmit={handleCreateWallet}>
          <div className="form-field">
            <label htmlFor="wallet-name">Wallet name</label>
            <input
              id="wallet-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: Dompet utama"
              maxLength={100}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="wallet-type">Wallet type</label>
            <select
              id="wallet-type"
              value={type}
              onChange={(event) => setType(event.target.value as WalletType)}
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="e-wallet">E-Wallet</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="wallet-balance">Initial balance (IDR)</label>
            <input
              id="wallet-balance"
              type="number"
              min="0"
              max="99999999999999.99"
              step="0.01"
              value={balance}
              onChange={(event) => setBalance(event.target.value)}
              required
            />
          </div>

          <button className="submit-button" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create wallet"}
          </button>
        </form>
      )}

      {loading ? (
        <p role="status">Memuat wallet...</p>
      ) : wallets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">▣</div>
          <h3>Wallet pertamamu dimulai di sini</h3>
          <p>Tambahkan Cash, Bank, atau E-Wallet untuk mulai mengatur saldo.</p>

          {!showForm && (
            <button
              className="primary-button"
              onClick={() => setShowForm(true)}
            >
              Create your first wallet ↗
            </button>
          )}
        </div>
      ) : (
        <div className="wallet-list">
          {wallets.map((wallet) => (
            <article className="wallet-item" key={wallet.id}>
              <div className="wallet-item-icon">▣</div>

              <div className="wallet-item-details">
                <strong>{wallet.name}</strong>
                <span>{walletTypeLabel[wallet.type]}</span>
              </div>

              <div className="wallet-item-actions">
                <strong className="wallet-item-balance">
                  {formatIDR(Number(wallet.current_balance))}
                </strong>

                <button
                  type="button"
                  className="danger-button"
                  onClick={() => setWalletToDelete(wallet)}
                  disabled={deletingWalletId === wallet.id}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && (
        <button className="text-button" onClick={() => void loadWallets()}>
          Refresh wallets
        </button>
      )}

      {walletToDelete && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => {
            if (!deletingWalletId) {
              setWalletToDelete(null);
            }
          }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-wallet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-icon">🗑</div>

            <h3 id="delete-wallet-title">
              Hapus wallet “{walletToDelete.name}”?
            </h3>

            <p>
              Wallet ini dan semua transaksi yang terhubung dengannya akan
              dihapus permanen. Saldo{" "}
              <strong>
                {formatIDR(Number(walletToDelete.current_balance))}
              </strong>{" "}
              juga tidak akan lagi masuk ke total balance.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setWalletToDelete(null)}
                disabled={deletingWalletId === walletToDelete.id}
              >
                Keep wallet
              </button>

              <button
                type="button"
                className="danger-button solid"
                onClick={() => void handleDeleteWallet()}
                disabled={deletingWalletId === walletToDelete.id}
              >
                {deletingWalletId === walletToDelete.id
                  ? "Deleting..."
                  : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
