const express = require('express');
const path = require('path');
const app = express();
//const port = 3002;
const fs = require('fs');
const dotenv = require('dotenv');
const isDev = fs.existsSync('.env.dev');
const HISTORY_FILE = path.join(__dirname, 'history.json');
//let currentDate = new Date().toISOString();
//let nextDate = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString();

function getFixedDates() {
    try {
        return readDates(); // { current: "2025-09-09T..." , next: "2025-09-10T..." }
    } catch (e) {
        // fallback caso não exista ainda
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        return {
            current: today.toISOString(),
            next: tomorrow.toISOString()
        };
    }
}

// funções de leitura/escrita em memória
function readDates() {
    return { current: currentDate, next: nextDate };
}

function writeDates(dates) {
    if (dates.current) currentDate = dates.current;
    if (dates.next) nextDate = dates.next;
}

function readHistory() {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    return JSON.parse(fs.readFileSync(HISTORY_FILE));
}

function writeHistory(history) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function addToHistory(name, date, slot) {
    const history = readHistory();

    const exists = history.some(
        entry => entry.name === name && entry.date === date && entry.slot === slot
    );

    if (!exists) {
        history.push({ name, date, slot });
        writeHistory(history);
    }
}

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

/*app.post('/bookings', (req, res) => {
    const { slot, name, day } = req.body;
    if (!bookings[day][slot]) {
        bookings[day][slot] = name;
        addToHistory(name, day, slot);
        res.status(201).send('Booking created');
    } else {
        res.status(400).send('Slot already booked');
    }
});*/

app.post('/bookings', (req, res) => {
    const { slot, name, day } = req.body;

    // Converta "current"/"next" para a data real
    let realDate;
    if (day === 'current') {
        realDate = currentDate.slice(0, 10); // Exemplo: "2025-08-07"
    } else if (day === 'next') {
        realDate = nextDate.slice(0, 10);
    } else {
        realDate = day; // já é uma data real
    }

    if (!bookings[day][slot]) {
        bookings[day][slot] = name;
        addToHistory(name, realDate, slot); // Agora salva a data real!
        res.status(201).send('Booking created');
    } else {
        res.status(400).send('Slot already booked');
    }
});

app.get('/allNames', (req, res) => {
    const history = readHistory();
    const names = [...new Set(history.map(item => item.name))];
    res.json(names);
});

app.get('/history/:name', (req, res) => {
    const history = readHistory();
    const name = decodeURIComponent(req.params.name);
    const personHistory = history.filter(item => item.name === name);
    res.json(personHistory);
});

app.get('/historyAll', (req, res) => {
    const history = readHistory();
    res.json(history);
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

app.post("/saveFixedDates", (req, res) => {
    const { currentDate: newCurrent, nextDate: newNext } = req.body;
    writeDates({ current: newCurrent, next: newNext });
    res.json({ success: true, dates: readDates() });
});

/*app.put('/updateBookingName', (req, res) => {
    const { day, slot, newName } = req.body;

    // Atualiza o agendamento em memória (bookings) usando a chave day recebida (ex: "current" ou "next")
    if (bookings[day] && bookings[day][slot]) {
        bookings[day][slot] = newName;

        // Converter day para data real para usar no histórico
        let realDate = day;
        if (day === 'current') {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            realDate = `${yyyy}-${mm}-${dd}`;
        } else if (day === 'next') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const yyyy = tomorrow.getFullYear();
            const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const dd = String(tomorrow.getDate()).padStart(2, '0');
            realDate = `${yyyy}-${mm}-${dd}`;
        }

        const history = readHistory();
        const record = history.find(item => item.date === realDate && item.slot === slot);

        if (record) {
            record.name = newName;
            writeHistory(history);
        } else {
            console.log('⚠️ Registro não encontrado no histórico para atualizar');
        }

        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Agendamento não encontrado' });
    }
});*/

app.put('/updateBookingName', (req, res) => {
    const { day, slot, newName } = req.body;

    if (bookings[day] && bookings[day][slot]) {
        bookings[day][slot] = newName;

        // 🔹 Pega as datas salvas (não recalcula na hora)
        const { current, next } = getFixedDates();
        let realDate = day;
        if (day === 'current') {
            realDate = current.slice(0, 10);
        } else if (day === 'next') {
            realDate = next.slice(0, 10);
        }

        const history = readHistory();
        const record = history.find(item => item.date === realDate && item.slot === slot);

        if (record) {
            record.name = newName;
            writeHistory(history);
            console.log(`✅ Histórico atualizado: ${slot} em ${realDate} -> ${newName}`);
        } else {
            console.log('⚠️ Registro não encontrado no histórico para atualizar');
        }

        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Agendamento não encontrado' });
    }
});


/*app.put('/updateBookingName', (req, res) => {
    const { day, slot, newName } = req.body;

    // Atualiza o agendamento em memória (bookings)
    if (bookings[day] && bookings[day][slot]) {
        bookings[day][slot] = newName;

        // Pega datas fixas em memória
        const dates = readDates();
        let dateReal = day === 'current' ? dates.current : dates.next;

        // Atualiza histórico
        const history = readHistory();
        const record = history.find(item => item.date === dateReal && item.slot === slot);

        if (record) {
            record.name = newName;
            writeHistory(history);
        } else {
            console.log('⚠️ Registro não encontrado no histórico para atualizar');
        }

        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Agendamento não encontrado' });
    }
});*/


app.get('/getDates', (req, res) => {
    res.json({
        currentDate,
        nextDate
    });
});