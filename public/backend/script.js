const timeSlots = [
    '13:00', '13:15', '13:30', '13:45', '14:00', '14:15', '14:30', '14:45',
    '15:00', '15:15', '15:30', '15:45', '16:00', '16:15', '16:30', '16:45',
    '17:00', '17:15'
];

const bookedSlots = {
    current: {},
    next: {}
};

let blinkTitleInterval = null;
let blinkTitleTimeout = null;
let INITIAL_CURRENT_DATE;
let INITIAL_NEXT_DATE;
let isDarkMode = false; // false se começar no modo claro

// Depois inicializa
const fixedDates = getFixedDates();
INITIAL_CURRENT_DATE = fixedDates.current;
INITIAL_NEXT_DATE = fixedDates.next;

INITIAL_NEXT_DATE.setDate(INITIAL_CURRENT_DATE.getDate() + 1);

function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('pt-BR', options);
};

//Seta as datas iniciais
function setInitialDates() {
    const currentBtn = document.getElementById('current-date-button');
    const nextBtn = document.getElementById('next-date-button');
    const currentDateEl = document.getElementById('current-date');
    const nextDateEl = document.getElementById('next-date');

    if (currentBtn && nextBtn && currentDateEl && nextDateEl) {
        currentBtn.innerText = formatDate(INITIAL_CURRENT_DATE);
        nextBtn.innerText = formatDate(INITIAL_NEXT_DATE);
        currentDateEl.innerText = formatDate(INITIAL_CURRENT_DATE);
        nextDateEl.innerText = formatDate(INITIAL_NEXT_DATE);
    }
}

// Função para salvar no localStorage
function saveFixedDates(currentDate, nextDate) {
    localStorage.setItem("fixedCurrentDate", currentDate.toISOString());
    localStorage.setItem("fixedNextDate", nextDate.toISOString());

     // 🔹 envia pro backend também
    fetch("/saveFixedDates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentDate, nextDate })
    });
}

// Função para recuperar do localStorage (se existir)
function getFixedDates() {
    const savedCurrent = localStorage.getItem("fixedCurrentDate");
    const savedNext = localStorage.getItem("fixedNextDate");

    if (savedCurrent && savedNext) {
        return {
            current: new Date(savedCurrent),
            next: new Date(savedNext)
        };
    }

    // se não tiver nada salvo, usa a data atual
    return {
        current: new Date(),
        next: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
}



document.addEventListener("DOMContentLoaded", function () {
    // Aplica dark-mode ao body no carregamento
    if (isDarkMode) document.body.classList.add('dark-mode');

    const switchToggle = document.getElementById('input');
    if (switchToggle) {
        switchToggle.checked = !isDarkMode; // define o estado inicial do toggle
        switchToggle.addEventListener('change', () => toggleDarkMode());
    }

    function toggleDarkMode() {
        isDarkMode = !isDarkMode;
        document.body.classList.toggle('dark-mode', isDarkMode);
    }
});

async function loadPage(url) {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const mainContent = document.getElementById("mainContent");
        mainContent.innerHTML = html;

        // Reaplica dark-mode ao body mesmo após carregar nova página
         document.body.classList.toggle('dark-mode', isDarkMode);

        // funções independentes do DOM principal
        if (typeof setInitialDates === "function") setInitialDates();

        // inicializar histórico/modal apenas se existir
        if (typeof initHistoryModal === "function") initHistoryModal();

        // inicializar app apenas se os elementos necessários estiverem presentes
        if (document.getElementById('time-slots-current') && typeof initializeApp === "function") {
            initializeApp();
        }

    } catch (err) {
        console.error("Erro ao carregar página:", err);
        document.getElementById("mainContent").innerHTML = "<p>Erro ao carregar conteúdo.</p>";
    }
};

