require('dotenv').config();
const mongoose = require('mongoose');

// Konekcija sa MongoDB bazom koristeći .env fajl za URI
const uri = process.env.MONGODB_URI;
console.log("MongoDB URI:", uri); // Privremeno dodajemo log za proveru URI-ja

const connectDB = async () => {
    try {
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Povezan sa bazom podataka!");
    } catch (error) {
        console.error("Greška prilikom povezivanja sa bazom:", error.message);
        process.exit(1); // Prekida aplikaciju ako ne može da se poveže
    }
};

// Generisanje broja za goste
const generateGuestNumber = () => {
    // Na primer, generišemo nasumičan broj između 1000 i 9999
    return Math.floor(Math.random() * 9000) + 1000;
};

// Definisanje modela za korisnike sa novim poljima za goste
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['admin', 'guest_number', 'guest_nickname'],  
        default: 'guest_number' // Podrazumevano je da su gosti sa brojem
    },
    guestNumber: { 
        type: String, 
        unique: true, 
        sparse: true, 
        default: generateGuestNumber // Automatski generiše broj kada je korisnik guest_number
    },
    nickname: { type: String, unique: true, sparse: true }, // Nadimak za goste sa nikom
}, { timestamps: true });

// Kreiramo model za korisnike
const User = mongoose.model('User', userSchema);

// Exportujemo konekciju i model korisnika
module.exports = { connectDB, User };
