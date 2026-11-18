
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Partner = {
  id: string;
  businessName: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  propertyCount: number;
};
type PartnerAction = "APPROVE" | "SUSPEND" | "REACTIVATE";

export default function PartnerDirectory({
  partners,
}: {
  partners: Partner[];
}) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const counts = useMemo(
    () => ({
      total: partners.length,
      pending: partners.filter((partner) => partner.status === "PENDING").length,
      active: partners.filter((partner) => partner.status === "ACTIVE").length,
      suspended: partners.filter((partner) => partner.status === "SUSPENDED").length,
    }),
    [partners]
  );

  const filteredPartners = useMemo(() => {
    const query = search.trim().toLowerCase();

    return partners.filter((partner) => {
      const matchesSearch =
        !query ||
        [
          partner.businessName,
          partner.legalName,
          partner.email,
          partner.phone,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "ALL" || partner.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [partners, search, statusFilter]);

  async function handleAction(partner: Partner, action: PartnerAction) {
    const confirmations: Record<PartnerAction, string> = {
      APPROVE: `Approve ${partner.businessName}? This will activate the partner account.`,
      SUSPEND: `Suspend ${partner.businessName}?`,
      REACTIVATE: `Reactivate ${partner.businessName}?`,
    };

    if (!window.confirm(confirmations[action])) return;

    setLoadingId(partner.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/partners/${partner.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to update partner account.");
      }

      setMessage(result.message || "Partner account updated successfully.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoadingId(null);
    }
  }

  function statusStyle(status: string) {
    switch (status) {
      case "ACTIVE":
        return "bg-green-50 text-green-800";
      case "PENDING":
        return "bg-amber-50 text-amber-800";
      case "SUSPENDED":
        return "bg-red-50 text-red-800";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  const buttonClass =
    "rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <main className="min-h-screen bg-[#F4F3EF] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <Link
            href="/admin"
            className="text-sm font-medium text-[#536D50] hover:underline"
          >
            ← Back to dashboard
          </Link>

          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-[#75816F]">
                ETHIOPIANBOOKING / ADMINISTRATION
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[#263B2D]">
                Partner Management
              </h1>
              <p className="mt-2 text-sm text-[#77766F]">
                Review partner accounts and manage their platform status.
              </p>
            </div>

            <p className="text-sm text-[#77766F]">
              {partners.length} registered partner
              {partners.length === 1 ? "" : "s"}
            </p>
          </div>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "All partners", value: counts.total },
            { label: "Pending approval", value: counts.pending },
            { label: "Active partners", value: counts.active },
            { label: "Suspended partners", value: counts.suspended },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[#E7E5DF] bg-white p-5"
            >
              <p className="text-sm text-[#77766F]">{item.label}</p>
              <p className="mt-3 text-2xl font-semibold text-[#263B2D]">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-[#E7E5DF] bg-white">
          <div className="flex flex-col gap-3 border-b border-[#EEECE6] p-5 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search business name, email, phone..."
              className="min-w-0 flex-1 rounded-xl border border-[#E3E1DA] px-4 py-3 text-sm text-[#263B2D] outline-none focus:border-[#758B70]"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-[#E3E1DA] bg-white px-4 py-3 text-sm text-[#263B2D] outline-none focus:border-[#758B70]"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {filteredPartners.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-[#263B2D]">
                No partners found.
              </p>
              <p className="mt-2 text-sm text-[#77766F]">
                Try changing your search or status filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#EEECE6]">
              {filteredPartners.map((partner) => (
                <article key={partner.id} className="p-5">
                  <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-semibold text-[#263B2D]">
                          {partner.businessName}
                        </h2>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle(partner.status)}`}
                        >
                          {partner.status.replaceAll("_", " ")}
                        </span>
                      </div>

                      {partner.legalName && (
                        <p className="mt-1 text-sm text-[#77766F]">
                          Legal name: {partner.legalName}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#77766F]">
                        <span>{partner.email}</span>
                        <span>{partner.phone}</span>
                        <span>
                          {partner.propertyCount} propert
                          {partner.propertyCount === 1 ? "y" : "ies"}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-[#98958D]">
                        Registered{" "}
                        {new Intl.DateTimeFormat("en-GB", {
                          dateStyle: "medium",
                        }).format(new Date(partner.createdAt))}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/partners/${partner.id}`}
                        className={`${buttonClass} border border-[#DCE4D8] text-[#36513C] hover:bg-[#F5F8F2]`}
                      >
                        View profile
                      </Link>
                      {partner.status === "PENDING" && (
                        <button
                          type="button"
                          disabled={loadingId !== null}
                          onClick={() => handleAction(partner, "APPROVE")}
                          className={`${buttonClass} bg-[#405744] text-white hover:bg-[#304532]`}
                        >
                          {loadingId === partner.id
                            ? "Updating..."
                            : "Approve partner"}
                        </button>
                      )}

                      {partner.status === "ACTIVE" && (
                        <button
                          type="button"
                          disabled={loadingId !== null}
                          onClick={() => handleAction(partner, "SUSPEND")}
                          className={`${buttonClass} bg-red-50 text-red-700 hover:bg-red-100`}
                        >
                          {loadingId === partner.id
                            ? "Updating..."
                            : "Suspend"}
                        </button>
                      )}

                      {partner.status === "SUSPENDED" && (
                        <button
                          type="button"
                          disabled={loadingId !== null}
                          onClick={() => handleAction(partner, "REACTIVATE")}
                          className={`${buttonClass} bg-blue-50 text-blue-700 hover:bg-blue-100`}
                        >
                          {loadingId === partner.id
                            ? "Updating..."
                            : "Reactivate"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="mt-5 text-xs text-[#89877F]">
          Partner account actions change the partner status only. They do not
          delete partner profiles, properties, or booking history.
        </p>
      </div>
    </main>
  );
}
