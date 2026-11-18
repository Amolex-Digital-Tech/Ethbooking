
"use client";

import { useCallback, useState } from "react";

type Application = {
  id: string;
  businessName: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  applicants: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  }[];
};

export default function PartnerReviewList({
  initialApplications,
}: {
  initialApplications: Application[];
}) {
  const [applications, setApplications] = useState(initialApplications);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/partners", {
      cache: "no-store",
    });

    const result = await response.json();

    if (response.ok && result.success) {
      setApplications(result.data);
    }
  }, []);

  async function review(
    id: string,
    decision: "APPROVE" | "REJECT",
  ) {
    const confirmation =
      decision === "APPROVE"
        ? "Approve this partner? This enables partner login for the applicant."
        : "Reject this partner application?";

    if (!window.confirm(confirmation)) return;

    setBusyId(id);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/partners/${id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        },
      );

      const result = await response.json();

      setMessage(
        result.message ||
          result.error ||
          "Unable to review application.",
      );

      if (response.ok && result.success) {
        await refresh();
      }
    } catch {
      setMessage("Unable to connect to the review service.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {message && (
        <p
          role="status"
          className="rounded-xl border border-slate-200 bg-white p-4 text-sm"
        >
          {message}
        </p>
      )}

      {applications.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">
          There are no partner applications waiting for review.
        </div>
      ) : (
        applications.map((application) => (
          <article
            key={application.id}
            className="rounded-2xl border border-slate-200 bg-white p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {application.businessName}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Applicant:{" "}
                  {application.applicants
                    .map((a) =>
                      [a.firstName, a.lastName]
                        .filter(Boolean)
                        .join(" "),
                    )
                    .filter(Boolean)
                    .join(", ") || "Account holder"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Account email: {application.email || "Not provided"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Business phone: {application.phone || "Not provided"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Legal name: {application.legalName || "Not provided"}
                </p>

                <p className="mt-3 break-all text-xs text-slate-400">
                  Partner ID: <code>{application.id}</code>
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Submitted{" "}
                  {new Date(application.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busyId === application.id}
                  onClick={() =>
                    void review(application.id, "APPROVE")
                  }
                  className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {busyId === application.id
                    ? "Working..."
                    : "Approve"}
                </button>

                <button
                  type="button"
                  disabled={busyId === application.id}
                  onClick={() =>
                    void review(application.id, "REJECT")
                  }
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
