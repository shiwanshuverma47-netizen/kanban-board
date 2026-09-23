
const addBtn = document.querySelector('.add-btn')
const removeBtn = document.querySelector('.remove-btn')
const modalCont = document.querySelector('.modal-cont')
const mainCont = document.querySelector('.main-cont')
const taskArea = document.querySelector('.textArea-cont')
const dueDateInput = document.querySelector('.task-due-date')
const allPriorityColors = document.querySelectorAll('.priority-color')
const filterColors = document.querySelectorAll('.color')

let isModalVisible = false
let isDeleteMode = false
let ticketColor = 'lightpink'
const colors = ['lightpink', 'lightgreen', 'lightblue', 'black']
const priorityNames = { lightpink: 'High', lightgreen: 'Medium', lightblue: 'Low', black: 'Critical' }

addBtn.addEventListener('click', function() {
    isModalVisible = !isModalVisible
    modalCont.style.display = isModalVisible ? 'flex' : 'none'
    if (isModalVisible) taskArea.focus()
})

removeBtn.addEventListener('click', function() {
    isDeleteMode = !isDeleteMode
    removeBtn.classList.toggle('active', isDeleteMode)
    mainCont.classList.toggle('delete-mode', isDeleteMode)
})

modalCont.addEventListener('keydown', function(event) {
    if (event.key !== 'Shift' || !taskArea.value.trim()) return
    const ticket = document.createElement('div')
    ticket.className = 'ticket-cont'
    ticket.dataset.priority = ticketColor
    ticket.dataset.dueDate = dueDateInput.value
    ticket.dataset.status = 'pending'
    const ticketId = typeof shortid === 'function' ? shortid() : `task-${Date.now()}`
    const dueLabel = dueDateInput.value ? formatDate(dueDateInput.value) : 'No due date'
    ticket.innerHTML = `<div class="ticket-color" style="background-color: ${ticketColor}"></div><div class="ticket-id">${ticketId}</div><div class="task-area">${escapeHTML(taskArea.value.trim())}</div><div class="ticket-meta"><span class="priority-badge ${ticketColor}-badge">${priorityNames[ticketColor]}</span><span class="due-date"><i class="fa-regular fa-calendar"></i> ${dueLabel}</span></div><button class="complete-btn" type="button" title="Mark task complete" aria-label="Mark task complete"><i class="fa-regular fa-circle"></i></button><button class="ticket-delete-btn" type="button" title="Delete task" aria-label="Delete task"><i class="fa-solid fa-trash"></i></button><div class="ticket-lock"><i class="fa-solid fa-lock"></i></div>`
    mainCont.appendChild(ticket)
    setupTicket(ticket)
    modalCont.style.display = 'none'
    isModalVisible = false
    taskArea.value = ''
    dueDateInput.value = ''
    refreshDashboard()
})

allPriorityColors.forEach(function(colorElem) {
    colorElem.addEventListener('click', function() {
        allPriorityColors.forEach(priorityColor => priorityColor.classList.remove('active'))
        colorElem.classList.add('active')
        ticketColor = colors.find(color => colorElem.classList.contains(color)) || 'lightpink'
    })
})

filterColors.forEach(function(colorElem) {
    colorElem.addEventListener('click', function() {
        const color = colors.find(item => colorElem.classList.contains(item))
        document.querySelectorAll('.ticket-cont').forEach(ticket => { ticket.hidden = Boolean(color && ticket.dataset.priority !== color) })
        filterColors.forEach(filter => filter.classList.remove('selected'))
        colorElem.classList.add('selected')
    })
})

