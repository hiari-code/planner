import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

function App() {
  const dueMessages = [
    'Giving this a tiny poke so it does not fall asleep.',
    'Sending this back to the top of your stack.',
    'A gentle ping to wake this task up.',
    'Just bumping this up in your queue.',
  ]

  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [newTaskTime, setNewTaskTime] = useState('')
  const [activeFilter, setActiveFilter] = useState('Open')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [taskToDelete, setTaskToDelete] = useState(null)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [celebration, setCelebration] = useState('')
  const celebrationTimer = useRef(null)

  function showCelebration(emoji) {
    window.clearTimeout(celebrationTimer.current)
    setCelebration(emoji)
    celebrationTimer.current = window.setTimeout(() => setCelebration(''), 2000)
  }

  useEffect(() => {
    fetch('/api/tasks')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load tasks.')
        return response.json()
      })
      .then(setTasks)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    const checkReminders = () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return
      const now = new Date()
      const today = now.toISOString().slice(0, 10)
      tasks.filter((task) => task.reminderEnabled && /^\d{2}:\d{2}$/.test(task.time)).forEach((task) => {
        const [hours, minutes] = task.time.split(':').map(Number)
        const reminderKey = `planner-reminder-${today}-${task.id}`
        if (now.getHours() === hours && now.getMinutes() === minutes && !sessionStorage.getItem(reminderKey)) {
          new Notification('Samurai Planner', { body: task.title })
          sessionStorage.setItem(reminderKey, 'sent')
        }
      })
    }

    checkReminders()
    const reminderTimer = window.setInterval(checkReminders, 30000)
    return () => window.clearInterval(reminderTimer)
  }, [tasks])

  useEffect(() => {
    const clock = window.setInterval(() => setCurrentTime(new Date()), 30000)
    return () => window.clearInterval(clock)
  }, [])

  const visibleTasks = useMemo(() => {
    if (activeFilter === 'Done') return tasks.filter((task) => task.isDone)
    return tasks.filter((task) => !task.isDone)
  }, [activeFilter, tasks])

  const completedCount = tasks.filter((task) => task.isDone).length

  function isDue(task) {
    if (task.isDone || !/^\d{2}:\d{2}$/.test(task.time)) return false
    const [hours, minutes] = task.time.split(':').map(Number)
    return currentTime.getHours() * 60 + currentTime.getMinutes() >= hours * 60 + minutes
  }

  function dueMessage(task) {
    const dueTasks = tasks.filter((candidate) => isDue(candidate))
    const dueIndex = dueTasks.findIndex((candidate) => candidate.id === task.id)
    return dueMessages[dueIndex % dueMessages.length]
  }

  function dueStar(task) {
    const dueTasks = tasks.filter((candidate) => isDue(candidate))
    const dueIndex = dueTasks.findIndex((candidate) => candidate.id === task.id)
    return dueIndex % 2 === 0 ? '✦' : '✧'
  }

  async function addTask(event) {
    event.preventDefault()
    const title = newTask.trim()
    if (!title) return
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, time: newTaskTime || 'Anytime' }),
      })
      if (!response.ok) {
        const detail = await response.text()
        return setError(detail || `Could not add that task (${response.status}).`)
      }
      const task = await response.json()
      setTasks((currentTasks) => [...currentTasks, task])
      setNewTask('')
      setNewTaskTime('')
      setError('')
      showCelebration('👍')
    } catch {
      setError('Could not reach the planner API. Make sure the C# backend is running.')
    }
  }

  async function toggleTask(task) {
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDone: !task.isDone }),
    })
    if (!response.ok) return setError('Could not update that task.')
    const updatedTask = await response.json()
    setTasks((currentTasks) => currentTasks.map((currentTask) =>
      currentTask.id === updatedTask.id ? updatedTask : currentTask,
    ))
    if (!task.isDone) showCelebration('💖')
  }

  async function toggleReminder(task) {
    const enabling = !task.reminderEnabled
    if (enabling) {
      if (!('Notification' in window)) return setError('This browser does not support notifications.')
      const permission = Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission
      if (permission !== 'granted') return setError('Allow notifications in your browser to activate reminders.')
    }

    const response = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminderEnabled: enabling }),
    })
    if (!response.ok) return setError('Could not update that reminder.')
    const updatedTask = await response.json()
    setTasks((currentTasks) => currentTasks.map((currentTask) =>
      currentTask.id === updatedTask.id ? updatedTask : currentTask,
    ))
    setError('')
  }

  async function deleteTask() {
    if (!taskToDelete) return
    const response = await fetch(`/api/tasks/${taskToDelete.id}`, { method: 'DELETE' })
    if (!response.ok) return setError('Could not remove that task.')
    setTasks((currentTasks) => currentTasks.filter((currentTask) => currentTask.id !== taskToDelete.id))
    setTaskToDelete(null)
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Samurai Planner home">
          <span className="brand-mark">武</span><span>Samurai Planner</span>
        </a>
        <div className="date-pill"><span className="status-dot" />Thursday, September 24</div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">A quiet place for busy days</p>
          <h1>Make room for<br /><em>what matters.</em></h1>
          <p className="intro-copy">A simple daily rhythm, with a little more intention.</p>
        </div>
        <div className="progress-note">
          <span className="progress-ring-wrap">
            <span className="progress-ring">{completedCount}/{tasks.length || 0}</span>
            {celebration && <span className="emoji-celebration" aria-live="polite">{celebration}</span>}
          </span>
          <span>tasks complete<br /><strong>Keep your pace.</strong></span>
        </div>
      </section>

      <section className="planner-panel">
        <div className="panel-heading">
          <div><p className="section-kicker">Daily focus</p><h2>Today’s intentions</h2></div>
          <div className="filter-tabs" role="tablist" aria-label="Task filters">
            {['Open', 'Done'].map((filter) => <button key={filter} type="button" className={activeFilter === filter ? 'active' : ''} onClick={() => setActiveFilter(filter)}>{filter}</button>)}
          </div>
        </div>
        <form className="task-form" onSubmit={addTask}>
          <input value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder="Add a new intention..." aria-label="New task" />
          <input className="task-time-input" type="time" value={newTaskTime} onChange={(event) => setNewTaskTime(event.target.value)} aria-label="Task time" />
          <button type="submit" aria-label="Add task">+</button>
        </form>
        {error && <p className="error-message">{error}</p>}
        {isLoading ? <p className="empty-state">Gathering your intentions...</p> : (
          <div className="task-list">
            {visibleTasks.map((task) => <div className={`task ${task.isDone ? 'done' : ''} ${isDue(task) ? 'due' : ''}`} key={task.id}>
              <input type="checkbox" checked={task.isDone} onChange={() => toggleTask(task)} />
              <span className="checkmark">{task.isDone ? '✓' : ''}</span><span className="task-content"><span className="task-title">{task.title}</span>{isDue(task) && <span className="due-note">{dueMessage(task)} {dueStar(task)}</span>}</span><span className="task-time">{task.time}</span>
              <button className={`reminder-task ${task.reminderEnabled ? 'active' : ''}`} type="button" aria-label={`${task.reminderEnabled ? 'Deactivate' : 'Activate'} reminder for ${task.title}`} title={`${task.reminderEnabled ? 'Deactivate' : 'Activate'} reminder`} onClick={() => toggleReminder(task)}>⌁</button>
              <button className="delete-task" type="button" aria-label={`Remove ${task.title}`} onClick={() => setTaskToDelete(task)}>×</button>
            </div>)}
            {!visibleTasks.length && <p className="empty-state">Nothing here yet. A clear page is a good start.</p>}
          </div>
        )}
        <footer className="panel-footer"><span><span className="mini-spark">✦</span> One step at a time</span><span>{tasks.length - completedCount} open {tasks.length - completedCount === 1 ? 'task' : 'tasks'}</span></footer>
      </section>
      {taskToDelete && <div className="dialog-backdrop" role="presentation" onClick={() => setTaskToDelete(null)}>
        <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title" onClick={(event) => event.stopPropagation()}>
          <p className="section-kicker">Remove intention</p>
          <h2 id="delete-title">Let this one go?</h2>
          <p className="dialog-copy">“{taskToDelete.title}” will be permanently removed from your planner.</p>
          <div className="dialog-actions">
            <button type="button" className="cancel-button" onClick={() => setTaskToDelete(null)}>Cancel</button>
            <button type="button" className="confirm-delete" onClick={deleteTask}>Delete intention</button>
          </div>
        </div>
      </div>}
      <p className="signature">Proverbs 16:9 <span>·</span> 侍 <span>·</span> © 2026 Hiarimino R.</p>
    </main>
  )
}

export default App
