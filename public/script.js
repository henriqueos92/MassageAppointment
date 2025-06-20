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
};

let INITIAL_CURRENT_DATE = new Date();
let INITIAL_NEXT_DATE = new Date();
INITIAL_NEXT_DATE.setDate(INITIAL_CURRENT_DATE.getDate() + 1);

function setInitialDates() {
    document.getElementById('current-date-button').innerText = `${formatDate(INITIAL_CURRENT_DATE)}`;
    document.getElementById('next-date-button').innerText = `${formatDate(INITIAL_NEXT_DATE)}`;
    document.getElementById('current-date').innerText = `${formatDate(INITIAL_CURRENT_DATE)}`;
    document.getElementById('next-date').innerText = `${formatDate(INITIAL_NEXT_DATE)}`;
};

/*function setDates() {
    const currentDate = new Date();
    const nextDate = new Date();
    nextDate.setDate(currentDate.getDate() + 1);

    document.getElementById('current-date-button').innerText = `${formatDate(currentDate)}`;
    document.getElementById('next-date-button').innerText = `${formatDate(nextDate)}`;
    document.getElementById('current-date').innerText = `${formatDate(currentDate)}`;
    document.getElementById('next-date').innerText = `${formatDate(nextDate)}`;
}*/

/*async function bookSlot(slot, day) {
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
}*/

async function bookSlot(slot, day) {
    // Exibe o modal
    const modal = document.getElementById('nameModal');
    const closeModal = document.getElementById('closeModal');
    const submitName = document.getElementById('submitName');
    const nameInput = document.getElementById('pnameInput');
    const selectedTime = document.getElementById('selectedTime');

    // Limpa o campo de entrada antes de abrir o modal
    nameInput.value = '';
    selectedTime.innerText = `Você selecionou: ${slot}`;

    modal.style.display = 'flex';

    // Fecha o modal ao clicar no "X"
    closeModal.onclick = () => {
        modal.style.display = 'none';
    };

    // Fecha o modal ao clicar fora dele
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // Aguarda o clique no botão "Confirmar"
    submitName.onclick = async () => {
        const name = nameInput.value.trim();

        if (name) {
            // Fecha o modal
            modal.style.display = 'none';

            // Formata o nome: primeira letra maiúscula, restante minúscula
            const formattedName = name
                .toLowerCase()
                .split(' ')
                .map((word) => word.replace(/^\w/, (c) => c.toUpperCase()))
                .join(' ');

            // Envia a reserva para o servidor
            const response = await fetch('/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ slot, name: formattedName, day }),
            });

            if (response.ok) {
                bookedSlots[day][slot] = formattedName;
                renderTimeSlots(day);
                updateWaitlist(day);
            } else {
                //alert('Horário já reservado');
                showAlert('Horário já reservado');
            }
        } else {
            //alert('Por favor, insira seu nome.');
            showAlert('Por favor, insira seu nome.');
        }
    };
};

async function fetchBookings() {
    const response = await fetch('/bookings');
    const data = await response.json();
    bookedSlots.current = data.current || {};
    bookedSlots.next = data.next || {};
    renderTimeSlots('current');
    renderTimeSlots('next');
    updateWaitlist('current');
    updateWaitlist('next');
};

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
};

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
};

function startAutoRefresh(interval = 1000) {
    setInterval(() => {
        fetchBookings();
    }, interval);
};

function showTab(day) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.getElementById(`tab-${day}`).classList.add('active');
    document.querySelector(`.tab-button[onclick="showTab('${day}')"]`).classList.add('active');
};

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
};

function showAlert(message) {
    const alertModal = document.getElementById('alertModal');
    const alertMessage = document.getElementById('alertMessage');
    const closeAlertModal = document.getElementById('closeAlertModal');
    const alertOkButton = document.getElementById('alertOkButton');

    // Define a mensagem no modal
    alertMessage.innerText = message;

    // Exibe o modal
    alertModal.style.display = 'flex';

    // Fecha o modal ao clicar no botão "OK" ou no "X"
    const closeModal = () => {
        alertModal.style.display = 'none';
    };

    closeAlertModal.onclick = closeModal;
    alertOkButton.onclick = closeModal;

    // Fecha o modal ao clicar fora dele
    window.onclick = (event) => {
        if (event.target === alertModal) {
            closeModal();
        }
    };
};

