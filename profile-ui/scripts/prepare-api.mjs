import { mkdir, readFile, writeFile } from "node:fs/promises";

const pdf = await readFile(new URL("../private/Sravana_Parimi.pdf", import.meta.url));
if (pdf.subarray(0, 5).toString() !== "%PDF-") throw new Error("The private resume must be a PDF.");
const directory = new URL("../server/private/", import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL("Sravana_Parimi.pdf", directory), pdf, { mode: 0o600 });
console.log("Private resume prepared for the API package, outside public hosting assets.");

if (process.argv.includes("--emulator")) {
  await writeFile(new URL("../server/.env.demo-portfolio", import.meta.url),
    "AUTH0_DOMAIN=portfolio-tests.auth0.com\nAUTH0_AUDIENCE=https://portfolio-tests.example/api\n",
    { mode: 0o600 });
}
