import { buildApp } from "./app.js";
import { startRounds } from "./rounds.js";

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "0.0.0.0";

const app = await buildApp();
await app.listen({ port, host });
/* the caretaker's clock lives with the server; OSYLE_ROUNDS=off stops it */
startRounds();
console.log(`osyle api listening on ${host}:${port}`);
