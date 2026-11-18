"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MapPin } from "lucide-react";

type MapPoint = {
  id: string;
  name: string;
  href: string;
  cardHref: string;
  latitude: number | null;
  longitude: number | null;
  price: number;
  available: boolean;
  fullyBooked: boolean;
  availabilityKnown: boolean;
  availabilityMessage: string;
};

export default function SearchResultsMap({ points, destination }: { points: MapPoint[]; destination: string }) {
  const located = points.filter((point) => point.latitude !== null && point.longitude !== null);
  const bounds = useMemo(() => {
    if (!located.length) return null;
    const latitudes = located.map((point) => point.latitude as number);
    const longitudes = located.map((point) => point.longitude as number);
    const latPad = Math.max((Math.max(...latitudes) - Math.min(...latitudes)) * 0.18, 0.01);
    const lonPad = Math.max((Math.max(...longitudes) - Math.min(...longitudes)) * 0.18, 0.01);
    return {
      minLat: Math.min(...latitudes) - latPad,
      maxLat: Math.max(...latitudes) + latPad,
      minLon: Math.min(...longitudes) - lonPad,
      maxLon: Math.max(...longitudes) + lonPad,
    };
  }, [located]);
  const mapQuery = bounds
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${bounds.minLon}%2C${bounds.minLat}%2C${bounds.maxLon}%2C${bounds.maxLat}&layer=mapnik`
    : `https://maps.google.com/maps?q=${encodeURIComponent(destination || "Ethiopia")}&output=embed`;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#DCE5DB] bg-white lg:sticky lg:top-24">
      <div className="relative h-[420px] bg-[#F3F5F1] lg:h-[calc(100vh-190px)] lg:min-h-[520px]">
        <iframe title="Map of property search results" src={mapQuery} className="absolute inset-0 h-full w-full border-0" loading="lazy" />
        {bounds && located.map((point) => {
          const left = ((point.longitude! - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 100;
          const top = (1 - (point.latitude! - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
          return (
            <Link key={point.id} href={point.cardHref} title={`${point.name} · ${point.fullyBooked ? "Fully booked" : point.availabilityKnown && !point.available ? "Partially available" : point.availabilityKnown ? "Available" : point.availabilityMessage}`} style={{ left: `${Math.max(4, Math.min(96, left))}%`, top: `${Math.max(8, Math.min(92, top))}%` }} className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white px-3 py-1.5 text-xs font-extrabold shadow-lg transition hover:scale-110 ${point.fullyBooked ? "bg-gray-500 text-white" : "bg-[#4A5D4E] text-white"}`}>
              <span>{point.price.toLocaleString("en-US")} ETB</span>
              <span className="mt-0.5 block text-[9px] font-semibold opacity-90">{point.fullyBooked ? "Fully booked" : point.availabilityKnown ? point.available ? "Available" : "Partially available" : point.availabilityMessage}</span>
            </Link>
          );
        })}
        {!located.length && <div className="absolute inset-x-4 bottom-4 rounded-xl bg-white/95 p-3 text-sm text-gray-600 shadow">Some properties do not have map coordinates yet, so they are not shown as markers. Use the results list to open those stays.</div>}
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1"><MapPin size={14} className="text-[#4A5D4E]"/> Price markers select the matching property card</span>
        <span>Grey marker = fully booked</span>
        <span>{located.length} of {points.length} properties with coordinates</span>
      </div>
      <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
        Select a price marker to jump to its property in the results list.
      </div>
    </div>
  );
}