//Modal que é apresentado ao selecionar alguma hora no slot de horas
async function bookSlot(slot, day) {
    // Exibe o modal
    const modal = document.getElementById('nameModal');
    const closeModal = document.getElementById('closeModal');
    const submitName = document.getElementById('submitName');
    const nameInput = document.getElementById('pnameInput');
    const selectedTime = document.getElementById('selectedTime');

    // Limpa o campo de entrada antes de abrir o modal
    modal.style.display = 'flex';
    nameInput.value = '';
    selectedTime.innerText = `Você selecionou: ${slot}`;
    nameInput.focus();

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

        // 🚫 Bloqueia nomes com menos de 3 caracteres
        if (name.length < 3) {
            showAlert('O nome deve ter pelo menos 3 caracteres.');
            return;
        }

        if (name) {
            // Fecha o modal
            // modal.style.display = 'none';

            // Formata o nome: primeira letra maiúscula, restante minúscula
            const formattedName = name
                .toLowerCase()
                .split(' ')
                .map((word) => word.replace(/^\w/, (c) => c.toUpperCase()))
                .join(' ');

             // Verifica se o nome já existe na lista
            const nomesAgendados = Object.values(bookedSlots[day]);
            if (nomesAgendados.includes(formattedName)) {
                showAlert('Este nome já está agendado para este dia.');
                return;
            }

            modal.style.display = 'none';

           // Envia a reserva para o servidor
            const progressBar = document.getElementById('progressBar');
            progressBar.style.display = 'flex'; // mostra o loader
            const delay = (ms) => new Promise(res => setTimeout(res, ms));

            try {
                const response = await fetch('/bookings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ slot, name: formattedName, day }),
                });

                await delay(2000);

                if (response.ok) {
                    bookedSlots[day][slot] = formattedName;
                    renderTimeSlots(day);
                    updateWaitlist(day);
                    showAlert(`Horário ${slot} reservado com sucesso para ${formattedName}!`);
                } else {
                    showAlert('Horário já reservado');
                }
            } catch (error) {
                showAlert('Erro ao salvar, tente novamente.');
            } finally {
                progressBar.style.display = 'none'; // sempre esconde ao terminar
            }
        } else {
            //alert('Por favor, insira seu nome.');
            showAlert('Por favor, insira seu nome.');
        }
    };

    // Permite confirmar com Enter
    nameInput.onkeydown = null;
    nameInput.onkeydown = function(event) {
        if (event.key === 'Enter') {
            submitName.click();
        }
    };
};

// Mapeamento dos atalhos: tecla -> { nome, horário }
const shortcutBookings = {
    "1": { name: "Henrique", slot: "14:15" },
    "2": { name: "Willian",  slot: "14:30" }
    // você pode adicionar mais atalhos aqui
};

document.addEventListener("keydown", async (event) => {
    if (event.ctrlKey && event.altKey && shortcutBookings[event.key]) {
        const { name, slot } = shortcutBookings[event.key];
        let day = "current";

        // Se o horário já estiver ocupado no current
        if (bookedSlots["current"][slot]) {
            if (bookedSlots["current"][slot] === name) {
                // Já está reservado para a mesma pessoa → não marca de novo no next
                showAlert(`${name} já está agendado em ${slot} (current).`);
                return;
            }

            if (!bookedSlots["next"][slot]) {
                // Se não estiver no next, tenta agendar lá
                day = "next";
            } else {
                showAlert(
                    `O horário ${slot} já está reservado no current (${bookedSlots["current"][slot]}) e também no next (${bookedSlots["next"][slot]}).`
                );
                return;
            }
        }

        // Insere localmente
        bookedSlots[day][slot] = name;

        // Envia para o servidor
        const response = await fetch('/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slot, name, day }),
        });

        if (response.ok) {
            renderTimeSlots(day);
            updateWaitlist(day);
            showAlert(`Atalho usado: ${name} agendado em ${slot} (${day}).`);
        } else {
            showAlert('Erro ao agendar via atalho.');
        }
    }
});

//Sincroniza os agendamentos do servidor com a interface do usuário, garantindo que tudo esteja atualizado.
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

//Atualiza visualmente os horários disponíveis (e reservados) para o dia selecionado, permitindo ao usuário agendar um horário clicando no botão correspondente.
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

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

async function showLoaderDuringFetch() {
    const loader = document.getElementById('progressBar');
    loader.style.display = 'flex'; // mostra loader com backdrop
    try {
        await fetchBookings(); // busca e renderiza tudo
        await delay(1000);
    } catch (error) {
        showAlert('Erro ao carregar os agendamentos.');
        console.error(error);
    } finally {
        loader.style.display = 'none'; // esconde loader
    }
};

// Chamar no carregamento da página
document.addEventListener('DOMContentLoaded', () => {
    showLoaderDuringFetch();
});

