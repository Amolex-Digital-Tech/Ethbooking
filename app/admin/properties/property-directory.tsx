"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Building2, FileCheck2, Image as ImageIcon, Search, SlidersHorizontal } from "lucide-react";

type PropertyItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  verificationStatus: string;
  propertyType: string;
  city: string;
  region: string | null;
  partnerName: string;
  partnerEmail: string | null;
  photoCount: number;
  documentCount: number;
  roomTypeCount: number;
  createdAt: string;
};

const statusStyles: Record<string, string> = {
  DRAFT: "bg-stone-100 text-stone-700",
  PENDING_REVIEW: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  UNDER_REVIEW: "bg-sky-50 text-sky-800 ring-1 ring-sky-200",
  APPROVED: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
  SUSPENDED: "bg-orange-50 text-orange-800 ring-1 ring-orange-200",
  ARCHIVED: "bg-slate-100 text-slate-700",
};

function humanize(value: string) {
  return value.toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default function PropertyDirectory({ properties }: { properties: PropertyItem[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [verification, setVerification] = useState("ALL");
  const [city, setCity] = useState("ALL");
  const [sort, setSort] = useState("NEWEST");

  const cities = useMemo(() => [...new Set(properties.map((property) => property.city).filter(Boolean))].sort(), [properties]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { ALL: properties.length };
    for (const property of properties) result[property.status] = (result[property.status] ?? 0) + 1;
    return result;
  }, [properties]);

  const filteredProperties = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = properties.filter((property) => {
      const matchesSearch = !query || [
        property.name, property.slug, property.id, property.partnerName,
        property.partnerEmail ?? "", property.city, property.region ?? "", property.propertyType,
      ].some((value) => value.toLowerCase().includes(query));
      return matchesSearch &&
        (status === "ALL" || property.status === status) &&
        (verification === "ALL" || property.verificationStatus === verification) &&
        (city === "ALL" || property.city === city);
    });
    return filtered.sort((a, b) => {
      if (sort === "OLDEST") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "NAME") return a.name.localeCompare(b.name);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [properties, search, status, verification, city, sort]);

  const cards = [
    { label: "All properties", key: "ALL", hint: "Across all partners" },
    { label: "Awaiting review", key: "PENDING_REVIEW", hint: "Need an admin decision" },
    { label: "Approved listings", key: "APPROVED", hint: "Eligible to be published" },
    { label: "Suspended", key: "SUSPENDED", hint: "Not accepting new bookings" },
  ];

  function clearFilters() {
    setSearch("");
    setStatus("ALL");
    setVerification("ALL");
    setCity("ALL");
    setSort("NEWEST");
  }

  return (
    <main className="min-h-full bg-[#F5F6F2] px-4 py-7 text-[#20372B] sm:px-7 lg:px-9">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-[#879487]">MARKETPLACE / LISTINGS</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Property management</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#788279]">Review partner listings, manage property information and keep marketplace quality under control.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#E2E8DE] bg-white px-3.5 py-2.5 text-xs font-medium text-[#657469]">
            <Building2 size={15} /> {properties.length.toLocaleString()} registered listings
          </div>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {cards.map((item) => {
            const active = status === item.key;
            return (
              <button key={item.key} type="button" onClick={() => setStatus(item.key)}
                className={`rounded-2xl border p-4 text-left transition sm:p-5 ${active ? "border-[#294332] bg-[#294332] text-white shadow-sm" : "border-[#E5E9E1] bg-white text-[#20372B] hover:border-[#B9CBB5]"}`}>
                <span className={`text-xs font-semibold ${active ? "text-white/75" : "text-[#788279]"}`}>{item.label}</span>
                <span className="mt-2 block text-3xl font-semibold tabular-nums">{counts[item.key] ?? 0}</span>
                <span className={`mt-1 block text-[11px] ${active ? "text-white/60" : "text-[#9AA39A]"}`}>{item.hint}</span>
              </button>
            );
          })}
        </section>

        <section className="mb-5 rounded-2xl border border-[#E5E9E1] bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-[#657469]"><SlidersHorizontal size={15} /> Search and filters</div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.6fr)_repeat(3,minmax(145px,1fr))]">
            <label className="relative block text-xs font-semibold text-[#657469]">Search listings
              <Search size={16} className="absolute left-3 top-[39px] text-[#9AA39A]" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Property, partner, city or ID..."
                className="mt-1.5 w-full rounded-xl border border-[#E2E8DE] bg-[#FCFDFB] py-3 pl-9 pr-3 text-sm font-normal text-[#263B2D] outline-none focus:border-[#78936F] focus:ring-2 focus:ring-[#EAF1E5]" />
            </label>
            <label className="block text-xs font-semibold text-[#657469]">Listing status
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#E2E8DE] bg-[#FCFDFB] px-3 py-3 text-sm font-normal text-[#263B2D]">
                <option value="ALL">All statuses</option>
                {["DRAFT","PENDING_REVIEW","UNDER_REVIEW","APPROVED","REJECTED","SUSPENDED","ARCHIVED"].map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-[#657469]">Verification
              <select value={verification} onChange={(event) => setVerification(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#E2E8DE] bg-[#FCFDFB] px-3 py-3 text-sm font-normal text-[#263B2D]">
                <option value="ALL">All verification</option>
                {["NOT_SUBMITTED","PENDING","VERIFIED","REJECTED"].map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-[#657469]">City
              <select value={city} onChange={(event) => setCity(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#E2E8DE] bg-[#FCFDFB] px-3 py-3 text-sm font-normal text-[#263B2D]">
                <option value="ALL">All cities</option>
                {cities.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#EDF0EA] pt-4">
            <p className="text-xs text-[#879087]">Showing <strong className="text-[#294332]">{filteredProperties.length}</strong> of {properties.length} properties</p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-[#788279]">Sort
                <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-[#E2E8DE] bg-white px-2.5 py-2 text-xs text-[#294332]">
                  <option value="NEWEST">Newest first</option><option value="OLDEST">Oldest first</option><option value="NAME">Name A–Z</option>
                </select>
              </label>
              <button type="button" onClick={clearFilters} className="text-xs font-semibold text-[#52704F] hover:underline">Clear filters</button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#E5E9E1] bg-white">
          <div className="flex flex-col justify-between gap-1 border-b border-[#EDF0EA] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
            <div><h2 className="text-sm font-semibold text-[#20372B]">Registered properties</h2><p className="mt-1 text-xs text-[#879087]">Select a listing to inspect and manage its complete record.</p></div>
            <span className="text-xs text-[#879087]">Updated from live database on page load</span>
          </div>
          {filteredProperties.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Building2 className="mx-auto text-[#B4BDB2]" size={30} />
              <p className="mt-3 text-sm font-semibold text-[#294332]">No matching properties</p>
              <p className="mt-1 text-xs text-[#879087]">Try a different search or remove some filters.</p>
              <button type="button" onClick={clearFilters} className="mt-4 text-xs font-semibold text-[#52704F] hover:underline">Reset filters</button>
            </div>
          ) : (
            <div className="divide-y divide-[#EDF0EA]">
              {filteredProperties.map((property) => (
                <article key={property.id} className="flex flex-col gap-4 px-5 py-5 transition hover:bg-[#FCFDFB] sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#294332] sm:text-base">{property.name}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles[property.status] ?? "bg-stone-100 text-stone-700"}`}>{humanize(property.status)}</span>
                      <span className="rounded-full bg-[#F1F4EE] px-2.5 py-1 text-[10px] font-semibold text-[#667563]">{humanize(property.verificationStatus)}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-[#788279]">{humanize(property.propertyType)} <span className="px-1.5 text-[#C1C9BE]">·</span> {[property.city,property.region].filter(Boolean).join(", ")}</p>
                    <p className="mt-2 text-xs text-[#657469]">Partner <span className="font-semibold text-[#294332]">{property.partnerName}</span>{property.partnerEmail ? <span className="text-[#9AA39A]"> · {property.partnerEmail}</span> : null}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[#879087]">
                      <span className="inline-flex items-center gap-1"><ImageIcon size={13} /> {property.photoCount} photos</span>
                      <span className="inline-flex items-center gap-1"><FileCheck2 size={13} /> {property.documentCount} documents</span>
                      <span className="inline-flex items-center gap-1"><Building2 size={13} /> {property.roomTypeCount} room types</span>
                      <span>Registered {dateLabel(property.createdAt)}</span>
                    </div>
                  </div>
                  <Link href={`/admin/properties/${property.id}`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#DCE5D8] bg-white px-4 py-2.5 text-xs font-semibold text-[#36513C] transition hover:border-[#AFC4A8] hover:bg-[#F3F7F0]">
                    Manage property <ArrowUpRight size={14} />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
