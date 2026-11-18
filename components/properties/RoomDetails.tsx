
"use client";

import { useState } from "react";

type RoomPhoto = {
  id: string;
  publicUrl: string | null;
  altText: string | null;
  sortOrder: number;
  isCover: boolean;
};

type RoomDetailsData = {
  id: string;
  name: string;
  description: string | null;
  maxGuests: number;
  maxAdults?: number | null;
  maxChildren?: number | null;
  bedType: string;
  bedCount: number;
  sizeSquareMeters: string | null;
  photos: RoomPhoto[];

  // Optional extra fields. Displayed only when supplied by the API.
  amenities?: string[] | null;
  bathroomFacilities?: string[] | null;
  views?: string[] | null;
  smokingPolicy?: string | null;
  reviewScore?: number | null;
  reviewCount?: number | null;
};

type Props = {
  room: RoomDetailsData;
  selected?: boolean;
  onSelect?: () => void;
};

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function DetailList({
  title,
  items,
}: {
  title: string;
  items?: string[] | null;
}) {
  if (!items?.length) return null;

  return (
    <section>
      <h4 className="text-sm font-semibold text-[#292d23]">
        {title}
      </h4>

      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="rounded-full border border-[#e8e5dc] bg-[#faf9f5] px-3 py-2 text-xs text-[#55594e]"
          >
            {titleCase(item)}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function RoomDetails({
  room,
  selected = false,
  onSelect,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);

  const photos = room.photos
    .filter((photo) => photo.publicUrl)
    .sort(
      (a, b) =>
        Number(b.isCover) - Number(a.isCover) ||
        a.sortOrder - b.sortOrder,
    );

  const bedDescription = `${room.bedCount} ${
    titleCase(room.bedType)
  } ${room.bedCount === 1 ? "bed" : "beds"}`;

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white transition ${
        selected
          ? "border-[#9bcf42] ring-2 ring-[#a3e635]/20"
          : "border-[#e8e5dc]"
      }`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full flex-col gap-4 p-4 text-left sm:flex-row sm:items-center sm:p-5"
      >
        <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-xl bg-[#f0eee7] sm:h-32 sm:w-44">
          {photos[0]?.publicUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photos[0].publicUrl!}
              alt={photos[0].altText || room.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-stone-500">
              Room photos coming soon
            </div>
          )}

          {photos.length > 1 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2.5 py-1 text-xs text-white">
              {photos.length} photos
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#292d23] sm:text-xl">
                {room.name}
              </h3>

              <p className="mt-2 text-sm text-stone-600">
                {room.sizeSquareMeters
                  ? `${room.sizeSquareMeters} m²`
                  : "Room size not specified"}
                {" · "}
                {bedDescription}
              </p>

              <p className="mt-2 text-sm text-stone-500">
                Accommodates up to {room.maxGuests} guests
              </p>
            </div>

            <span
              className="mt-1 shrink-0 rounded-full border border-[#e8e5dc] p-2 text-[#55594e]"
              aria-hidden="true"
            >
              {expanded ? "−" : "+"}
            </span>
          </div>

          <p className="mt-3 text-sm font-semibold text-[#607c36]">
            {expanded ? "Hide room details" : "View room details"}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#e8e5dc]">
          <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <h4 className="text-sm font-semibold text-[#292d23]">
                Room photos
              </h4>

              {photos.length > 0 ? (
                <>
                  <div className="mt-3 aspect-[4/3] overflow-hidden rounded-xl bg-[#f0eee7]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photos[activePhoto]?.publicUrl || photos[0].publicUrl!}
                      alt={
                        photos[activePhoto]?.altText ||
                        `${room.name} photo`
                      }
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {photos.length > 1 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {photos.map((photo, index) => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setActivePhoto(index)}
                          aria-label={`View room photo ${index + 1}`}
                          aria-pressed={activePhoto === index}
                          className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                            activePhoto === index
                              ? "border-[#8eb83d]"
                              : "border-transparent"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.publicUrl!}
                            alt={photo.altText || `${room.name} thumbnail`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-3 flex aspect-[4/3] items-center justify-center rounded-xl bg-[#f5f3ed] text-sm text-stone-500">
                  No room images have been uploaded.
                </div>
              )}
            </div>

            <div className="space-y-5">
              <section>
                <h4 className="text-sm font-semibold text-[#292d23]">
                  Room overview
                </h4>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#f7f7f1] p-3">
                    <p className="text-xs text-stone-500">Room size</p>
                    <p className="mt-1 font-semibold text-[#292d23]">
                      {room.sizeSquareMeters
                        ? `${room.sizeSquareMeters} m²`
                        : "Not specified"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#f7f7f1] p-3">
                    <p className="text-xs text-stone-500">Beds</p>
                    <p className="mt-1 font-semibold text-[#292d23]">
                      {bedDescription}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#f7f7f1] p-3">
                    <p className="text-xs text-stone-500">Guest capacity</p>
                    <p className="mt-1 font-semibold text-[#292d23]">
                      {room.maxGuests} guests
                    </p>
                  </div>

                  {room.reviewScore != null && (
                    <div className="rounded-xl bg-[#f7f7f1] p-3">
                      <p className="text-xs text-stone-500">Guest rating</p>
                      <p className="mt-1 font-semibold text-[#292d23]">
                        {room.reviewScore.toFixed(1)}
                        {room.reviewCount != null &&
                          ` · ${room.reviewCount} reviews`}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h4 className="text-sm font-semibold text-[#292d23]">
                  About this room
                </h4>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-stone-600">
                  {room.description ||
                    "The property has not added a description for this room yet."}
                </p>
              </section>

              <DetailList
                title="In your private bathroom"
                items={room.bathroomFacilities}
              />

              <DetailList
                title="Views"
                items={room.views}
              />

              <DetailList
                title="Room facilities"
                items={room.amenities}
              />

              {room.smokingPolicy && (
                <section>
                  <h4 className="text-sm font-semibold text-[#292d23]">
                    Smoking policy
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {room.smokingPolicy}
                  </p>
                </section>
              )}

              <button
                type="button"
                onClick={onSelect}
                className="w-full rounded-xl bg-[#a3e635] px-5 py-3 text-sm font-bold text-[#292d23] transition hover:bg-[#b4ed5b]"
              >
                {selected ? "Selected room" : "Choose this room"}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