//Atualiza visualmente a lista de espera para o dia selecionado, mostrando todos os horários agendados e os respectivos nomes, ordenados do mais cedo para o mais tarde.
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

//Mantém a interface sempre sincronizada com o backend, atualizando automaticamente os horários e listas de espera em tempo real.
function startAutoRefresh(interval = 1000) {
    setInterval(() => {
        fetchBookings();
    }, interval);
};

//Essa função alterna entre as abas de dias (ex: "current" e "next"), mostrando apenas o conteúdo e o botão da aba selecionada.
function showTab(day) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.getElementById(`tab-${day}`).classList.add('active');
    document.querySelector(`.tab-button[onclick="showTab('${day}')"]`).classList.add('active');
};

//Essa função gera uma página de impressão com as listas de agendamentos dos dois dias, organizadas em tabelas, prontas para serem impressas.
window.printWaitlist = async function () {
    try {
        const res = await fetch('/bookings');
        const data = await res.json();

        const currentWaitlist = Object.entries(data.current || {})
            .map(([slot, name]) => ({ slot, name }))
            .sort((a, b) => a.slot.localeCompare(b.slot));

        const nextWaitlist = Object.entries(data.next || {})
            .map(([slot, name]) => ({ slot, name }))
            .sort((a, b) => a.slot.localeCompare(b.slot));

        const printWindow = window.open('', '', 'height=600,width=800');

        const currentDatePrint = INITIAL_CURRENT_DATE;
        const nextDatePrint = new Date(INITIAL_CURRENT_DATE);
        nextDatePrint.setDate(currentDatePrint.getDate() + 1);

        printWindow.document.write('<html><head><title>Lista</title>');
        printWindow.document.write('<style>table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid black; padding: 8px; text-align: left; } th { width: 50%; } td:nth-child(1) { width: 50%; } td:nth-child(2) { width: 50%; }</style>');
        printWindow.document.write('</head><body>');

        const buildTable = (list, date) => {
            let html = `<h2>Lista - ${formatDate(date)}</h2>`;
            html += '<table><thead><tr><th>Nome</th><th>Assinatura</th></tr></thead><tbody>';
            list.forEach(item => {
                html += `<tr><td>${item.slot} - ${item.name}</td><td></td></tr>`;
            });
            html += '</tbody></table>';
            return html;
        };

        printWindow.document.write(buildTable(currentWaitlist, currentDatePrint));
        printWindow.document.write(buildTable(nextWaitlist, nextDatePrint));

        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.onload = () => printWindow.print();

    } catch (err) {
        console.error('Erro ao carregar lista para impressão:', err);
        alert('Não foi possível carregar a lista.');
    }
};

document.getElementById('historyPrintBtn').onclick = () => {
    const resultDiv = document.getElementById('historyResult');
    const content = resultDiv.innerText.trim();

    if (!content || content === 'Nenhum histórico encontrado.') {
        showAlert('Não há dados para imprimir.');
        return;
    }

    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Relatório de Massagens</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('table { width: 100%; border-collapse: collapse; }');
    printWindow.document.write('th, td { border: 1px solid black; padding: 8px; text-align: left; }');
    printWindow.document.write('th { background-color: #f0f0f0; }');
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h2>Relatório de Massagens</h2>');
    printWindow.document.write(resultDiv.innerHTML);
    printWindow.document.write('</body></html>');

    printWindow.document.close();
    //printWindow.focus();
    printWindow.print();
    //printWindow.close();
};

//Exibe um modal de alerta com a mensagem informada e permite fechar o modal por botão ou clique fora.
//Serve para mostrar avisos ou erros para o usuário de forma destacada.
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