function setupTicket(ticket) {
    ticket.draggable = true
    ticket.querySelector('.complete-btn')?.addEventListener('click', function(event) {
        event.stopPropagation()
        const completed = ticket.dataset.status === 'completed'
        ticket.dataset.status = completed ? 'pending' : 'completed'
        ticket.classList.toggle('completed', !completed)
        this.innerHTML = `<i class="fa-${completed ? 'regular fa-circle' : 'solid fa-circle-check'}"></i>`
        refreshDashboard()
    })
    ticket.querySelector('.ticket-delete-btn')?.addEventListener('click', function(event) {
        event.stopPropagation()
        ticket.remove()
        refreshDashboard()
    })
    ticket.querySelector('.ticket-lock')?.addEventListener('click', function(event) {
        event.stopPropagation()
        const icon = this.querySelector('i')
        icon.classList.toggle('fa-lock-open')
        icon.classList.toggle('fa-lock')
    })
    ticket.querySelector('.ticket-color')?.addEventListener('click', function(event) {
        event.stopPropagation()
        const nextColor = colors[(colors.indexOf(ticket.dataset.priority) + 1) % colors.length]
        ticket.dataset.priority = nextColor
        this.style.backgroundColor = nextColor
        const badge = ticket.querySelector('.priority-badge')
        badge.className = `priority-badge ${nextColor}-badge`
        badge.textContent = priorityNames[nextColor]
        refreshDashboard()
    })
    ticket.addEventListener('click', function() {
        if (isDeleteMode) { ticket.remove(); refreshDashboard() }
    })
    ticket.addEventListener('dragstart', () => ticket.classList.add('dragging'))
    ticket.addEventListener('dragend', () => ticket.classList.remove('dragging'))
}

mainCont.addEventListener('dragover', event => event.preventDefault())
mainCont.addEventListener('drop', function(event) {
    event.preventDefault()
    const dragged = mainCont.querySelector('.dragging')
    if (dragged) mainCont.appendChild(dragged)
})

function refreshDashboard() {
    const tickets = [...document.querySelectorAll('.main-cont .ticket-cont')]
    const completed = tickets.filter(ticket => ticket.dataset.status === 'completed').length
    const pending = tickets.length - completed
    const overdue = tickets.filter(isOverdue).length
    const highPriority = tickets.filter(ticket => ['lightpink', 'black'].includes(ticket.dataset.priority)).length
    const progress = tickets.length ? Math.round((completed / tickets.length) * 100) : 0
    setText('total-count', tickets.length); setText('completed-count', completed); setText('pending-count', pending); setText('overdue-count', overdue); setText('high-count', highPriority)
    setText('progress-value', `${progress}%`); setText('progress-caption', progress === 100 ? 'Everything is complete' : completed ? 'Keep the momentum going' : 'No tasks completed yet'); setText('progress-detail', `${completed} of ${tickets.length} tasks`)
    document.querySelector('#progress-bar').style.width = `${progress}%`
    const max = Math.max(tickets.length, 1)
    setBar('completed-bar', completed, max); setBar('pending-bar', pending, max); setBar('overdue-bar', overdue, max); setBar('high-bar', highPriority, max)
    tickets.forEach(ticket => ticket.classList.toggle('overdue', isOverdue(ticket)))
    renderFocus(tickets)
}

function renderFocus(tickets) {
    const focusList = document.querySelector('#focus-list')
    const focusTasks = tickets.filter(ticket => ticket.dataset.status !== 'completed').sort((a, b) => focusScore(b) - focusScore(a)).slice(0, 3)
    if (!focusTasks.length) { focusList.innerHTML = '<p class="empty-state">You are all caught up. Nice work.</p>'; return }
    focusList.innerHTML = focusTasks.map(ticket => `<div class="focus-item"><span class="focus-dot ${isOverdue(ticket) ? 'late' : ''}"></span><div><strong>${escapeHTML(ticket.querySelector('.task-area').textContent)}</strong><small>${isOverdue(ticket) ? 'Overdue' : ticket.dataset.dueDate ? `Due ${formatDate(ticket.dataset.dueDate)}` : 'No due date'} · ${priorityNames[ticket.dataset.priority]}</small></div></div>`).join('')
}

function focusScore(ticket) {
    const priorityScore = ['lightpink', 'black'].includes(ticket.dataset.priority) ? 2 : 0
    const dueScore = ticket.dataset.dueDate ? Math.max(0, 100 - Math.ceil((new Date(`${ticket.dataset.dueDate}T23:59:59`) - new Date()) / 86400000)) : 0
    return priorityScore * 100 + dueScore
}
function isOverdue(ticket) { return ticket.dataset.status !== 'completed' && ticket.dataset.dueDate && ticket.dataset.dueDate < todayISO() }
function todayISO() { return new Date().toISOString().slice(0, 10) }
function formatDate(date) { return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }
function setText(id, value) { document.getElementById(id).textContent = value }
function setBar(id, value, max) { document.getElementById(id).style.height = `${Math.max((value / max) * 100, value ? 12 : 4)}%` }
function escapeHTML(value) { return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])) }

document.querySelector('#today-label').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
document.querySelectorAll('.ticket-cont').forEach(setupTicket)
refreshDashboard()