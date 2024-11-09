const socket = io();

let isBold = false;
let isItalic = false;
let currentColor = '#FFFFFF';

// Provera da li postoji 'boldBtn' i dodavanje event listenera
const boldBtn = document.getElementById('boldBtn');
if (boldBtn) {
    boldBtn.addEventListener('click', function() {
        isBold = !isBold;
        console.log(`Bold je promenjen: ${isBold}`);  // Log kada se promeni bold
        updateInputStyle();
    });
}

// Provera da li postoji 'italicBtn' i dodavanje event listenera
const italicBtn = document.getElementById('italicBtn');
if (italicBtn) {
    italicBtn.addEventListener('click', function() {
        isItalic = !isItalic;
        console.log(`Italic je promenjen: ${isItalic}`);  // Log kada se promeni italic
        updateInputStyle();
    });
}

// Provera da li postoji 'colorBtn' i dodavanje event listenera
const colorBtn = document.getElementById('colorBtn');
const colorPicker = document.getElementById('colorPicker');
if (colorBtn) {
    colorBtn.addEventListener('click', function() {
        console.log('Color picker je otvoren');
        if (colorPicker) {
            colorPicker.click();
        }
    });
}

// Kada korisnik izabere boju iz palete
if (colorPicker) {
    colorPicker.addEventListener('input', function() {
        currentColor = this.value;
        console.log(`Izabrana boja: ${currentColor}`);  // Log kada korisnik izabere boju
        updateInputStyle();

        // Emitovanje nove boje na server
        socket.emit('updateUserColor', { color: currentColor });
    });
}

// Primena stilova na polju za unos
function updateInputStyle() {
    let inputField = document.getElementById('chatInput');
    if (inputField) {
        inputField.style.fontWeight = isBold ? 'bold' : 'normal';
        inputField.style.fontStyle = isItalic ? 'italic' : 'normal';
        inputField.style.color = currentColor;
        console.log(`Stilovi primenjeni: bold=${isBold}, italic=${isItalic}, color=${currentColor}`);
    }
}

// Kada server pošalje poruku
socket.on('chatMessage', function(data) {
    console.log(`Primljena poruka: ${data.text} od ${data.nickname}`);  // Log kada server pošalje poruku
    let messageArea = document.getElementById('messageArea');
    if (messageArea) {
        let newMessage = document.createElement('div');
        newMessage.classList.add('message');
        newMessage.style.fontWeight = data.bold ? 'bold' : 'normal';
        newMessage.style.fontStyle = data.italic ? 'italic' : 'normal';
        newMessage.style.color = data.color;
        newMessage.innerHTML = `<strong>${data.nickname}:</strong> ${data.text} <span style="font-size: 0.8em; color: gray;">(${data.time})</span>`;
        messageArea.prepend(newMessage);
        messageArea.scrollTop = 0; // Automatsko skrolovanje
    }
});

// Kada nov gost dođe
socket.on('newGuest', function (nickname) {
    console.log(`Nov gost došao: ${nickname}`);  // Log kada nov gost dođe
    const guestList = document.getElementById('guestList');
    if (guestList) {
        const newGuest = document.createElement('div');
        newGuest.textContent = nickname;
        guestList.appendChild(newGuest); // Dodaj novog gosta ispod ADMIN-a
    }
});

// Ažuriranje liste gostiju
socket.on('updateGuestList', function (users) {
    console.log('Ažuriranje liste gostiju:', users);  // Log kada se lista gostiju ažurira
    const guestList = document.getElementById('guestList');
    if (guestList) {
        guestList.innerHTML = ''; // Očisti trenutnu listu
        
        // Dodaj ostale goste
        users.forEach(user => {
            const newGuest = document.createElement('div');
            newGuest.className = 'guest';
            newGuest.textContent = user.username; // Prikazujemo username
            newGuest.style.color = user.color; // Primena boje na ime gosta
            guestList.appendChild(newGuest);
        });
    }
});

// Funkcija za brisanje chata
function deleteChat() {
    const messageArea = document.getElementById('messageArea');
    messageArea.innerHTML = ''; // Očisti sve poruke
    console.log('Chat obrisan');  // Log kada se chat obriše
    alert('Chat je obrisan.'); // Obaveštenje korisniku
}

// Osluškivanje klika na dugme "D"
document.getElementById('openModal').onclick = function() {
    deleteChat(); // Pozivamo funkciju za brisanje chata
};