//limpa todos os agendamentos, pede novas datas ao usuário e atualiza o sistema com as datas informadas, mantendo tudo sincronizado com o backend.
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
                }).then(async response => {
                    if (response.ok) {
                        INITIAL_CURRENT_DATE = updatedCurrentDate;
                        INITIAL_NEXT_DATE = updatedNextDate;
                        saveFixedDates(INITIAL_CURRENT_DATE, INITIAL_NEXT_DATE);
                        
                        // Atualiza os elementos da interface com as novas datas
                        setInitialDates();
                        renderTimeSlots('current');
                        renderTimeSlots('next');
                        updateWaitlist('current');
                        updateWaitlist('next');

                        showAlert('Datas atualizadas com sucesso!');

                        // --- 🚀 INSERE OS AGENDAMENTOS PADRÃO AUTOMÁTICOS ---
                        const defaults = [
                            { slot: "14:15", name: "Henrique" },
                            { slot: "14:30", name: "Willian" }
                        ];

                        for (const { slot, name } of defaults) {
                            bookedSlots.current[slot] = name;

                            await fetch('/bookings', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ slot, name, day: "current" })
                            });
                        }

                        // Re-renderiza depois de inserir os padrões
                        renderTimeSlots('current');
                        updateWaitlist('current');

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

//Exibe um modal para digitar a senha, valida no backend e, se correta, executa a ação de limpar todos os agendamentos.
function openPasswordModal(callbackAfterSuccess) {
    const modal = document.getElementById('passwordModal');
    const closeBtn = document.getElementsByClassName('close')[0];
    const submitBtn = document.getElementById('passwordSubmit');
    const passwordInput = document.getElementById('passwordInput');

    modal.style.display = 'flex';
    passwordInput.value = '';
    passwordInput.focus();

    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }

    function tryPassword() {
        const password = passwordInput.value;
        fetch('/validate-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.valid) {
                modal.style.display = 'none';
               if (typeof callbackAfterSuccess === 'function') {
                    callbackAfterSuccess();
                }
            } else {
                showAlert('Senha incorreta.');
                passwordInput.value = '';
                passwordInput.focus();
            }
        });
    }

    submitBtn.onclick = tryPassword;

    // Remova listeners antigos antes de adicionar um novo
    passwordInput.onkeydown = null;
    passwordInput.onkeydown = function(event) {
        if (event.key === 'Enter') {
            submitBtn.click();
        }
    };
};

//Permite ao usuário selecionar um agendamento, editar o nome e salvar a alteração no servidor, mantendo a interface sincronizada.
function openEditNameModal() {
    // Crie ou exiba o modal
    const modal = document.getElementById('editNameModal');
    const selectDay = document.getElementById('editDaySelect');
    const selectSlot = document.getElementById('editSlotSelect');
    const nameInput = document.getElementById('editNameInput');
    const submitBtn = document.getElementById('editNameSubmit');
    modal.style.display = 'flex';

    // Preencha os dias
    selectDay.innerHTML = `
        <option value="current">${formatDate(INITIAL_CURRENT_DATE)}</option>
        <option value="next">${formatDate(INITIAL_NEXT_DATE)}</option>
    `;

    // Atualiza slots ao mudar o dia
    selectDay.onchange = function() {
        updateSlotOptions(selectDay.value);
    };
    updateSlotOptions(selectDay.value);

    function updateSlotOptions(day) {
        selectSlot.innerHTML = '';
        Object.entries(bookedSlots[day]).forEach(([slot, name]) => {
            const option = document.createElement('option');
            option.value = slot;
            option.text = `${slot} - ${name}`;
            selectSlot.appendChild(option);
        });
        // Preenche o campo com o nome selecionado
        if (selectSlot.options.length > 0) {
            nameInput.value = bookedSlots[day][selectSlot.value];
        } else {
            nameInput.value = '';
        }
    }

    selectSlot.onchange = function() {
        nameInput.value = bookedSlots[selectDay.value][selectSlot.value];
    };

    submitBtn.onclick = function() {
        const day = selectDay.value;
        const slot = selectSlot.value;
        const newName = nameInput.value.trim();
        if (!slot || !newName) {
            showAlert('Selecione um horário e digite o novo nome.');
            return;
        }
        // Envia para o backend
        fetch('/updateBookingName', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ day, slot, newName })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                modal.style.display = 'none';
                fetchBookings(); // Atualiza a lista
                showAlert('Nome alterado com sucesso!');
            } else {
                showAlert('Erro ao alterar o nome.');
            }
        });
    };
};

