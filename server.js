const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});