import { CalendarDays, CheckCircle2, CircleX } from "lucide-react";

type DashboardStatsProps = {
  upcoming: number;
  completed: number;
  cancelled: number;
};

export default function DashboardStats({
  upcoming,
  completed,
  cancelled,
}: DashboardStatsProps) {
  const stats = [
    {
      label: "Upcoming stays",
      value: upcoming,
      icon: CalendarDays,
    },
    {
      label: "Completed stays",
      value: completed,
      icon: CheckCircle2,
    },
    {
      label: "Cancelled or expired",
      value: cancelled,
      icon: CircleX,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.label}
            className="rounded-2xl border border-[#E8DCCB] bg-white/80 p-5 transition-colors hover:bg-white"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[#827D72]">
                {stat.label}
              </p>

              <Icon
                size={19}
                strokeWidth={1.6}
                className="shrink-0 text-[#758675]"
              />
            </div>

            <p className="mt-4 text-3xl font-semibold tracking-tight text-[#34483B]">
              {stat.value}
            </p>
          </div>
        );
      })}
    </section>
  );
}