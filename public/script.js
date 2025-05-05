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

let INITIAL_CURRENT_DATE = new Date();
let INITIAL_NEXT_DATE = new Date();
INITIAL_NEXT_DATE.setDate(INITIAL_CURRENT_DATE.getDate() + 1);

function setInitialDates() {
    document.getElementById('current-date-button').innerText = `${formatDate(INITIAL_CURRENT_DATE)}`;
    document.getElementById('next-date-button').innerText = `${formatDate(INITIAL_NEXT_DATE)}`;
    document.getElementById('current-date').innerText = `${formatDate(INITIAL_CURRENT_DATE)}`;
    document.getElementById('next-date').innerText = `${formatDate(INITIAL_NEXT_DATE)}`;
}

/*function setDates() {
    const currentDate = new Date();
    const nextDate = new Date();
    nextDate.setDate(currentDate.getDate() + 1);

    document.getElementById('current-date-button').innerText = `${formatDate(currentDate)}`;
    document.getElementById('next-date-button').innerText = `${formatDate(nextDate)}`;
    document.getElementById('current-date').innerText = `${formatDate(currentDate)}`;
    document.getElementById('next-date').innerText = `${formatDate(nextDate)}`;
}*/

async function bookSlot(slot, day) {
    let name = prompt('Digite seu nome:');
    if (name) {
        // Formata o nome: primeira letra maiúscula, restante minúscula
        name = name.trim().toLowerCase().split(' ').map(word => word.replace(/^\w/, c => c.toUpperCase())).join(' ');

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
    container.innerHTML = '<h3>Lista</h3>';

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

function startAutoRefresh(interval = 1000) {
    setInterval(() => {
        fetchBookings();
    }, interval);
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
    const currentDatePrint = INITIAL_CURRENT_DATE;
    const nextDatePrint = INITIAL_NEXT_DATE;
    nextDatePrint.setDate(currentDatePrint.getDate() + 1);

    printWindow.document.write('<html><head><title>Lista</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('table { width: 100%; border-collapse: collapse; }');
    printWindow.document.write('th, td { border: 1px solid black; padding: 8px; text-align: left; }');
    printWindow.document.write('th { width: 50%; }'); // Define a largura da coluna "Nome"
    printWindow.document.write('td:nth-child(1) { width: 50%; }'); // Define a largura da coluna "Nome" no corpo
    printWindow.document.write('td:nth-child(2) { width: 50%; }'); // Define a largura da coluna "Assinatura" no corpo
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');

    printWindow.document.write(`<h2>Lista - ${formatDate(currentDatePrint)}</h2>`);
    printWindow.document.write('<table><thead><tr><th>Nome</th><th>Assinatura</th></tr></thead><tbody>');
    printWindow.document.write(currentWaitlist.replace(/<div class="waitlist-item">/g, '<tr><td>').replace(/<\/div>/g, '</td><td></td></tr>'));
    printWindow.document.write('</tbody></table>');

    printWindow.document.write(`<h2>Lista - ${formatDate(nextDatePrint)}</h2>`);
    printWindow.document.write('<table><thead><tr><th>Nome</th><th>Assinatura</th></tr></thead><tbody>');
    printWindow.document.write(nextWaitlist.replace(/<div class="waitlist-item">/g, '<tr><td>').replace(/<\/div>/g, '</td><td></td></tr>'));
    printWindow.document.write('</tbody></table>');

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

async function clearAll() {
    const response = await fetch('/clearBookings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (response.ok) {
        bookedSlots.current = {};
        bookedSlots.next = {};
        
        // Permite que o usuário defina as novas datas
        const currentDateInput = prompt('Digite a data do Dia Corrente (formato: MM-DD-YYYY):');
        const nextDateInput = prompt('Digite a data do Dia Seguinte (formato: MM-DD-YYYY):');

        if (currentDateInput && nextDateInput) {
            INITIAL_CURRENT_DATE = new Date(currentDateInput);
            INITIAL_NEXT_DATE = new Date(nextDateInput);

            // Salva as datas no localStorage
            localStorage.setItem('INITIAL_CURRENT_DATE', INITIAL_CURRENT_DATE.toISOString());
            localStorage.setItem('INITIAL_NEXT_DATE', INITIAL_NEXT_DATE.toISOString());

            // Atualiza os elementos da interface com as novas datas
            setInitialDates();
        }

        renderTimeSlots('current');
        renderTimeSlots('next');
        
        updateWaitlist('current');
        updateWaitlist('next');

        // Atualiza as datas para o dia corrente e o próximo dia ao limpar os horários
        //setDates();
        
        alert('Horários e listas foram limpos.');
    } else {
        alert('Erro ao limpar os horários e a listas.');
    }
}

function openPasswordModal() {
    const modal = document.getElementById('passwordModal');
    const closeBtn = document.getElementsByClassName('close')[0];
    const submitBtn = document.getElementById('passwordSubmit');
    const passwordInput = document.getElementById('passwordInput');

    modal.style.display = 'block';
    passwordInput.focus();

    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }

    submitBtn.onclick = function() {
        const password = passwordInput.value;
        
        if (password === "aZship@2025") {
            clearAll();
            modal.style.display = 'none';
        } else {
            alert('Senha incorreta.');
        }
    }

    passwordInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            submitBtn.onclick();
        }
    });
}

