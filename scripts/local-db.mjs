import EmbeddedPostgres from "embedded-postgres";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  appendFileSync,
  unlinkSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
const root = resolve(".local");
mkdirSync(root, { recursive: true });
const configFile = resolve(root, "database.json");
const config = existsSync(configFile)
  ? JSON.parse(readFileSync(configFile, "utf8"))
  : { password: randomBytes(24).toString("hex"), port: 55432 };
if (!existsSync(configFile))
  writeFileSync(configFile, JSON.stringify(config), { mode: 0o600 });
const env = existsSync(".env") ? readFileSync(".env", "utf8") : "";
if (!/^DATABASE_URL=/m.test(env))
  appendFileSync(
    ".env",
    '\nDATABASE_URL="postgresql://menuflow:' +
      config.password +
      "@localhost:" +
      config.port +
      '/menuflow"\nAPP_URL="http://localhost:3000"\n',
  );
if (!/^ENCRYPTION_KEY=/m.test(env))
  appendFileSync(
    ".env",
    'ENCRYPTION_KEY="' + randomBytes(32).toString("base64") + '"\n',
  );
const databaseDir = resolve(root, "postgres");
const pg = new EmbeddedPostgres({
  databaseDir,
  user: "menuflow",
  password: config.password,
  port: config.port,
  persistent: true,
  authMethod: "scram-sha-256",
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: console.log,
  onError: console.error,
});
let windowsCtl;
if (process.platform === "win32") {
  windowsCtl = (await import("@embedded-postgres/windows-x64")).pg_ctl;
  if (!existsSync(resolve(databaseDir, "PG_VERSION"))) {
    const passfile = resolve(root, "init-password");
    writeFileSync(passfile, config.password, { mode: 0o600 });
    try {
      execFileSync(
        windowsCtl,
        [
          "initdb",
          "-D",
          databaseDir,
          "-o",
          '--username=menuflow --auth=scram-sha-256 --encoding=UTF8 --locale=C --pwfile="' +
            passfile +
            '"',
        ],
        { windowsHide: true, stdio: "inherit" },
      );
    } finally {
      unlinkSync(passfile);
    }
  }
  try {
    execFileSync(windowsCtl, ["status", "-D", databaseDir], {
      windowsHide: true,
      stdio: "ignore",
    });
  } catch {
    execFileSync(
      windowsCtl,
      [
        "start",
        "-D",
        databaseDir,
        "-l",
        resolve(root, "postgres.log"),
        "-o",
        "-h 127.0.0.1 -p " + config.port,
        "-w",
      ],
      { windowsHide: true, stdio: "inherit" },
    );
  }
} else {
  if (!existsSync(resolve(databaseDir, "PG_VERSION"))) await pg.initialise();
  await pg.start();
}
const client = pg.getPgClient();
await client.connect();
const result = await client.query(
  "SELECT 1 FROM pg_database WHERE datname='menuflow'",
);
if (!result.rowCount) await client.query("CREATE DATABASE menuflow");
await client.end();
console.log(
  "PostgreSQL local ativo na porta " +
    config.port +
    ". Dados em .local/postgres. Ctrl+C para parar.",
);
const keepAlive = setInterval(() => {}, 30000);
async function stop() {
  clearInterval(keepAlive);
  if (windowsCtl)
    execFileSync(windowsCtl, ["stop", "-D", databaseDir, "-m", "fast"], {
      windowsHide: true,
    });
  else await pg.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