//Permite atualizar as datas dos dias de agendamento via atalho de teclado, sem apagar os agendamentos já existentes.
function openUpdateDatesModal() {
    const modal = document.getElementById('updateDatesModal');
    const closeBtn = document.getElementById('closeUpdateDatesModal');
    const submitBtn = document.getElementById('updateDatesSubmit');
    const currentDateInput = document.getElementById('updateCurrentDateInput');
    const nextDateInput = document.getElementById('updateNextDateInput');

    modal.style.display = 'flex';
    currentDateInput.value = '';
    nextDateInput.value = '';
    currentDateInput.focus();

    closeBtn.onclick = () => { modal.style.display = 'none'; };
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };

    submitBtn.onclick = () => {
        const currentDateValue = currentDateInput.value;
        const nextDateValue = nextDateInput.value;

        if (currentDateValue && nextDateValue) {
            const updatedCurrentDate = new Date(`${currentDateValue}T00:00:00`);
            const updatedNextDate = new Date(`${nextDateValue}T00:00:00`);

            fetch('/updateDates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentDate: updatedCurrentDate.toISOString(),
                    nextDate: updatedNextDate.toISOString()
                })
            }).then(response => {
                if (response.ok) {
                    INITIAL_CURRENT_DATE = updatedCurrentDate;
                    INITIAL_NEXT_DATE = updatedNextDate;
                    saveFixedDates(INITIAL_CURRENT_DATE, INITIAL_NEXT_DATE);

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

            modal.style.display = 'none';
        } else {
            showAlert('Por favor, preencha ambas as datas.');
        }
    };
};

//Protege as ações de limpar agendamentos e editar nomes, exigindo senha antes de executar cada ação via atalho de teclado.
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        openPasswordModal(clearAll);
    }
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'e') {
        openPasswordModal(openEditNameModal);
    }
    if (event.ctrlKey && event.shiftKey && event.key === 'U') { // Ctrl + Shift + U
        openPasswordModal(openUpdateDatesModal);
    }
});

//Serve para abrir ou fechar o menu dropdown ao clicar em um botão ou ícone.
function toggleMenu() {
    const menu = document.getElementById('dropdownMenuOld');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
};

function closeMenu() {
  document.getElementById('dropdownMenuOld').style.display = 'none';
};

// Fecha o menu se clicar fora dele
document.addEventListener('click', function(event) {
    const menu = document.getElementById('dropdownMenuOld');
    const icon = document.querySelector('.menu-icon');
    if (menu && icon && !menu.contains(event.target) && !icon.contains(event.target)) {
        menu.style.display = 'none';
    }
});

function toggleMenuNew(button) {
    const menu = button.nextElementSibling;

    // Fecha todos antes de abrir (ou reabrir) o clicado
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m !== menu) m.classList.remove('show');
    });

    // Alterna só o do botão clicado
    if (menu && menu.classList.contains('dropdown-menu')) {
        menu.classList.toggle('show');
    }
};

function closeMenuNew() {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.remove('show');
    });
};

// Fecha se clicar fora
document.addEventListener('click', function(event) {
    const isDropdown = event.target.closest('.dropdown-menu');
    const isButton   = event.target.closest('.menu__item');

    if (!isDropdown && !isButton) {
        closeMenuNew();
    }
});


//Pisca o título da aba do navegador com uma mensagem de alerta por um tempo determinado, chamando a atenção do usuário.
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

//Essa função verifica periodicamente se há alguma massagem agendada para começar em até 2 minutos e avisa o usuário com um alerta e piscando o título da aba.
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
};

//Mantém o sistema monitorando automaticamente os agendamentos e notifica o usuário pouco antes do horário de cada massagem.
function startNotificationChecker() {
    setInterval(() => {
        checkForUpcomingMassages();
    }, 60000);
};

//Inicializa o sistema, deixando a interface pronta, sincronizada e monitorando agendamentos e notificações.
function initializeApp() {
    const { current, next } = getFixedDates();
    INITIAL_CURRENT_DATE = current;
    INITIAL_NEXT_DATE = next;

    setInitialDates();
    showTab('current'); // Mostra a aba do dia corrente por padrão
    fetchBookings();
    startAutoRefresh();
    startNotificationChecker();
};

//Garante que o sistema sempre tenha datas válidas para funcionar, buscando do backend, do navegador ou usando a data atual como último recurso.
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

function openHistoryPasswordModal() {
    //openPasswordModal(openHistoryModal);
    openHistoryModal();
};

