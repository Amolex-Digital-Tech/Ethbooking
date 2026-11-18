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

type PropertyDocumentsFormProps = {
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

function formatStatus(status: string) {
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

function statusClasses(status: string) {
  switch (status) {
    case "VERIFIED":
      return "bg-green-100 text-green-800";
    case "REJECTED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-amber-100 text-amber-800";
  }
}

export default function PropertyDocumentsForm({
  partnerId,
  propertyId,
  initialDocuments,
}: PropertyDocumentsFormProps) {
  const [documents, setDocuments] =
    useState<PropertyDocument[]>(initialDocuments);
  const [documentType, setDocumentType] = useState("BUSINESS_LICENSE");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!file) {
      setError("Please select a document to upload.");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Only PDF, JPG, and PNG files are accepted.");
      return;
    }

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError("Choose a file smaller than 5 MB.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);

      const response = await fetch(
        `/api/partners/${partnerId}/properties/${propertyId}/documents`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to upload the document.");
      }

      const uploadedDocument: PropertyDocument = {
        id: result.data.id,
        documentType: result.data.documentType,
        documentName: result.data.documentName,
        verificationStatus: result.data.verificationStatus,
        rejectionReason: null,
        createdAt: result.data.createdAt,
      };

      setDocuments((current) => [uploadedDocument, ...current]);
      setFile(null);
      setDocumentType("BUSINESS_LICENSE");

      const fileInput = document.getElementById(
        `document-file-${propertyId}`
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      setSuccess("Document uploaded successfully and submitted for review.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Something went wrong while uploading."
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">
          Verification Documents
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Upload the documents needed to verify your property. Accepted formats
          are PDF, JPG, and PNG, with a maximum file size of 5 MB per document.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
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
            onChange={(event) =>
              setFile(event.target.files?.[0] ?? null)
            }
            disabled={isUploading}
            className="block w-full rounded-xl border border-slate-300 bg-white text-sm text-slate-700 file:mr-4 file:border-0 file:bg-slate-100 file:px-4 file:py-3 file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-60"
          />

          {file && (
            <p className="mt-2 text-xs text-slate-500">
              Selected: {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={isUploading}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? "Uploading Document..." : "Upload Document"}
        </button>
      </form>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h3 className="text-base font-semibold text-slate-900">
          Submitted Documents
        </h3>

        {documents.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">
              No verification documents yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Your uploaded documents will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {documents.map((document) => {
              const typeLabel =
                DOCUMENT_TYPES.find(
                  (type) => type.value === document.documentType
                )?.label ?? document.documentType.replaceAll("_", " ");

              return (
                <div
                  key={document.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {typeLabel}
                      </p>
                      <p className="mt-1 break-words text-sm text-slate-600">
                        {document.documentName || "Uploaded document"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Submitted{" "}
                        {new Date(document.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <span
                      className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                        document.verificationStatus
                      )}`}
                    >
                      {formatStatus(document.verificationStatus)}
                    </span>
                  </div>

                  {document.rejectionReason && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-sm font-semibold text-red-800">
                        Reason for rejection
                      </p>
                      <p className="mt-1 text-sm text-red-700">
                        {document.rejectionReason}
                      </p>
                    </div>
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
