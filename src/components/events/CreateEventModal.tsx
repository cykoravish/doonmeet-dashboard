"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/apiClient";

function toLocalDatetimeInputValue(d: Date): string {
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function CreateEventModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [date, setDate] = useState(() => toLocalDatetimeInputValue(new Date(Date.now() + 86400000)));
  const [capacity, setCapacity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setDescription("");
    setLocationName("");
    setLocationAddress("");
    setDate(toLocalDatetimeInputValue(new Date(Date.now() + 86400000)));
    setCapacity("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/admin/events", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          locationName,
          locationAddress,
          date: new Date(date).toISOString(),
          capacity: capacity ? Number(capacity) : null,
          status: "published",
        }),
      });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create event");
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
      title="Create an event"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Title">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sunday Morning Trail Run"
            className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
          />
        </Field>

        <Field label="Description">
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What's happening?"
            className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 resize-none"
          />
        </Field>

        <Field label="Date & time">
          <input
            required
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Location name">
            <input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Robber's Cave"
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
            />
          </Field>
          <Field label="Capacity (optional)">
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Unlimited"
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
            />
          </Field>
        </div>

        <Field label="Address">
          <input
            value={locationAddress}
            onChange={(e) => setLocationAddress(e.target.value)}
            placeholder="Full address"
            className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40"
          />
        </Field>

        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" loading={loading} className="mt-1">
          Create event
        </Button>
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
