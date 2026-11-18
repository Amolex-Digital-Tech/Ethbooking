import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const secretKey = process.env.CHAPA_SECRET_KEY;

if (!secretKey) {
  throw new Error("CHAPA_SECRET_KEY was not found in your environment.");
}

const references = [
  "EB-MW4P3JMG-651B8B8D",
  "EB-MW4NCD7S-EC22A502",
  "EB-MW3NCCYW-76A7E8F8",
  "EB-MUXWAXPQ-D6A6B425",
];

for (const txRef of references) {
  console.log(`\nChecking ${txRef}...`);

  try {
    const response = await fetch(
      `https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(txRef)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        cache: "no-store",
      }
    );

    const result = await response.json();
    const data = result?.data ?? {};

    console.log({
      httpStatus: response.status,
      tx_ref: data.tx_ref,
      status: data.status,
      amount: data.amount,
      currency: data.currency,
      charge: data.charge,
      mode: data.mode,
      reference: data.reference,
      availableFields: Object.keys(data),
    });
  } catch (error) {
    console.error("Verification request failed:", error.message);
  }
}