/*async function clearAll() {
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
        const currentDateInput = prompt('Digite a nova data do Dia Corrente (formato: MM-DD-YYYY):');
        const nextDateInput = prompt('Digite a nova data do Dia Seguinte (formato: MM-DD-YYYY):');

        if (currentDateInput && nextDateInput) {
            const updatedCurrentDate = new Date(currentDateInput);
            const updatedNextDate = new Date(nextDateInput);

            // Envia as datas para o servidor
            fetch('/updateDates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentDate: updatedCurrentDate.toISOString(),
                    nextDate: updatedNextDate.toISOString()
                })
            }).then(response => {
                if (response.ok) {
                    INITIAL_CURRENT_DATE = updatedCurrentDate;
                    INITIAL_NEXT_DATE = updatedNextDate;

                    // Atualiza os elementos da interface com as novas datas
                    setInitialDates();

                    // Atualiza os horários e a lista de espera sem limpar os dados
                    renderTimeSlots('current');
                    renderTimeSlots('next');
                    updateWaitlist('current');
                    updateWaitlist('next');

                    //alert('Datas atualizadas com sucesso!');
                    showAlert('Datas atualizadas com sucesso!');
                } else {
                    //alert('Erro ao atualizar as datas no servidor.');
                    showAlert('Erro ao atualizar as datas no servidor.');
                }
            });
        } else {
            //alert('Atualização de datas cancelada.');
            showAlert('Atualização de datas cancelada.');
        }

        // Atualiza as datas para o dia corrente e o próximo dia ao limpar os horários
        //setDates();
        
        //alert('Horários e listas foram limpos.');
        showAlert('Horários e listas foram limpos.');
    } else {
        //alert('Erro ao limpar os horários e a listas.');
        showAlert('Erro ao limpar os horários e as listas.');
    }
}*/
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

        // Exibe o modal para coletar as novas datas
        const modal = document.getElementById('dateModal');
        const closeModal = document.getElementById('closeDateModal');
        const submitDate = document.getElementById('submitDate');
        const currentDateInput = document.getElementById('currentDateInput');
        const nextDateInput = document.getElementById('nextDateInput');

        // Limpa os campos de entrada
        currentDateInput.value = '';
        nextDateInput.value = '';

        modal.style.display = 'flex';

        // Fecha o modal ao clicar no "X"
        closeModal.onclick = () => {
            modal.style.display = 'none';
        };

        // Fecha o modal ao clicar fora dele
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };

        // Aguarda o clique no botão "Confirmar"
        submitDate.onclick = () => {
            const currentDateValue = currentDateInput.value;
            const nextDateValue = nextDateInput.value;

            if (currentDateValue && nextDateValue) {
                const updatedCurrentDate = new Date(`${currentDateValue}T00:00:00`);
                const updatedNextDate = new Date(`${nextDateValue}T00:00:00`);

                // Envia as datas para o servidor
                fetch('/updateDates', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        currentDate: updatedCurrentDate.toISOString(),
                        nextDate: updatedNextDate.toISOString()
                    })
                }).then(response => {
                    if (response.ok) {
                        INITIAL_CURRENT_DATE = updatedCurrentDate;
                        INITIAL_NEXT_DATE = updatedNextDate;

                        // Atualiza os elementos da interface com as novas datas
                        setInitialDates();
                        renderTimeSlots('current');
                        renderTimeSlots('next');
                        updateWaitlist('current');
                        updateWaitlist('next');

                        showAlert('Datas atualizadas com sucesso!');
                    } else {
                        showAlert('Erro ao atualizar as datas no servidor.');
                    }
                });

                modal.style.display = 'none'; // Fecha o modal
            } else {
                showAlert('Por favor, preencha ambas as datas.');
            }
        };
    } else {
        showAlert('Erro ao limpar os horários e as listas.');
    }
};

function openPasswordModal() {
    const modal = document.getElementById('passwordModal');
    const closeBtn = document.getElementsByClassName('close')[0];
    const submitBtn = document.getElementById('passwordSubmit');
    const passwordInput = document.getElementById('passwordInput');

    modal.style.display = 'flex';
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
            //alert('Senha incorreta.');
            showAlert('Senha incorreta.');
        }
    }

    modal.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            submitBtn.onclick();
        }
    });
};

document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        openPasswordModal();
    }
});

