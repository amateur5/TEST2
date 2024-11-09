require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { connectDB, User } = require('./mongo');
const bcrypt = require('bcrypt');
const banModule = require("./banModule");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Poveži se sa bazom podataka
connectDB();

let guests = {}; // Objekat sa gostima i njihovim ID-ovima
let assignedNumbers = new Set(); // Skup brojeva koji su već dodeljeni
let connectedIps = []; // Ovdje čuvamo sve povezane IP adrese

app.use(express.json());
app.use(express.static(__dirname + '/public'));

// Funkcija za registraciju korisnika
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });

    try {
        await user.save();
        res.status(201).send('User registered');
    } catch (err) {
        console.error('Greška prilikom registracije:', err);
        res.status(400).send('Error registering user');
    }
});

// Funkcija za logovanje korisnika
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    try {
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            const role = user.role;
            const socketId = req.headers['x-socket-id']; // Uzimamo socket ID iz header-a

            // Emitovanje događaja korisniku sa socket ID
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                socket.emit('userLoggedIn', { username, role });
            }

            res.send(role === 'admin' ? 'Logged in as admin' : 'Logged in as guest');
        } else {
            res.status(400).send('Invalid credentials');
        }
    } catch (err) {
        console.error('Greška prilikom logovanja:', err);
        res.status(500).send('Server error');
    }
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Generiši broj u opsegu 1111-9999 koji još nije dodeljen
function generateUniqueNumber() {
    let number;
    do {
        number = Math.floor(Math.random() * 8889) + 1111;
    } while (assignedNumbers.has(number));
    assignedNumbers.add(number);
    return number;
}

// Endpoint za slanje liste IP adresa
app.get('/ip-list', (req, res) => {
    res.json(connectedIps);
});

// Upravljanje događajima prilikom konekcije gostiju
io.on('connection', (socket) => {
    console.log('Novi gost je povezan sa socket ID:', socket.id);

    const guestId = socket.id;
    const ip = socket.request.connection.remoteAddress;
    console.log(`Gost sa IP adresom ${ip} se povezao.`);

    // Dodaj IP adresu u spisak povezanih
    if (!connectedIps.includes(ip)) {
        connectedIps.push(ip);
    }

    const uniqueNumber = generateUniqueNumber();
    const nickname = `Gost-${uniqueNumber}`;

    guests[guestId] = { nickname, color: '#FFFFFF', role: 'guest' }; // Početna boja i role za gosta
    console.log(`${nickname} se povezao.`);

    // Provera da li je gost banovan
    if (banModule.isGuestBanned(guestId)) {
        socket.disconnect();
        return;
    }

    socket.broadcast.emit('newGuest', nickname);
    io.emit('updateGuestList', Object.values(guests));

    // Prijavljivanje gosta
    socket.on('userLoggedIn', (data) => {
        guests[guestId].nickname = data.username;
        guests[guestId].role = data.role;  // Dodeljujemo ulogu korisniku
        io.emit('updateGuestList', Object.values(guests));
    });

    // Prijem poruka u četu
    socket.on('chatMessage', (msgData) => {
        const time = new Date().toLocaleTimeString();
        const messageToSend = {
            text: msgData.text,
            bold: msgData.bold,
            italic: msgData.italic,
            color: msgData.color,
            nickname: guests[guestId].nickname,
            time: time
        };
        io.emit('chatMessage', messageToSend);
    });

    // Funkcija za ažuriranje boje korisnika
    socket.on('updateUserColor', (data) => {
        guests[guestId].color = data.color;
        io.emit('updateGuestList', Object.values(guests));
    });

    // Banovanje gosta samo od strane admina
    socket.on("toggleBanUser", (targetGuestId) => {
        if (guests[guestId].role === 'admin') { // Provera da li je admin
            banModule.isGuestBanned(targetGuestId) ? 
                banModule.unbanGuest(targetGuestId) : 
                banModule.banGuest(targetGuestId);
            io.sockets.sockets.get(targetGuestId)?.disconnect();
            io.emit('updateGuestList', Object.values(guests));
        }
    });

    // Odlazak gosta sa četa
    socket.on('disconnect', () => {
        console.log(`${guests[guestId].nickname} se odjavio.`);
        assignedNumbers.delete(parseInt(guests[guestId].nickname.split('-')[1], 10));
        delete guests[guestId];

        // Uklanjanje IP adrese gosta iz spiska
        connectedIps = connectedIps.filter((userIp) => userIp !== ip);

        io.emit('updateGuestList', Object.values(guests));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server je pokrenut na portu ${PORT}`);
});