function initHistoryModal() {
    const nameSelect = document.getElementById('historyNameSelect');
    const searchBtn = document.getElementById('historySearchBtn');
    const resultDiv = document.getElementById('historyResult');
    const printBtn = document.getElementById('historyPrintBtn');

    if (!nameSelect || !searchBtn || !resultDiv) {
        console.warn("Histórico não encontrado na página carregada.");
        return;
    }

    // Preencher a lista de nomes
    fetch('/allNames')
        .then(res => res.json())
        .then(names => {
            nameSelect.innerHTML = '';
            
            // Adicionar a opção "Todos"
            const allOption = document.createElement('option');
            allOption.value = 'Todos';
            allOption.text = 'Todos';
            nameSelect.appendChild(allOption);

            // Adicionar os nomes ordenados
            names.sort((a, b) => a.localeCompare(b)).forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.text = name;
                nameSelect.appendChild(option);
            });
        });

    // Quando clicar em pesquisar
    searchBtn.onclick = () => {
        const selectedName = nameSelect.value;
        const selectedMonth = document.getElementById('monthSelect').value;
        const url = selectedName === 'Todos' ? '/historyAll' : `/history/${encodeURIComponent(selectedName)}`;

        fetch(url)
            .then(res => res.json())
            .then(history => {
                if (!history.length) {
                    resultDiv.innerHTML = 'Nenhum histórico encontrado.';
                    return;
                }

                // Filtrar por mês, se selecionado diferente de "Todos"
                let filteredHistory = history;
                if (selectedMonth !== 'Todos') {
                    filteredHistory = history.filter(item => {
                        const month = item.date.split('-')[1];
                        return month === selectedMonth;
                    });
                }

                if (!filteredHistory.length) {
                    resultDiv.innerHTML = 'Nenhum histórico encontrado para o filtro selecionado.';
                    return;
                }

                // Ordenar os dados
                history.sort((a, b) => {
                    const dateA = new Date(`${a.date}T${a.slot}`);
                    const dateB = new Date(`${b.date}T${b.slot}`);
                    return dateA - dateB;
                });

                // Agrupar os dados por nome e mês
                const grouped = {};
                filteredHistory.forEach(item => {
                    const [year, month] = item.date.split('-');
                    const key = `${month}/${year}`;
                    if (!grouped[item.name]) grouped[item.name] = {};
                    if (!grouped[item.name][key]) grouped[item.name][key] = [];
                    grouped[item.name][key].push(formatDateTime(item.date, item.slot));
                });

                // Montar a lista de meses únicos
                const allMonthsSet = new Set();
                Object.values(grouped).forEach(monthData => {
                    Object.keys(monthData).forEach(monthKey => allMonthsSet.add(monthKey));
                });
                const months = Array.from(allMonthsSet).sort((a, b) => {
                    const [m1, y1] = a.split('/');
                    const [m2, y2] = b.split('/');
                    return new Date(`${y1}-${m1}-01`) - new Date(`${y2}-${m2}-01`);
                });

                // Montar a tabela
                let table = '<table border="1" style="border-collapse: collapse; width: 100%; font-size: 13px;">';
                table += `<tr><th>Nome</th>${months.map(m => `<th>${formatMonthYear(m)}</th>`).join('')}</tr>`;

                Object.keys(grouped).sort((a, b) => a.localeCompare(b)).forEach(name => {
                    table += `<tr><td>${name}</td>`;
                    months.forEach(month => {
                        const values = grouped[name][month] || [];
                        table += `<td>${values.join('<br>')}</td>`;
                    });
                    table += `</tr>`;
                });

                table += '</table>';
                resultDiv.innerHTML = table;
            });
    };

     // Evento de imprimir
    if (printBtn) {
        printBtn.onclick = () => {
            const content = resultDiv.innerText.trim();

            if (!content || content === 'Nenhum histórico encontrado.') {
                showAlert('Não há dados para imprimir.');
                return;
            }

            const printWindow = window.open('', '', 'height=600,width=800');
            printWindow.document.write('<html><head><title>Relatório de Massagens</title>');
            printWindow.document.write('<style>');
            printWindow.document.write('table { width: 100%; border-collapse: collapse; }');
            printWindow.document.write('th, td { border: 1px solid black; padding: 8px; text-align: left; }');
            printWindow.document.write('th { background-color: #f0f0f0; }');
            printWindow.document.write('</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write('<h2>Relatório de Massagens</h2>');
            printWindow.document.write(resultDiv.innerHTML);
            printWindow.document.write('</body></html>');

            printWindow.document.close();
            printWindow.print();
        };
    };
};

