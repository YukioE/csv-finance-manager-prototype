import * as express from "express";
import * as livereload from "livereload";
import * as connectLiveReload from "connect-livereload";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const app = express();
const port = 8385;
let filePath = "";

const liveReloadServer = livereload.createServer();
liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
        liveReloadServer.refresh("/");
    }, 100);
});

app.use(connectLiveReload());
app.use(express.json());
app.use(express.static(__dirname));

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

app.post("/api", (req: express.Request, res: express.Response) => {
    if (!req.body || req.body === "" || req.body === null) {
        return res.status(400).send("no path received");
    }

    const method = JSON.parse(JSON.stringify(req.body)).method;
    const transaction = JSON.parse(JSON.stringify(req.body)).transaction;

    console.log("filePath: ", filePath);
    console.log("method: ", method);
    console.log("transaction: ", transaction);

    if (method === "add") {
        fs.appendFile(
            filePath,
            `\n${transaction.date},${transaction.description},${transaction.category},${transaction.amount}`,
            (err) => {
                if (err) {
                    return res.status(500).send(err);
                }
                res.send(JSON.stringify(req.body) + " received");
            }
        );
    } else {
        res.send(JSON.stringify(req.body) + " received");
    }
});

app.post("/path", (req: express.Request, res: express.Response) => {
    if (!req.body || req.body === "" || req.body === null) {
        return res.status(400).send("no path received");
    }

    filePath = JSON.parse(JSON.stringify(req.body)).path;
    filePath = path.resolve(os.homedir(), filePath);

    res.send(JSON.stringify(req.body) + " received");
});
