import * as express from 'express';
import * as livereload from 'livereload';
import * as connectLiveReload from 'connect-livereload';

const app  = express();
const port = 8385;

const liveReloadServer = livereload.createServer();
liveReloadServer.server.once('connection', () => {
    setTimeout(() => {
        liveReloadServer.refresh('/');
    }, 100);
});

app.use(connectLiveReload());
app.use(express.static(__dirname))

app.get('/', (req: express.Request, res: express.Response) =>
    res.sendFile(__dirname + '/index.html')
);

app.listen(port, () => {
    const now = new Date();
    console.log(
        'Server is running on http://localhost:' + port, " - ",
        now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds()
    )
})