//pop-up
function openHistoryModal() {
    const modal = document.getElementById('historyModal');
    const closeBtn = document.getElementById('closeHistoryModal');
    const nameSelect = document.getElementById('historyNameSelect');
    const searchBtn = document.getElementById('historySearchBtn');
    const resultDiv = document.getElementById('historyResult');

    // Preencher a lista de nomes
    fetch('/allNames')
        .then(res => res.json())
        .then(names => {
            nameSelect.innerHTML = '';
            
            // Adicionar a opção "Todos"
            const allOption = document.createElement('option');
            allOption.value = 'Todos';
            allOption.text = 'Todos';
            nameSelect.appendChild(allOption);

            // Adicionar os nomes
            names.sort((a, b) => a.localeCompare(b)); // ordena em ordem crescente

            names.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.text = name;
                nameSelect.appendChild(option);
            });
        });

    modal.style.display = 'flex';
    closeBtn.onclick = () => { modal.style.display = 'none'; };

    searchBtn.onclick = () => {
        const selectedName = nameSelect.value;
        const selectedMonth = document.getElementById('monthSelect').value;
        const url = selectedName === 'Todos' ? '/historyAll' : `/history/${encodeURIComponent(selectedName)}`;

        fetch(url)
            .then(res => res.json())
            .then(history => {
                if (!history.length) {
                    resultDiv.innerHTML = 'Nenhum histórico encontrado.';
                    return;
                }

                // Filtrar por mês, se selecionado diferente de "Todos"
                let filteredHistory = history;
                if (selectedMonth !== 'Todos') {
                    filteredHistory = history.filter(item => {
                        const month = item.date.split('-')[1]; // pega o mês da data
                        return month === selectedMonth;
                    });
                }

                if (!filteredHistory.length) {
                    resultDiv.innerHTML = 'Nenhum histórico encontrado para o filtro selecionado.';
                    return;
                }

                // Ordenar os dados
                history.sort((a, b) => {
                    const dateA = new Date(`${a.date}T${a.slot}`);
                    const dateB = new Date(`${b.date}T${b.slot}`);
                    return dateA - dateB;
                });

                // Agrupar os dados por nome e mês
                const grouped = {};
                filteredHistory.forEach(item => {
                    const [year, month] = item.date.split('-');
                    const key = `${month}/${year}`;
                    if (!grouped[item.name]) grouped[item.name] = {};
                    if (!grouped[item.name][key]) grouped[item.name][key] = [];
                    grouped[item.name][key].push(formatDateTime(item.date, item.slot));
                });

                // Montar a lista de meses únicos
                const allMonthsSet = new Set();
                Object.values(grouped).forEach(monthData => {
                    Object.keys(monthData).forEach(monthKey => allMonthsSet.add(monthKey));
                });
                const months = Array.from(allMonthsSet).sort((a, b) => {
                    const [m1, y1] = a.split('/');
                    const [m2, y2] = b.split('/');
                    return new Date(`${y1}-${m1}-01`) - new Date(`${y2}-${m2}-01`);
                });

                // Montar a tabela
                let table = '<table border="1" style="border-collapse: collapse; width: 100%; font-size: 13px;">';
                table += `<tr><th>Nome</th>${months.map(m => `<th>${formatMonthYear(m)}</th>`).join('')}</tr>`;

                // Ordenar os nomes antes de exibir
                Object.keys(grouped).sort((a, b) => a.localeCompare(b)).forEach(name => {
                    table += `<tr><td>${name}</td>`;
                    months.forEach(month => {
                        const values = grouped[name][month] || [];
                        table += `<td>${values.join('<br>')}</td>`;
                    });
                    table += `</tr>`;
                });

                table += '</table>';
                resultDiv.innerHTML = table;
            });
    };
};

