
"use client";

import { useCallback, useEffect, useState } from "react";

type RatePlanPhoto = {
  id: string;
  ratePlanId: string;
  storagePath: string;
  publicUrl: string | null;
  altText: string | null;
  sortOrder: number;
  createdAt: string;
};

type RatePlanPhotosProps = {
  partnerId: string;
  propertyId: string;
  roomTypeId: string;
  ratePlanId: string;
};

export default function RatePlanPhotos({
  partnerId,
  propertyId,
  roomTypeId,
  ratePlanId,
}: RatePlanPhotosProps) {
  const [photos, setPhotos] = useState<RatePlanPhoto[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const apiUrl =
    `/api/partners/${partnerId}/properties/${propertyId}` +
    `/rooms/${roomTypeId}/rate-plans/${ratePlanId}/photos`;

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load rate-plan photos.");
      }

      setPhotos(data.photos ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load rate-plan photos.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
  let cancelled = false;

  async function fetchPhotos() {
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load rate-plan photos.");
      }

      if (!cancelled) {
        setPhotos(data.photos ?? []);
        setError("");
      }
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load rate-plan photos.",
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  void fetchPhotos();

  return () => {
    cancelled = true;
  };
}, [apiUrl]);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files);
    setError("");
    setMessage("");
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      setError("Please select at least one image.");
      return;
    }

    if (selectedFiles.length > 10) {
      setError("You can upload at most 10 images at a time.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Image upload failed.");
      }

      setSelectedFiles([]);
      setMessage("Images uploaded successfully.");

      const input = document.getElementById(
        `rate-plan-photos-${ratePlanId}`,
      ) as HTMLInputElement | null;

      if (input) input.value = "";

      await loadPhotos();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Image upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photoId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this image?",
    );

    if (!confirmed) return;

    setDeletingId(photoId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(apiUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not delete the image.");
      }

      setPhotos((current) =>
        current.filter((photo) => photo.id !== photoId),
      );

      setMessage("Image deleted successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete the image.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-stone-900">
          Rate plan photos
        </h3>
        <p className="mt-1 text-sm text-stone-500">
          Upload images specifically for this rate plan. JPEG, PNG, and
          WebP are supported, up to 5 MB per image.
        </p>
      </div>

      <form onSubmit={handleUpload} className="space-y-3">
        <input
          id={`rate-plan-photos-${ratePlanId}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-4 file:py-2 file:font-medium file:text-stone-700 hover:file:bg-stone-200"
        />

        {selectedFiles.length > 0 && (
          <p className="text-sm text-stone-600">
            {selectedFiles.length} image
            {selectedFiles.length === 1 ? "" : "s"} selected
          </p>
        )}

        <button
          type="submit"
          disabled={uploading || selectedFiles.length === 0}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload images"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="mt-3 text-sm text-green-700">
          {message}
        </p>
      )}

      <div className="mt-5">
        <h4 className="mb-3 text-sm font-semibold text-stone-800">
          Uploaded images ({photos.length})
        </h4>

        {loading ? (
          <p className="text-sm text-stone-500">Loading images...</p>
        ) : photos.length === 0 ? (
          <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-500">
            No images uploaded for this rate plan yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="overflow-hidden rounded-lg border border-stone-200"
              >
                {photo.publicUrl ? (
                  <a
                    href={photo.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${photo.altText || "rate plan photo"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.publicUrl}
                      alt={photo.altText || "Rate plan photo"}
                      className="h-32 w-full object-cover"
                    />
                  </a>
                ) : (
                  <div className="flex h-32 items-center justify-center bg-stone-100 text-xs text-stone-500">
                    Image unavailable
                  </div>
                )}

                <div className="p-2">
                  <p className="truncate text-xs text-stone-600">
                    {photo.altText || "Rate plan photo"}
                  </p>

                  <button
                    type="button"
                    onClick={() => void handleDelete(photo.id)}
                    disabled={deletingId !== null}
                    className="mt-2 w-full rounded-md border border-red-200 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === photo.id ? "Deleting..." : "Delete image"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
