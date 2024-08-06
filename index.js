const express = require('express')
const http = require('http');
const cors = require('cors');
const socketIo = require('socket.io');
const ffmpeg = require('fluent-ffmpeg');
const dotenv = require('dotenv');
const path = require('path')
const { default: mongoose } = require('mongoose');
const webrtc = require('wrtc');
const { PassThrough } = require('stream');
const app = express();
dotenv.config();
const server = http.createServer(app);
const io = socketIo(server);
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
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
let senderStream = null;

app.post('/api/v1/broadcast', async (req, res) => {
    try {
        const peer = new webrtc.RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302"
                }
            ]
        });

        peer.ontrack = (event) => {
            console.log(event);
            console.log('Broadcasting peer - ontrack event:', event.streams[0]);
            senderStream = event.streams[0];
            console.log(senderStream);
        }
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('New ICE candidate:', event.candidate);
                peer.addIceCandidate(event.candidate);
            }
        };

        const sessionDescription = new webrtc.RTCSessionDescription(req.body);
        await peer.setRemoteDescription(sessionDescription);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        const payload = {
            sdp: peer.localDescription
        }

        res.json(payload);
    } catch (err) {
        console.error('Error in /api/v1/broadcast:', err);
        res.status(500).json({ success: false, error: err.message, message: 'Server error' });
    }
});

app.post('/api/v1/consume', async (req, res) => {
    try {
        console.log('Consumer peer - attempting to connect');

        const peer = new webrtc.RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302"
                }
            ]
        });

        const sessionDescription = new webrtc.RTCSessionDescription(req.body);
        await peer.setRemoteDescription(sessionDescription);
        // Add tracks from senderStream to consumer peer
        if (!senderStream) {
            console.warn('senderStream is not available yet.');
            res.status(500).json({ success: false, error: 'senderStream not available', message: 'Server error' });
            return;
        }
        senderStream.getTracks().forEach(track => peer.addTrack(track, senderStream));
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('New ICE candidate:', event.candidate);
                peer.addIceCandidate(event.candidate);
            }
        };
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        // Ensure senderStream is available


        const payload = {
            sdp: peer.localDescription
        }

        res.json({ senderStream, payload });
    } catch (err) {
        console.error('Error in /api/v1/consume:', err);
        res.status(500).json({ success: false, error: err.message, message: 'Server error' });
    }
});

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

server.listen(process.env.PORT || 4000, () => {
    console.log('listening on *:4000');
})