// Função para formatar de "08/2025" para "Agosto/2025"
function formatMonthYear(monthYear) {
    const [month, year] = monthYear.split('/');
    const monthsPt = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${monthsPt[parseInt(month) - 1]}/${year}`;
};

function formatDateTime(dateStr, timeStr) {
    const [year, month, day] = dateStr.split('-');
    return `${timeStr} - ${day}/${month}/${year}`;
};

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
    // ctrl + shift + c - DevTools
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        return false;
    }
    // Ctrl+Shift+U - DevTools (Source)
    /*if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        return false;
    }*/
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
    if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        return false;
    }
});

document.addEventListener("DOMContentLoaded", function () {
    console.clear();

    let duration = 0.4;
    let isDay = true;
    let back = document.getElementById('back');
    let front = document.getElementById('front');

    let switchTime = () => {
        back.setAttribute('href', '#' + (isDay ? 'day' : 'night'));
        front.setAttribute('href', '#' + (isDay ? 'night' : 'day'));
    }

    let scale = 30;
    let toNightAnimation = gsap.timeline();
    toNightAnimation
        .to('#night-content', { duration: duration * 0.5, opacity: 1, ease: 'power2.inOut', x: 0 })
        .to('#circle', {
            duration: duration,
            ease: 'power4.in',
            scaleX: scale,
            scaleY: scale,
            x: 1,
            transformOrigin: '100% 50%',
        }, 0)
        .to('.day-label', { duration: duration * 0.5, ease: 'power2.inOut', opacity: 0.2 }, 0)
        .to('.night-label', { duration: duration * 0.5, ease: 'power2.inOut', opacity: 1 }, 0)
        .set('#circle', {
            scaleX: -scale,
            onUpdate: () => switchTime()
        }, duration).to('#circle', {
            duration: duration,
            ease: 'power4.out',
            scaleX: -1,
            scaleY: 1,
            x: 2,
        }, duration)
        .to('#day-content', { duration: duration * 0.5, opacity: 0.5 }, duration * 2)
        .to('.header', { background: 'linear-gradient(90deg, #7d001dff 0%, #430062ff 14%, #3f005cff 26%, #330150ff 40%)', color: 'white', duration: duration * 0.5 }, 0)
        .to('.newHeader', { background: 'linear-gradient(90deg, #7d001dff 0%, #430062ff 14%, #3f005cff 26%, #330150ff 40%)', color: 'white', duration: duration * 0.5 }, 0)
        //.to('body', { backgroundColor: '#686869ff', color: '#black', duration: duration * 2 }, 0)
        //.to('.rodape', { backgroundColor: '#686869ff', color: '#dfdfdfff', duration: duration * 2 }, 0);

    let stars = Array.from(document.getElementsByClassName('star'));
    stars.map(star => gsap.to(star, { duration: 'random(0.4, 1.5)', repeat: -1, yoyo: true, opacity: 'random(0.2, 0.5)' }));

    gsap.to('.clouds-big', { duration: 15, repeat: -1, x: -74, ease: 'linear' });
    gsap.to('.clouds-medium', { duration: 20, repeat: -1, x: -65, ease: 'linear' });
    gsap.to('.clouds-small', { duration: 25, repeat: -1, x: -71, ease: 'linear' });

    let switchToggle = document.getElementById('input');
    switchToggle.addEventListener('change', () => toggle());

    let toggle = () => {
        isDay = switchToggle.checked == true;
        const logo = document.querySelector(".menu-logo"); // pega a logo

        if (isDay) {
            toNightAnimation.reverse();
            document.body.classList.remove('dark-mode');
            logo.src = "https://azship.com.br/wp-content/uploads/2025/07/Az-ship-logo-v2.svg"; // logo padrão
        } else {
            toNightAnimation.play();
            document.body.classList.add('dark-mode');
            logo.src = "https://azship.com.br/wp-content/uploads/2025/07/logo.svg"; // logo branca
        }
    }

    toNightAnimation.reverse();
    toNightAnimation.pause();
});

// Delegação de eventos para abrir o modal ao clicar em slots
document.addEventListener("click", (e) => {
    const slot = e.target.closest("#time-slots-current div, #time-slots-next div");
    if (slot) {
        const time = slot.textContent;
        document.getElementById("selectedTime").textContent = "Você selecionou: " + time;
        document.getElementById("nameModal").style.display = "block";
    }
});

// Fechar modal no botão X
document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("nameModal").style.display = "none";
});

// (Opcional) Fechar modal clicando fora
window.addEventListener("click", (e) => {
    if (e.target.id === "nameModal") {
        document.getElementById("nameModal").style.display = "none";
    }
});