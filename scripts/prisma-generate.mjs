// Generates the Prisma client for the platform being built.
//
// Vercel and local dev (Node) need the default client. Cloudflare Workers
// need runtime = "cloudflare", which imports a precompiled WebAssembly module
// (Workers forbid compiling WebAssembly at runtime). The Cloudflare client
// can't be used for Vercel: its WebAssembly loader makes Vercel's bundler pull
// all of node_modules into every function, far past Vercel's size limit.
//
// The Cloudflare client is generated when PRISMA_CLIENT_RUNTIME=cloudflare,
// or automatically in Cloudflare Workers Builds (which sets WORKERS_CI=1).
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";

const runtime =
  process.env.PRISMA_CLIENT_RUNTIME ||
  (process.env.WORKERS_CI ? "cloudflare" : "nodejs");

const generate = (extraArgs = []) =>
  execFileSync(
    "npx",
    ["prisma", "generate", "--config", "prisma7.config.ts", ...extraArgs],
    { stdio: "inherit" }
  );

if (runtime === "nodejs") {
  generate();
} else {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const generatorBlock = /generator client \{[^}]*\}/;
  if (!generatorBlock.test(schema)) {
    throw new Error("Could not find the `generator client` block in prisma/schema.prisma.");
  }
  // Same folder as the real schema so the relative `output` path still works.
  const runtimeSchemaPath = `prisma/.schema.${runtime}.prisma`;
  writeFileSync(
    runtimeSchemaPath,
    schema.replace(generatorBlock, (block) =>
      block.replace(/\}$/, `  runtime  = "${runtime}"\n}`)
    )
  );
  try {
    console.log(`Generating the Prisma client for the "${runtime}" runtime.`);
    generate(["--schema", runtimeSchemaPath]);
  } finally {
    rmSync(runtimeSchemaPath, { force: true });
  }
}
