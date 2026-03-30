const http = require("http");
const { Server } = require("socket.io");
const { app } = require("./app");
const { setIO } = require("./lib/socket");

const PORT = Number(process.env.PORT) || 3001;

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

setIO(io);

io.on("connection", (socket) => {
  // eslint-disable-next-line no-console
  console.log(`socket connected: ${socket.id}`);
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`DISIS dispatch service running on port ${PORT}`);
});
