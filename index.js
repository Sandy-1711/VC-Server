const express = require('express')
const http = require('http');
const cors = require('cors');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const { default: mongoose } = require('mongoose');
const app = express();
dotenv.config();
const server = http.createServer(app);
const io = socketIo(server);

mongoose.connect(process.env.DATABASE_URL).then(() => {
    console.log('MongoDB connected');
}).catch((err) => {
    console.log(err);
});

app.use(cors({
    origin: '*',
}));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
})
app.use('/api/v1/user', require('./routes/userRoutes'));

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    socket.on('offer', (data) => {
        console.log('offer');
        socket.broadcast.emit('offer', data);
    });

    socket.on('answer', (data) => {
        console.log('answer');

        socket.broadcast.emit('answer', data);
    });

    socket.on('candidate', (data) => {
        console.log('candidate');
        socket.broadcast.emit('candidate', data);
    });
});

server.listen(4000, () => {
    console.log('listening on *:4000');
})