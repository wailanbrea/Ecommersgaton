const {MongoMemoryServer} = require("mongodb-memory-server-core");
const fs = require("fs");
const path = require("path");
async function main() {
  const dataPath = path.resolve(process.env.MONGO_LOCAL_DATA || "data/mongo");
  fs.mkdirSync(dataPath, { recursive: true });
  const net = require("node:net");
  const portIsFree = await new Promise((resolve) => {
    const socket = net.createServer();
    socket.once("error", () => resolve(false));
    socket.listen(27017, "127.0.0.1", () => socket.close(() => resolve(true)));
  });
  if (!portIsFree) throw new Error("El puerto local 27017 ya está ocupado.");
  const server = await MongoMemoryServer.create({
    instance: { dbPath: dataPath, ip: "127.0.0.1", port: 27017, storageEngine: "wiredTiger" },
    binary: { version: "7.0.24", downloadDir: path.resolve("data/mongo-bin") }
  });
  console.log("MongoDB local listo:", server.getUri());
  console.log("Detén el proceso con Ctrl+C. Los datos persisten en", dataPath);
  await new Promise((resolve) => {
    process.once("SIGINT", resolve);
    process.once("SIGTERM", resolve);
  });
  await server.stop();
}
main().catch((error) => {
  console.error("No se pudo iniciar MongoDB local:", error.message);
  process.exitCode = 1;
});
