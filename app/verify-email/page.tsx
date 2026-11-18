"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleResend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Confirmation email sent. Please check your inbox.");
    }

    setLoading(false);
  }

  return (
    <main>
      <h1>Verify your email</h1>

      <p>
        Enter the email address you used to create your EthiopianBooking
        account.
      </p>

      <form onSubmit={handleResend}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Resend confirmation email"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </main>
  );
}
