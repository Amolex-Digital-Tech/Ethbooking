
"use client";

import { useRef, useState } from "react";

type PropertyPhoto = {
  id: string;
  publicUrl: string | null;
  altText: string | null;
  isCover: boolean;
};

type PropertyPhotosFormProps = {
  partnerId: string;
  propertyId: string;
  initialPhotos: PropertyPhoto[];
};

const MAX_PHOTOS = 50;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function PropertyPhotosForm({
  partnerId,
  propertyId,
  initialPhotos,
}: PropertyPhotosFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [altText, setAltText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const remaining = Math.max(0, MAX_PHOTOS - initialPhotos.length);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selected = Array.from(event.target.files ?? []);
    setMessage("");
    setIsError(false);

    if (selected.length > remaining) {
      setIsError(true);
      setMessage(
        `You can select up to ${remaining} more photo(s).`
      );
      setFiles([]);
      event.target.value = "";
      return;
    }

    const invalid = selected.find(
      (file) =>
        !ALLOWED_TYPES.includes(file.type) ||
        file.size === 0 ||
        file.size > MAX_FILE_SIZE
    );

    if (invalid) {
      setIsError(true);
      setMessage(
        "Use non-empty JPEG, PNG, or WebP images, each no larger than 5 MB."
      );
      setFiles([]);
      event.target.value = "";
      return;
    }

    setFiles(selected);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (files.length === 0) {
      setIsError(true);
      setMessage("Please select at least one image.");
      return;
    }

    if (files.length > remaining) {
      setIsError(true);
      setMessage(`Only ${remaining} photo slots remain.`);
      return;
    }

    setIsUploading(true);
    setMessage("");
    setIsError(false);

    try {
      const formData = new FormData();

      files.forEach((file) => {
        formData.append("files", file);
      });

      formData.append("altText", altText);

      const response = await fetch(
        `/api/partners/${partnerId}/properties/${propertyId}/photos`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Photo upload failed.");
      }

      setFiles([]);
      setAltText("");
      if (inputRef.current) inputRef.current.value = "";

      setMessage(
        `${result.data.length} photo(s) uploaded successfully.`
      );

      window.location.reload();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while uploading."
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <div>
        <h2 className="text-xl font-bold">Property Photos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload up to 50 photos for your property. Select multiple
          images at once. JPEG, PNG, and WebP are supported, up to
          5 MB per image.
        </p>
        <p className="mt-2 text-sm font-medium text-slate-700">
          {initialPhotos.length} of {MAX_PHOTOS} photos uploaded
          {" · "}
          {remaining} remaining
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="property-photos"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Choose photos
          </label>

          <input
            ref={inputRef}
            id="property-photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={remaining === 0 || isUploading}
            onChange={handleFileChange}
            className="block w-full rounded-xl border border-slate-200 p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-700"
          />

          {files.length > 0 && (
            <p className="mt-2 text-sm text-slate-600">
              {files.length} photo(s) selected
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="photo-alt-text"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Description for these photos (optional)
          </label>

          <input
            id="photo-alt-text"
            type="text"
            maxLength={250}
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            placeholder="e.g. Hotel exterior in Addis Ababa"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {message && (
          <p
            role="status"
            className={`text-sm ${
              isError ? "text-red-600" : "text-green-700"
            }`}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={isUploading || files.length === 0 || remaining === 0}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading
            ? "Uploading photos..."
            : `Upload ${files.length || ""} photo${files.length === 1 ? "" : "s"}`}
        </button>
      </form>

      <div className="mt-8">
        <h3 className="font-semibold">
          Uploaded Photos ({initialPhotos.length})
        </h3>

        {initialPhotos.length === 0 ? (
          <p className="mt-3 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
            No photos uploaded yet.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {initialPhotos.map((photo) => (
              <div
                key={photo.id}
                className="overflow-hidden rounded-xl border border-slate-200"
              >
                {photo.publicUrl ? (
                  <img
                    src={photo.publicUrl}
                    alt={photo.altText || "Property photo"}
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-slate-100 text-sm text-slate-500">
                    Image URL unavailable
                  </div>
                )}

                <div className="p-3">
                  {photo.isCover && (
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      Cover photo
                    </span>
                  )}
                  <p className="mt-2 truncate text-sm text-slate-600">
                    {photo.altText || "Property photo"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
