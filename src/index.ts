import * as express from "express";
import * as livereload from "livereload";
import * as connectLiveReload from "connect-livereload";
import * as multer from "multer";
import * as fs from "fs";

const app = express();
const port = 8385;
const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});
const upload = multer({ storage: diskStorage });

const liveReloadServer = livereload.createServer();
liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
        liveReloadServer.refresh("/");
    }, 100);
});

app.use(connectLiveReload());
app.use(express.static(__dirname));

app.get("/", (req: express.Request, res: express.Response) =>
    res.sendFile(__dirname + "/index.html")
);

function removeUploads() {
    fs.rm("uploads", { recursive: true, force: true }, (err) => {
        if (err) {
            console.error(err);
            return;
        }
        fs.mkdir("uploads", (err) => {
            if (err) {
                console.error(err);
            }
        });
    });
}

app.listen(port, () => {
    const now = new Date();
    removeUploads();
    console.log(
        "Server is running on localhost:" + port,
        " - ",
        now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds()
    );
});

app.post("/api", upload.single("file"), (req: express.Request, res: express.Response) => {
    if (!req.file) {
        return res.status(400).send("no file received");
    }

    res.send(req.body.filename + " received");
});
