const timeSlots = [
    '13:00', '13:15', '13:30', '13:45', '14:00', '14:15', '14:30', '14:45',
    '15:00', '15:15', '15:30', '15:45', '16:00', '16:15', '16:30', '16:45',
    '17:00', '17:15'
];

const bookedSlots = {
    current: {},
    next: {}
};

function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('pt-BR', options);
}

function setDates() {
    const currentDate = new Date();
    const nextDate = new Date();
    nextDate.setDate(currentDate.getDate() + 1);

    document.getElementById('current-date-button').innerText = `${formatDate(currentDate)}`;
    document.getElementById('next-date-button').innerText = `${formatDate(nextDate)}`;
    document.getElementById('current-date').innerText = `${formatDate(currentDate)}`;
    document.getElementById('next-date').innerText = `${formatDate(nextDate)}`;
}

async function bookSlot(slot, day) {
    const name = prompt('Digite seu nome:');
    if (name) {
        const response = await fetch('/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ slot, name, day })
        });
        if (response.ok) {
            bookedSlots[day][slot] = name;
            renderTimeSlots(day);
            updateWaitlist(day);
        } else {
            alert('Horário já reservado');
        }
    }
}

async function fetchBookings() {
    const response = await fetch('/bookings');
    const data = await response.json();
    bookedSlots.current = data.current || {};
    bookedSlots.next = data.next || {};
    renderTimeSlots('current');
    renderTimeSlots('next');
    updateWaitlist('current');
    updateWaitlist('next');
}

function renderTimeSlots(day) {
    const container = document.getElementById(`time-slots-${day}`);
    container.innerHTML = '';
    timeSlots.forEach(slot => {
        const button = document.createElement('button');
        button.innerText = slot;
        button.disabled = bookedSlots[day][slot];
        button.onclick = () => bookSlot(slot, day);
        container.appendChild(button);
    });
}

function updateWaitlist(day) {
    const container = document.getElementById(`waitlist-${day}`);
    container.innerHTML = '<h2>Lista</h2>';

    // Ordena os horários
    const sortedSlots = Object.keys(bookedSlots[day])
        .sort((a, b) => {
            const [hourA, minuteA] = a.split(':').map(Number);
            const [hourB, minuteB] = b.split(':').map(Number);
            return hourA - hourB || minuteA - minuteB;
        });

    // Adiciona os itens ordenados à lista de espera
    sortedSlots.forEach(slot => {
        const div = document.createElement('div');
        div.className = 'waitlist-item';
        div.innerHTML = `<input type="checkbox" checked disabled> ${slot} - ${bookedSlots[day][slot]}`;
        container.appendChild(div);
    });
}

function showTab(day) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.getElementById(`tab-${day}`).classList.add('active');
    document.querySelector(`.tab-button[onclick="showTab('${day}')"]`).classList.add('active');
}

function printWaitlist() {
    const currentWaitlist = document.getElementById('waitlist-current').innerHTML;
    const nextWaitlist = document.getElementById('waitlist-next').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    const currentDatePrint = new Date();
    const nextDatePrint = new Date();
    nextDatePrint.setDate(currentDatePrint.getDate() + 1);
    printWindow.document.write('<html><head><title>Lista</title>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(`<h1>Lista - ${formatDate(currentDatePrint)}</h1>`);
    printWindow.document.write(currentWaitlist);
    printWindow.document.write(`<h1>Lista - ${formatDate(nextDatePrint)}</h1>`);
    printWindow.document.write(nextWaitlist);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

document.addEventListener('DOMContentLoaded', () => {
    setDates();
    showTab('current'); // Mostra a aba do dia corrente por padrão
    fetchBookings();
});