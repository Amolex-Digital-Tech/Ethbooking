
"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CreditCard,
  ImagePlus,
  LockKeyhole,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  firstName: string;
  lastName: string;
  phone: string;
  countryCode: string;
  email: string;
  avatarUrl: string;
};

type Section =
  | "personal"
  | "security"
  | "bookings"
  | "notifications"
  | "payments";

const menu: {
  id: Section;
  label: string;
  description: string;
  icon: typeof UserRound;
}[] = [
  { id: "personal", label: "Personal information", description: "Your name and contact details", icon: UserRound },
  { id: "security", label: "Login and security", description: "Password and account access", icon: ShieldCheck },
  { id: "bookings", label: "My bookings", description: "Your reservations and stays", icon: CalendarDays },
  { id: "notifications", label: "Notifications", description: "Choose what updates you receive", icon: Bell },
  { id: "payments", label: "Payment methods", description: "Payment preferences", icon: CreditCard },
];

const emptyProfile: Profile = {
  firstName: "",
  lastName: "",
  phone: "",
  countryCode: "+251",
  email: "",
  avatarUrl: "",
};

const inputClass =
  "mt-2 w-full rounded-xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#34483B] outline-none transition focus:border-[#4A5D4E] focus:ring-2 focus:ring-[#4A5D4E]/10";

