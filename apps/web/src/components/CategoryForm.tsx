import { useState } from "react";
import {
  createCategory,
  type Category,
  type CategoryType,
} from "../services/category.service";
import { getApiErrorMessage } from "../lib/api";

type CategoryFormProps = {
  type: CategoryType;
  onCreated: (category: Category) => void;
  onCancel: () => void;
  onError: (message: string) => void;
};

export default function CategoryForm({
  type,
  onCreated,
  onCancel,
  onError,
}: CategoryFormProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748B");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      onError("Nama kategori wajib diisi.");
      return;
    }

    setSaving(true);
    onError("");

    try {
      const category = await createCategory({
        name: trimmedName,
        type,
        color,
        icon: "tag",
      });

      onCreated(category);
    } catch (err) {
      onError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="category-form">
      <div className="category-form-heading">
        <div>
          <strong>New {type} category</strong>
          <span>Buat kategori yang sesuai kebutuhanmu.</span>
        </div>
      </div>

      <div className="category-form-fields">
        <div className="form-field">
          <label htmlFor="category-name">Category name</label>

          <input
            id="category-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            placeholder={
              type === "income" ? "Contoh: Freelance" : "Contoh: Kopi"
            }
            disabled={saving}
          />
        </div>

        <div className="form-field">
          <label htmlFor="category-color">Color</label>

          <div className="category-color-field">
            <input
              id="category-color"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              disabled={saving}
            />

            <span>{color.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="category-form-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>

        <button
          type="button"
          className="submit-button"
          onClick={() => void handleCreate()}
          disabled={saving}
        >
          {saving ? "Saving..." : "Create category"}
        </button>
      </div>
    </div>
  );
}
