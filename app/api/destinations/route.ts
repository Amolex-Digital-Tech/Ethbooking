import { prisma } from "@/lib/prisma/client";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q")?.trim().toLocaleLowerCase() ?? "";
    const locations = await prisma.location.findMany({
      select: {
        country: true,
        region: true,
        city: true,
        subCity: true,
        neighborhood: true,
        _count: { select: { properties: { where: { status: "APPROVED" } } } },
      },
      orderBy: [{ city: "asc" }, { neighborhood: "asc" }],
      take: 2000,
    });

    const grouped = new Map<string, { name: string; type: string; propertyCount: number }>();
    const add = (name: string | null | undefined, type: string, count: number) => {
      const clean = name?.trim();
      if (!clean) return;
      const key = `${type}:${clean.toLocaleLowerCase()}`;
      const current = grouped.get(key);
      if (current) current.propertyCount += count;
      else grouped.set(key, { name: clean, type, propertyCount: count });
    };

    for (const name of ["Addis Ababa", "Bahir Dar", "Hawassa", "Lalibela", "Gondar", "Dire Dawa", "Adama", "Arba Minch", "Mekelle", "Jimma", "Axum", "Harar"]) add(name, "City", 0);

    for (const location of locations) {
      const count = location._count.properties;
      add(location.country, "Country", count);
      add(location.region, "Region", count);
      add(location.city, "City", count);
      add(location.subCity, "Sub-city", count);
      add(location.neighborhood, "Neighborhood", count);
    }

    const suggestions = [...grouped.values()]
      .filter((item) => !query || item.name.toLocaleLowerCase().includes(query))
      .sort((a, b) => {
        if (a.propertyCount > 0 && b.propertyCount === 0) return -1;
        if (a.propertyCount === 0 && b.propertyCount > 0) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 15);

    return Response.json({ success: true, data: suggestions });
  } catch (error) {
    console.error("Destination suggestions failed:", error);
    return Response.json({ success: false, error: "Unable to load destinations." }, { status: 500 });
  }
}
