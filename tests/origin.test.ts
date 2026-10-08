import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, sameOrigin } from "../lib/api";

test("origin validation accepts exact deployment domains and rejects untrusted origins", () => {
  const keys = ["APP_URL", "VERCEL", "VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL", "NODE_ENV"];
  const previous = keys.map((key) => process.env[key]);
  const request = (origin?: string) => new Request("https://pede360.vercel.app/api/auth/login", {
    headers: origin ? { origin, "x-forwarded-host": "evil.example" } : {},
  });
  const rejects = (origin?: string) => assert.throws(() => sameOrigin(request(origin)),
    (error: unknown) => error instanceof ApiError && error.status === 403);
  try {
    for (const key of keys) delete process.env[key];
    sameOrigin(request("http://localhost:3000"));
    rejects("http://localhost:3001");
    process.env.NODE_ENV = "production";
    rejects("http://localhost:3000");
    process.env.APP_URL = "https://menu.example/path";
    sameOrigin(request("https://menu.example"));
    rejects("https://pede360.vercel.app");
    process.env.APP_URL = "http://localhost:3000";
    process.env.VERCEL = "1";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "pede360.vercel.app";
    process.env.VERCEL_URL = "pede360-deploy.vercel.app";
    process.env.VERCEL_BRANCH_URL = "pede360-git-main.vercel.app";
    for (const origin of ["https://pede360.vercel.app", "https://pede360-deploy.vercel.app", "https://pede360-git-main.vercel.app"])
      sameOrigin(request(origin));
    for (const origin of [undefined, "null", "https://evil.example", "https://other.vercel.app", "https://pede360.vercel.app.evil.example", "http://pede360.vercel.app", "https://pede360.vercel.app:444"])
      rejects(origin);
    delete process.env.APP_URL;
    sameOrigin(request("https://pede360.vercel.app"));
    rejects("http://localhost:3000");
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
});