export default function ProfilePage() {
  const router = useRouter();
  const [active, setActive] = useState<Section>("personal");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [emailNotice, setEmailNotice] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [notifications, setNotifications] = useState({
    bookingUpdates: true,
    promotions: false,
    productNews: false,
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/customer/profile");
        const result = await response.json();

        if (response.status === 401) {
          router.push("/login");
          return;
        }

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to load your profile.");
        }

        const loaded: Profile = {
          ...emptyProfile,
          ...result.data,
        };

        setProfile(loaded);
        setEmailInput(loaded.email);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load your profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  function updateField(field: keyof Profile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          countryCode: profile.countryCode,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to save your profile.");
      }

      setProfile((current) => ({ ...current, ...result.data }));
      setNotice("Your personal information has been saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError("Your profile photo must be 3 MB or smaller.");
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");

    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.push("/login");
        return;
      }

      const userId = authData.user.id;
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/profile-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;
      const avatarUrl = path;
      const response = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          countryCode: profile.countryCode,
          avatarUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Photo uploaded, but profile update failed.");
      }

      setProfile((current) => ({
       ...current,
       ...(result.data as Partial<Profile>),
       }));
      setNotice("Your profile photo has been updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload your photo.");
    } finally {
      setUploading(false);
    }
  }


  async function changeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setEmailNotice("");
    setPasswordNotice("");

    try {
      const nextEmail = emailInput.trim().toLowerCase();

      if (!nextEmail) {
        setEmailNotice("Enter your new email address.");
        return;
      }

      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      if (nextEmail === (user.email ?? "").toLowerCase()) {
        setEmailNotice("Enter a different email address first.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        email: nextEmail,
      });

      if (updateError) {
        throw updateError;
      }

      setEmailNotice(
        "Email change requested. Check your email for the confirmation link. Your account email may remain unchanged until you confirm."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to request an email change."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPasswordNotice("");
    setEmailNotice("");

    if (password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setPassword("");
      setConfirmPassword("");
      setPasswordNotice("Your password has been updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update your password."
      );
    } finally {
      setSaving(false);
    }
  }


  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() || "E";

  return (
    <main className="min-h-screen bg-[#F4F3EF] text-[#34483B]">
      <header className="border-b border-[#E8DCCB] bg-[#FDF6EC]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="group">
            <p className="text-xl font-semibold tracking-tight text-[#34483B] group-hover:text-[#758675]">
              EthiopianBooking
            </p>
            <p className="mt-0.5 text-xs text-[#827D72]">Your next stay starts here</p>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[#E8DCCB] bg-white px-4 py-2.5 text-sm hover:bg-[#F4F3EF]">
            <ArrowLeft size={16} /> Back to stays
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12">
        <div className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#758675]">Your account</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Profile settings</h1>
          <p className="mt-2 text-sm text-[#827D72]">Manage your personal details, security, and preferences.</p>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="mb-5 rounded-xl border border-[#D4E2D2] bg-white p-4 text-sm text-[#34483B]">
            <Check className="mr-2 inline" size={16} /> {notice}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-[#E8DCCB] bg-white p-3">
            <div className="flex items-center gap-3 px-3 py-4">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E8E9DF] text-sm font-semibold text-[#34483B]">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt="Profile" className="size-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{fullName || "Your profile"}</p>
                <p className="truncate text-xs text-[#827D72]">{profile.email}</p>
              </div>
            </div>

            <nav className="space-y-1" aria-label="Profile settings">
              {menu.map((item) => {
                const Icon = item.icon;
                const selected = active === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActive(item.id);
                      setError("");
                      setNotice("");
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                      selected ? "bg-[#E9EDE5] text-[#34483B]" : "text-[#827D72] hover:bg-[#F8F6F1] hover:text-[#34483B]"
                    }`}
                  >
                    <Icon size={18} strokeWidth={1.7} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="mt-0.5 block text-xs opacity-75">{item.description}</span>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                );
              })}
            </nav>

            <div className="mt-3 border-t border-[#F0E8DC] pt-3">
              <button
                type="button"
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  router.push("/");
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#9B4D43] hover:bg-red-50"
              >
                <LogOut size={17} /> Sign out
              </button>
            </div>
          </aside>

          <section className="min-w-0 rounded-2xl border border-[#E8DCCB] bg-white p-5 sm:p-8">
            {loading ? (
              <p className="py-12 text-center text-sm text-[#827D72]">Loading your account details…</p>
            ) : (
              <>
                {active === "personal" && (
                  <div>
                    <div className="mb-7 border-b border-[#F0E8DC] pb-5">
                      <h2 className="text-xl font-semibold">Personal information</h2>
                      <p className="mt-1 text-sm text-[#827D72]">Keep your contact details up to date.</p>
                    </div>

                    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E8DCCB] bg-[#E9EDE5] text-xl font-semibold">
                        {profile.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={profile.avatarUrl} alt="Your profile photo" className="size-full object-cover" />
                        ) : initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Profile photo</p>
                        <p className="mt-1 text-xs text-[#827D72]">JPG, PNG, or WebP · Up to 3 MB</p>
                        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E8DCCB] px-4 py-2 text-sm font-medium hover:bg-[#FDF6EC]">
                          <ImagePlus size={16} />
                          {uploading ? "Uploading…" : "Upload photo"}
                          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={uploadPhoto} />
                        </label>
                      </div>
                    </div>

                    <form onSubmit={saveProfile} className="space-y-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <label className="block text-sm font-medium">First name
                          <input className={inputClass} required maxLength={80} value={profile.firstName} onChange={(e) => updateField("firstName", e.target.value)} />
                        </label>
                        <label className="block text-sm font-medium">Last name
                          <input className={inputClass} maxLength={80} value={profile.lastName} onChange={(e) => updateField("lastName", e.target.value)} />
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium">Email address</label>
                        <div className="mt-2 flex items-center gap-3 rounded-xl border border-[#E8DCCB] bg-[#F8F6F1] px-4 py-3">
                          <Mail size={17} className="text-[#758675]" />
                          <span className="min-w-0 break-all text-sm">{profile.email || "No email available"}</span>
                        </div>
                        <p className="mt-2 text-xs text-[#827D72]">To change your email, open Login and security.</p>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-[140px_minmax(0,1fr)]">
                        <label className="block text-sm font-medium">Country code
                          <input className={inputClass} value={profile.countryCode} maxLength={6} onChange={(e) => updateField("countryCode", e.target.value)} />
                        </label>
                        <label className="block text-sm font-medium">Phone number
                          <input className={inputClass} type="tel" maxLength={30} value={profile.phone} onChange={(e) => updateField("phone", e.target.value)} />
                        </label>
                      </div>
                      <div className="flex justify-end border-t border-[#F0E8DC] pt-5">
                        <button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#4A5D4E] px-5 py-3 text-sm font-medium text-white hover:bg-[#34483B] disabled:opacity-60">
                          <Save size={16} /> {saving ? "Saving…" : "Save changes"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {active === "security" && (
                  <div>
                    <div className="mb-7 border-b border-[#F0E8DC] pb-5">
                      <h2 className="text-xl font-semibold">Login and security</h2>
                      <p className="mt-1 text-sm text-[#827D72]">Update your login email and password.</p>
                    </div>
                    <form onSubmit={changeEmail} className="space-y-4 border-b border-[#F0E8DC] pb-7">
                      <h3 className="font-medium">Email address</h3>
                      <p className="text-sm text-[#827D72]">Current email: {profile.email}</p>
                      <label className="block text-sm font-medium">New email address
                        <input className={inputClass} type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
                      </label>
                      {emailNotice && <p role="status" className="text-sm text-[#4A5D4E]">{emailNotice}</p>}
                      <button disabled={saving} className="rounded-full border border-[#E8DCCB] px-4 py-2.5 text-sm font-medium hover:bg-[#FDF6EC] disabled:opacity-60">
                        {saving ? "Please wait…" : "Request email change"}
                      </button>
                    </form>

                    <form onSubmit={changePassword} className="mt-7 space-y-4">
                      <div className="flex items-center gap-2">
                        <LockKeyhole size={18} />
                        <h3 className="font-medium">Change password</h3>
                      </div>
                      <label className="block text-sm font-medium">New password
                        <input className={inputClass} type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
                      </label>
                      <label className="block text-sm font-medium">Confirm new password
                        <input className={inputClass} type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                      </label>
                      {passwordNotice && <p role="status" className="text-sm text-[#4A5D4E]">{passwordNotice}</p>}
                      <button disabled={saving} className="rounded-full bg-[#4A5D4E] px-5 py-3 text-sm font-medium text-white hover:bg-[#34483B] disabled:opacity-60">
                        {saving ? "Updating…" : "Update password"}
                      </button>
                    </form>
                  </div>
                )}

                {active === "bookings" && (
                  <div>
                    <h2 className="text-xl font-semibold">My bookings</h2>
                    <p className="mt-2 text-sm leading-6 text-[#827D72]">View your reservations, payment status, and upcoming stays in your customer dashboard.</p>
                    <Link href="/dashboard" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#4A5D4E] px-5 py-3 text-sm text-white hover:bg-[#34483B]">
                      View my bookings <ChevronRight size={16} />
                    </Link>
                  </div>
                )}

                {active === "notifications" && (
                  <div>
                    <h2 className="text-xl font-semibold">Notification settings</h2>
                    <p className="mt-2 text-sm text-[#827D72]">Choose which types of updates you prefer.</p>
                    <div className="mt-6 space-y-4">
                      {([
                        ["bookingUpdates", "Booking updates", "Reservation confirmations and important changes."],
                        ["promotions", "Offers and promotions", "Special accommodation offers and discounts."],
                        ["productNews", "EthiopianBooking news", "New features and service announcements."],
                      ] as const).map(([key, title, description]) => (
                        <label key={key} className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[#E8DCCB] p-4">
                          <span>
                            <span className="block text-sm font-medium">{title}</span>
                            <span className="mt-1 block text-xs leading-5 text-[#827D72]">{description}</span>
                          </span>
                          <input type="checkbox" className="mt-1 size-4 accent-[#4A5D4E]" checked={notifications[key]} onChange={(e) => setNotifications((current) => ({ ...current, [key]: e.target.checked }))} />
                        </label>
                      ))}
                    </div>
                    <p className="mt-4 text-xs text-[#827D72]">These preferences are currently held in this page only and will reset when you reload. Persistent notification settings need a database table or settings store.</p>
                  </div>
                )}

                {active === "payments" && (
                  <div>
                    <h2 className="text-xl font-semibold">Payment methods</h2>
                    <p className="mt-2 text-sm leading-6 text-[#827D72]">Your bookings currently use the existing Chapa checkout flow. This page does not store card numbers or bank credentials.</p>
                    <div className="mt-6 flex items-start gap-4 rounded-xl border border-[#E8DCCB] bg-[#FDF6EC]/60 p-5">
                      <div className="rounded-xl bg-white p-3"><CreditCard size={22} /></div>
                      <div>
                        <h3 className="text-sm font-semibold">Chapa payments</h3>
                        <p className="mt-1 text-sm leading-6 text-[#827D72]">Choose your supported payment method during checkout. Saved payment methods are not yet implemented.</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
