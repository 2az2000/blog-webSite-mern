// One-shot bootstrap for the integration-test binary (cached in
// node_modules/.cache/mongodb-binaries afterwards).
import { MongoMemoryServer } from "mongodb-memory-server";

const m = await MongoMemoryServer.create();
console.log("mongod ready at", m.getUri());
await m.stop();
console.log("download complete");
