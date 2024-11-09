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

// Definisanje modela za korisnike sa novim poljima za goste
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['admin', 'guest_number', 'guest_nickname'],  
        default: function() {
            return this.username === 'Radio Galaksija' ? 'admin' : 'guest_number';
        }
    },
    guestNumber: { type: String, unique: true, sparse: true },  // Jedinstveni broj za goste sa brojem
    nickname: { type: String, unique: true, sparse: true },  // Jedinstveni nadimak za goste sa nikom
}, { timestamps: true });

// Kreiramo model za korisnike
const User = mongoose.model('User', userSchema);

// Exportujemo konekciju i model korisnika
module.exports = { connectDB, User };
