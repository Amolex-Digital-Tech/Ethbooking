"use client";

import { useState } from "react";

type PropertyDocument = {
  id: string;
  documentType: string;
  documentName: string | null;
  verificationStatus: string;
  rejectionReason: string | null;
  createdAt: string;
};

type Props = {
  partnerId: string;
  propertyId: string;
  initialDocuments: PropertyDocument[];
};

const DOCUMENT_TYPES = [
  { value: "BUSINESS_LICENSE", label: "Business License" },
  { value: "TOURISM_LICENSE", label: "Tourism License" },
  { value: "TAX_DOCUMENT", label: "Tax Document" },
  { value: "OWNER_ID", label: "Owner's ID" },
  { value: "PROPERTY_OWNERSHIP", label: "Property Ownership Document" },
  { value: "OTHER", label: "Other Document" },
];

function statusLabel(status: string) {
  switch (status) {
    case "VERIFIED":
      return "Verified";
    case "REJECTED":
      return "Rejected";
    case "PENDING":
      return "Pending Review";
    default:
      return status.replaceAll("_", " ");
  }
}

function statusStyle(status: string) {
  if (status === "VERIFIED") return "bg-green-100 text-green-800";
  if (status === "REJECTED") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-800";
}

export default function PropertyDocumentsForm({
  partnerId,
  propertyId,
  initialDocuments,
}: Props) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [documentType, setDocumentType] = useState("BUSINESS_LICENSE");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [removingDocumentId, setRemovingDocumentId] = useState<string | null>(null);

  async function replaceRejectedDocument(document: PropertyDocument) {
    if (!window.confirm("Remove this rejected document so you can upload a corrected replacement?")) return;

    setError("");
    setSuccess("");
    setRemovingDocumentId(document.id);

    try {
      const response = await fetch(
        `/api/partners/${partnerId}/properties/${propertyId}/documents/${document.id}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not remove the rejected document.");
      }

      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setSuccess("Rejected document removed. Upload the corrected file using the form above.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the rejected document.");
    } finally {
      setRemovingDocumentId(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!file) {
      setError("Please select a document.");
      return;
    }

    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      setError("Only PDF, JPG, and PNG files are allowed.");
      return;
    }

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError("The document must be smaller than 5 MB.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);

      const response = await fetch(
        `/api/partners/${partnerId}/properties/${propertyId}/documents`,
        { method: "POST", body: formData }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Document upload failed.");
      }

      const uploaded: PropertyDocument = {
        id: result.data.id,
        documentType: result.data.documentType,
        documentName: result.data.documentName,
        verificationStatus: result.data.verificationStatus,
        rejectionReason: null,
        createdAt: result.data.createdAt,
      };

      setDocuments((current) => [uploaded, ...current]);
      setFile(null);
      setDocumentType("BUSINESS_LICENSE");

      const input = document.getElementById(
        `document-file-${propertyId}`
      ) as HTMLInputElement | null;
      if (input) input.value = "";

      setSuccess("Document uploaded and submitted for review.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Document upload failed."
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold text-slate-900">
        Verification Documents
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Submit your property verification documents as PDF, JPG, or PNG files.
        Maximum size: 5 MB per document.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div>
          <label
            htmlFor={`document-type-${propertyId}`}
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Document Type
          </label>
          <select
            id={`document-type-${propertyId}`}
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
            disabled={isUploading}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`document-file-${propertyId}`}
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Choose Document
          </label>
          <input
            id={`document-file-${propertyId}`}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            disabled={isUploading}
            className="block w-full rounded-xl border border-slate-300 text-sm file:mr-4 file:border-0 file:bg-slate-100 file:px-4 file:py-3"
          />
          {file && (
            <p className="mt-2 text-xs text-slate-500">
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={isUploading}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isUploading ? "Uploading..." : "Upload Document"}
        </button>
      </form>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h3 className="font-semibold text-slate-900">Submitted Documents</h3>

        {documents.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No verification documents have been submitted yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {documents.map((document) => {
              const label =
                DOCUMENT_TYPES.find((item) => item.value === document.documentType)?.label ??
                document.documentType.replaceAll("_", " ");

              return (
                <div key={document.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{label}</p>
                      <p className="mt-1 break-words text-sm text-slate-600">
                        {document.documentName || "Uploaded document"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Submitted {new Date(document.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(document.verificationStatus)}`}>
                      {statusLabel(document.verificationStatus)}
                    </span>
                  </div>

                  {document.rejectionReason && (
                    <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      <strong>Reason for rejection:</strong> {document.rejectionReason}
                    </div>
                  )}

                  {document.verificationStatus === "REJECTED" && (
                    <button
                      type="button"
                      onClick={() => replaceRejectedDocument(document)}
                      disabled={isUploading || removingDocumentId !== null}
                      className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {removingDocumentId === document.id ? "Removing..." : "Remove and replace document"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