/*document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        const password = prompt('Digite a senha:');
        if (password === clearPassword) {
            clearAll();
        } else {
            alert('Senha incorreta.');
        }
    }
});*/

document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        openPasswordModal();
    }
});

function checkForUpcomingMassages() {
    const now = new Date();
    const currentDateString = INITIAL_CURRENT_DATE.toDateString();
    const nextDateString = INITIAL_NEXT_DATE.toDateString();
    const nowDateString = now.toDateString();

    console.log(`Verificando horários: ${now.getHours()}:${now.getMinutes()}`);

    const checkSlots = (slots, date, dateString) => {
        if (nowDateString === dateString) {
            Object.keys(slots).forEach(slot => {
                const [hour, minute] = slot.split(':').map(Number);

                // Verifica se o horário atual é 2 minutos antes do horário reservado
                const slotTime = new Date();
                slotTime.setHours(hour, minute, 0, 0); // Define o horário do slot
                const timeDifference = (slotTime - now) / (1000 * 60); // Diferença em minutos

                if (timeDifference > 0 && timeDifference <= 2) {
                    const name = slots[slot];
                    alert(`Sua massagem está próxima, ${name}!\nHorário: ${slot} (Dia: ${formatDate(new Date(date))})`);
                }
            });
        }
    };

    // Verifica os horários para o dia atual e o próximo dia
    checkSlots(bookedSlots.current, INITIAL_CURRENT_DATE, currentDateString);
    checkSlots(bookedSlots.next, INITIAL_NEXT_DATE, nextDateString);
}

function startNotificationChecker() {
    setInterval(() => {
        checkForUpcomingMassages();
    }, 60000);
}

document.addEventListener('DOMContentLoaded', () => {
    // Carrega as datas do localStorage, se disponíveis
    const savedCurrentDate = localStorage.getItem('INITIAL_CURRENT_DATE');
    const savedNextDate = localStorage.getItem('INITIAL_NEXT_DATE');

    if (savedCurrentDate && savedNextDate) {
        INITIAL_CURRENT_DATE = new Date(savedCurrentDate);
        INITIAL_NEXT_DATE = new Date(savedNextDate);
    } else {
        INITIAL_CURRENT_DATE = new Date();
        INITIAL_NEXT_DATE = new Date();
        INITIAL_NEXT_DATE.setDate(INITIAL_CURRENT_DATE.getDate() + 1);
    }
    setInitialDates();
    showTab('current'); // Mostra a aba do dia corrente por padrão
    fetchBookings();
    startAutoRefresh();
    startNotificationChecker();
});