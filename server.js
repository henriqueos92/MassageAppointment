const express = require('express');
const path = require('path');
const app = express();
//const port = 3002;
const fs = require('fs');
const dotenv = require('dotenv');

const isDev = fs.existsSync('.env.dev');

// Carrega o arquivo de ambiente correto
dotenv.config({ path: isDev ? '.env.dev' : '.env' });
const port = process.env.PORT || 3000; // usa a variável do .env, ou padrão 3000

let bookings = {
    current: {},
    next: {}
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/bookings', (req, res) => {
    res.json(bookings);
});

app.post('/bookings', (req, res) => {
    const { slot, name, day } = req.body;
    if (!bookings[day][slot]) {
        bookings[day][slot] = name;
        res.status(201).send('Booking created');
    } else {
        res.status(400).send('Slot already booked');
    }
});

app.post('/clearBookings', (req, res) => {
    bookings.current = {};
    bookings.next = {};
    res.status(200).send('Bookings cleared');
});

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Agendamento de Massagem</title>
            <link rel="stylesheet" href="style.css">
            <link rel="icon" href="gui/themes/img/favicon.ico" type="image/x-icon">
        </head>
        <body>
            <header>
                <h1>Agendamento de Massagem</h1>
                <div class="print-button-container">
                    <button class="print-button" onclick="printWaitlist()">Imprimir Lista</button>
                </div>
            </header>
            <div class="container main-content">
                <div class="tab-buttons">
                    <button class="tab-button" onclick="showTab('current')"><h5 id="current-date-button">Dia Corrente</h5></button>
                    <button class="tab-button" onclick="showTab('next')"><h5 id="next-date-button">Dia Corrente + 1</h5></button>
                </div>
                <div id="tab-current" class="tab-content active">
                    <h3 id="current-date">Dia Corrente</h3>
                    <div id="time-slots-current"></div>
                    <div id="waitlist-current">
                        <h3></h3>
                        <!-- Itens da lista de espera serão adicionados aqui pelo JavaScript -->
                    </div>
                </div>
                <div id="tab-next" class="tab-content">
                    <h3 id="next-date">Dia Corrente + 1</h3>
                    <div id="time-slots-next"></div>
                    <div id="waitlist-next">
                        <h3>Lista</h3>
                        <!-- Itens da lista de espera serão adicionados aqui pelo JavaScript -->
                    </div>
                </div>
            </div>
            <script>
                const clearPassword = "${process.env.CLEAR_PASSWORD}";
            </script>
            <script src="script.js"></script>
            <div class="rodape">
                <footer class="footer">
                    Desenvolvido pela equipe de Q.A
                </footer>
            </div>
        </body>
        </html>
    `);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

let currentDate = new Date().toISOString();
let nextDate = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString();

app.post('/updateDates', (req, res) => {
    const { currentDate: newCurrentDate, nextDate: newNextDate } = req.body;

    if (newCurrentDate && newNextDate) {
        currentDate = newCurrentDate;
        nextDate = newNextDate;
        res.status(200).send('Datas atualizadas com sucesso.');
    } else {
        res.status(400).send('Dados inválidos.');
    }
});

app.post('/validate-password', (req, res) => {
    const { password } = req.body;
    console.log('Recebido:', password, 'Esperado:', process.env.CLEAR_PASSWORD);
    if (password === process.env.CLEAR_PASSWORD) {
        res.json({ valid: true });
    } else {
        res.json({ valid: false });
    }
});

app.put('/updateBookingName', (req, res) => {
    const { day, slot, newName } = req.body;
    if (bookings[day] && bookings[day][slot]) {
        bookings[day][slot] = newName;
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.get('/getDates', (req, res) => {
    res.json({
        currentDate,
        nextDate
    });
});