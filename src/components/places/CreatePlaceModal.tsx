"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { apiFetch, ApiError } from "@/lib/apiClient";

export function CreatePlaceModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const [category, setCategory] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [about, setAbout] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setImage("");
    setCategory("");
    setShortDescription("");
    setAbout("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/admin/places", {
        method: "POST",
        body: JSON.stringify({ title, image, category, shortDescription, about }),
      });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create place");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add a place"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Title">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Robber's Cave"
            className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
          />
        </Field>

        <Field label="Image URL">
          <input
            required
            type="url"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://..."
            className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
          />
        </Field>

        <Field label="Category">
          <input
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Nature, Waterfall, Temple"
            className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
          />
        </Field>

        <Field label="Short description">
          <input
            required
            maxLength={200}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="One-line summary shown on cards"
            className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
          />
        </Field>

        <Field label="About">
          <textarea
            required
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={4}
            placeholder="Full description"
            className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 resize-none"
          />
        </Field>

        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" loading={loading} className="mt-1">
          Add place
        </Button>
      </form>
    </Modal>
  );
}