document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'U') { // Ctrl + Shift + U
        const currentDateInput = prompt('Digite a nova data do Dia Corrente (formato: MM-DD-YYYY):');
        const nextDateInput = prompt('Digite a nova data do Dia Seguinte (formato: MM-DD-YYYY):');

        if (currentDateInput && nextDateInput) {
            const updatedCurrentDate = new Date(currentDateInput);
            const updatedNextDate = new Date(nextDateInput);

            // Envia as datas para o servidor
            fetch('/updateDates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentDate: updatedCurrentDate.toISOString(),
                    nextDate: updatedNextDate.toISOString()
                })
            }).then(response => {
                if (response.ok) {
                    INITIAL_CURRENT_DATE = updatedCurrentDate;
                    INITIAL_NEXT_DATE = updatedNextDate;

                    // Atualiza os elementos da interface com as novas datas
                    setInitialDates();

                    // Atualiza os horários e a lista de espera sem limpar os dados
                    renderTimeSlots('current');
                    renderTimeSlots('next');
                    updateWaitlist('current');
                    updateWaitlist('next');

                    //alert('Datas atualizadas com sucesso!');
                    showAlert('Datas atualizadas com sucesso!');
                } else {
                    //alert('Erro ao atualizar as datas no servidor.');
                    showAlert('Erro ao atualizar as datas no servidor.');
                }
            });
        } else {
            //alert('Atualização de datas cancelada.');
            showAlert('Atualização de datas cancelada.');
        }
    }
});

function toggleMenu() {
    const menu = document.getElementById('dropdownMenu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

// Fecha o menu se clicar fora dele
document.addEventListener('click', function(event) {
    const menu = document.getElementById('dropdownMenu');
    const icon = document.querySelector('.menu-icon');
    if (menu && icon && !menu.contains(event.target) && !icon.contains(event.target)) {
        menu.style.display = 'none';
    }
});

let blinkTitleInterval = null;
let blinkTitleTimeout = null;

function blinkTitle(message, duration = 60000) {
    const originalTitle = document.title;

    // Se já estiver piscando, limpa o anterior
    if (blinkTitleInterval) {
        clearInterval(blinkTitleInterval);
        blinkTitleInterval = null;
    }
    if (blinkTitleTimeout) {
        clearTimeout(blinkTitleTimeout);
        blinkTitleTimeout = null;
    }

    let visible = false;
    blinkTitleInterval = setInterval(() => {
        document.title = visible ? message : originalTitle;
        visible = !visible;
    }, 800);

    blinkTitleTimeout = setTimeout(() => {
        clearInterval(blinkTitleInterval);
        document.title = originalTitle;
        blinkTitleInterval = null;
        blinkTitleTimeout = null;
    }, duration);
};

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
                    blinkTitle(`⏰ Mensagem para ${name}!`);
                    showAlert(`Sua massagem está próxima, ${name}!\nHorário: ${slot} (Dia: ${formatDate(new Date(date))})`);
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

/*document.addEventListener('DOMContentLoaded', () => {
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
});*/

function initializeApp() {
    setInitialDates();
    showTab('current'); // Mostra a aba do dia corrente por padrão
    fetchBookings();
    startAutoRefresh();
    startNotificationChecker();
}

document.addEventListener('DOMContentLoaded', () => {
    // Busca as datas do servidor
    fetch('/getDates')
        .then(response => response.json())
        .then(data => {
            if (data.currentDate && data.nextDate) {
                INITIAL_CURRENT_DATE = new Date(data.currentDate);
                INITIAL_NEXT_DATE = new Date(data.nextDate);
            } else {
                // Fallback para a data atual caso o servidor não retorne as datas
                INITIAL_CURRENT_DATE = new Date();
                INITIAL_NEXT_DATE = new Date();
                INITIAL_NEXT_DATE.setDate(INITIAL_CURRENT_DATE.getDate() + 1);
            }

            initializeApp();
        })
        .catch(error => {
            console.error('Erro ao buscar as datas do servidor:', error);

            // Fallback para o localStorage caso o servidor não esteja acessível
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

            initializeApp();
        });
});

// Bloquear botão direito do mouse (menu contextual)
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});

// Bloquear atalhos para DevTools e outras funcionalidades
document.addEventListener('keydown', function(e) {
    // F12 - DevTools
    if (e.key === 'F12') {
        e.preventDefault();
        return false;
    }
    // Ctrl+Shift+I - DevTools (Inspector)
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        return false;
    }
    // Ctrl+Shift+J - DevTools (Console)
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        return false;
    }
    // Ctrl+Shift+U - DevTools (Source)
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        return false;
    }
    // Ctrl+U - View Source
    if (e.ctrlKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        return false;
    }
    // Ctrl+S - Save Page
    if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        return false;
    }
});