import express from "express";
import livereload from "livereload";
import connectLiveReload from "connect-livereload";
import routes from "./routes.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 8385;

const liveReloadServer = livereload.createServer();
liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
        liveReloadServer.refresh("/");
    }, 100);
});

app.use(connectLiveReload());
app.use(express.json());
app.use(express.static(__dirname));

app.use(routes);

app.get("/", (req: express.Request, res: express.Response) =>
    res.sendFile(__dirname + "/index.html")
);

app.listen(port, () => {
    const now = new Date();
    console.log(
        "Server is running on localhost:" + port,
        " - ",
        now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds()
    );
});
