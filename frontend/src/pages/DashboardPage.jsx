import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Bell,
  FileText,
  CloudSun,
  Activity,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { Badge, Loader } from '../components/common/Common';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Common';
import { useToast } from '../context/ToastContext';
import { BrowserVoiceAssistant } from '../components/voice/BrowserVoiceAssistant';

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [weather, setWeather] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [openTasks, setOpenTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [weatherLocationAvailable, setWeatherLocationAvailable] = useState(false);
  
  // Quick Task Modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Quick Reminder Modal
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderText, setReminderText] = useState('');
  const [reminderTime, setReminderTime] = useState('');

  // Quick Note Modal
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

  const getDeadlineTimestamp = (task) => {
    if (!task.due_date) return Number.POSITIVE_INFINITY;
    return new Date(`${task.due_date}T${task.due_time || '23:59:59'}`).getTime();
  };

  const getWeatherLocation = (memories) => {
    const locationMemory = memories.find((memory) =>
      /\b(location|city|home town|hometown|where i live|weather)\b/i.test(memory.key)
    );
    if (!locationMemory?.content?.trim()) return null;

    const content = locationMemory.content.trim();
    const match = content.match(/(?:live in|located in|location is|city is|home is)\s+(.+)/i);
    return (match?.[1] || content).replace(/[.!]$/, '').trim();
  };

  const loadDashboardData = async () => {
    try {
      const [sumData, taskData, remData, memories] = await Promise.all([
        api.getDailySummary().catch(() => null),
        api.listTasks({ status: 'all' }).catch(() => []),
        api.listReminders('pending').catch(() => []),
        api.listMemories().catch(() => []),
      ]);

      const sortedOpenTasks = taskData
        .filter((task) => ['pending', 'in_progress'].includes(task.status))
        .sort((a, b) => {
          const priorityDifference = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
          return priorityDifference || getDeadlineTimestamp(a) - getDeadlineTimestamp(b);
        });
      const now = Date.now();
      const upcomingReminders = remData
        .filter((reminder) => new Date(reminder.scheduled_time).getTime() >= now)
        .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
      const weatherLocation = getWeatherLocation(memories);

      setSummary(sumData);
      setOpenTasks(sortedOpenTasks);
      setTasks(sortedOpenTasks.slice(0, 5));
      setReminders(upcomingReminders.slice(0, 4));
      setWeatherLocationAvailable(Boolean(weatherLocation));

      if (!weatherLocation) {
        setWeather(null);
        return;
      }

      const weatherData = await api.getWeather(weatherLocation, 1).catch(() => null);
      if (weatherData?.current) {
        setWeather(weatherData.current);
      } else {
        setWeather(null);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      await api.createTask({
        title: taskTitle,
        priority: taskPriority,
        due_date: taskDueDate || null,
      });
      addToast('Task Created', `"${taskTitle}" added to your task matrix.`, 'success');
      setTaskTitle('');
      setTaskModalOpen(false);
      loadDashboardData();
    } catch (err) {
      addToast('Error', err.message, 'error');
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    if (!reminderText.trim() || !reminderTime) return;
    try {
      await api.createReminder({
        reminder_text: reminderText,
        scheduled_time: new Date(reminderTime).toISOString(),
      });
      addToast('Reminder Scheduled', 'TITAN will alert you at the scheduled time.', 'success');
      setReminderText('');
      setReminderTime('');
      setReminderModalOpen(false);
      loadDashboardData();
    } catch (err) {
      addToast('Error', err.message, 'error');
    }
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;
    try {
      await api.createNote({
        title: noteTitle,
        content: noteContent,
      });
      addToast('Note Saved', `"${noteTitle}" recorded in knowledge base.`, 'success');
      setNoteTitle('');
      setNoteContent('');
      setNoteModalOpen(false);
      loadDashboardData();
    } catch (err) {
      addToast('Error', err.message, 'error');
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await api.completeTask(taskId);
      addToast('Task Completed', 'Marked task as completed.', 'success');
      loadDashboardData();
    } catch (err) {
      addToast('Error', err.message, 'error');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  }).format(new Date());
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
  const dueTodayOrOverdue = openTasks.filter((task) => task.due_date && task.due_date <= localDate);
  const highPriorityTasks = openTasks.filter((task) => ['urgent', 'high'].includes(task.priority));
  const nextTask = openTasks
    .filter((task) => task.due_date)
    .sort((a, b) => getDeadlineTimestamp(a) - getDeadlineTimestamp(b))[0];
  const nextReminder = reminders[0];
  const nextUp = [
    nextTask && { type: 'task', title: nextTask.title, timestamp: getDeadlineTimestamp(nextTask), detail: `Due ${nextTask.due_date}${nextTask.due_time ? ` at ${nextTask.due_time.slice(0, 5)}` : ''}`, item: nextTask },
    nextReminder && { type: 'reminder', title: nextReminder.reminder_text, timestamp: new Date(nextReminder.scheduled_time).getTime(), detail: new Date(nextReminder.scheduled_time).toLocaleString(), item: nextReminder },
  ].filter(Boolean).sort((a, b) => a.timestamp - b.timestamp)[0];

  if (loading) {
    return <Loader size={40} label="Initializing TITAN Command Center..." />;
  }

  return (
    <div className="page-container">
      {/* My Day introduction */}
      <div
        style={{
          marginBottom: 28,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>
            {todayLabel}
          </p>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: 7, maxWidth: 640 }}>
            {summary?.summary_text || 'Here is a clear view of what needs your attention today.'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/activity')}>
          View activity <ArrowRight size={14} />
        </Button>
      </div>

      <BrowserVoiceAssistant />

      {/* Lightweight capture actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        <Button variant="ghost" size="sm" onClick={() => setTaskModalOpen(true)} icon={Plus}>Add task</Button>
        <Button variant="ghost" size="sm" onClick={() => setReminderModalOpen(true)} icon={Bell}>Set reminder</Button>
        <Button variant="ghost" size="sm" onClick={() => setNoteModalOpen(true)} icon={FileText}>Save note</Button>
      </div>

      <section className="titan-card" style={{ marginBottom: 24, padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Daily briefing</p>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: 5 }}>{summary?.summary_text || 'Your day is ready when you are.'}</p>
          </div>
          <div style={{ display: 'flex', gap: 18, color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
            <span><strong style={{ color: 'var(--text-primary)' }}>{summary?.total_tasks_pending ?? openTasks.length}</strong> open tasks</span>
            <span><strong style={{ color: 'var(--text-primary)' }}>{summary?.upcoming_reminders_count ?? reminders.length}</strong> upcoming reminders</span>
            {dueTodayOrOverdue.length > 0 && <span><strong style={{ color: 'var(--text-primary)' }}>{dueTodayOrOverdue.length}</strong> due today</span>}
          </div>
        </div>
      </section>

      <section className="titan-card" style={{ marginBottom: 24, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Clock size={17} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 650 }}>Next up</h2>
        </div>
        {nextUp ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '0.94rem', fontWeight: 600 }}>{nextUp.title}</p>
              <p style={{ marginTop: 3, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {nextUp.type === 'reminder' ? 'Reminder · ' : 'Task · '}{nextUp.detail}
              </p>
            </div>
            {nextUp.type === 'task' ? (
              <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>View task <ArrowRight size={14} /></Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => navigate('/reminders')}>View reminder <ArrowRight size={14} /></Button>
            )}
          </div>
        ) : (
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Nothing time-sensitive is scheduled next.</p>
        )}
      </section>

      {/* Main Grid: Left side (Tasks + Reminders) | Right side (Weather + Activity) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24 }}>
        
        {/* Pending Tasks Column */}
        <div className="titan-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckSquare size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Today’s priorities</h3>
              <Badge variant="cyan">{tasks.length}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
              View All <ArrowRight size={14} />
            </Button>
          </div>

          {(highPriorityTasks.length > 0 || dueTodayOrOverdue.length > 0) && (
            <p style={{ marginTop: -8, marginBottom: 14, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {highPriorityTasks.length > 0 && `${highPriorityTasks.length} high priority`}
              {highPriorityTasks.length > 0 && dueTodayOrOverdue.length > 0 && ' · '}
              {dueTodayOrOverdue.length > 0 && `${dueTodayOrOverdue.length} due today or overdue`}
            </p>
          )}

          {tasks.length === 0 ? (
            <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <p style={{ fontSize: '0.9rem' }}>No open tasks. Your priorities are clear.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => handleCompleteTask(task.id)}
                      style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)', width: 16, height: 16 }}
                      title="Mark Complete"
                    />
                    <div style={{ overflow: 'hidden' }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.title}
                      </p>
                      {task.due_date && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={12} /> Due: {task.due_date} {task.due_time || ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      task.priority === 'urgent'
                        ? 'rose'
                        : task.priority === 'high'
                        ? 'amber'
                        : 'cyan'
                    }
                  >
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Reminders Column */}
        <div className="titan-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={18} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Upcoming reminders</h3>
              <Badge variant="amber">{reminders.length}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/reminders')}>
              View All <ArrowRight size={14} />
            </Button>
          </div>

          {reminders.length === 0 ? (
            <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Clock size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <p style={{ fontSize: '0.9rem' }}>No upcoming reminders scheduled.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reminders.map((rem) => {
                const schedDate = new Date(rem.scheduled_time);
                return (
                  <div
                    key={rem.id}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {rem.reminder_text}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: '0.75rem', color: 'var(--accent-amber)' }}>
                      <Clock size={12} />
                      <span>{schedDate.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Weather Snapshot */}
        {weather ? (
          <div className="titan-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CloudSun size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Context: weather</h3>
              </div>
              <Badge variant="cyan">{weather.provider}</Badge>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <div>
                <h4 style={{ fontSize: '1.8rem', fontWeight: 700 }}>{Math.round(weather.temperature_c)}°C</h4>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {weather.condition_text}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{weather.location_name}</p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div>Feels like: {Math.round(weather.feels_like_c)}°C</div>
                <div>Humidity: {weather.humidity}%</div>
                <div>Wind: {weather.wind_kph} km/h</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="titan-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <CloudSun size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Context: weather</h3>
            </div>
            <p style={{ fontSize: '0.87rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {weatherLocationAvailable
                ? 'Weather is temporarily unavailable for your saved location.'
                : 'Save a location in Memory to include local weather in My Day.'}
            </p>
            {!weatherLocationAvailable && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/memory')} style={{ marginTop: 10 }}>
                Open memory <ArrowRight size={14} />
              </Button>
            )}
          </div>
        )}

        {/* Recent Activity Stream */}
        <div className="titan-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} color="var(--accent-emerald)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Recent activity</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/activity')}>
              Timeline <ArrowRight size={14} />
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {summary?.recent_activities?.slice(0, 4).map((act) => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{act.action_type.replace(/_/g, ' ')}</strong>
                  {act.details?.title && ` - ${act.details.title}`}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Quick Task Modal */}
      <Modal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="Create New Task">
        <form onSubmit={handleCreateTask}>
          <Input
            label="Task Title"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="e.g. Study PostgreSQL query execution plans"
            required
          />
          <Input
            label="Priority"
            type="select"
            value={taskPriority}
            onChange={(e) => setTaskPriority(e.target.value)}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent</option>
          </Input>
          <Input
            label="Due Date (Optional)"
            type="date"
            value={taskDueDate}
            onChange={(e) => setTaskDueDate(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Button variant="secondary" type="button" onClick={() => setTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Reminder Modal */}
      <Modal isOpen={reminderModalOpen} onClose={() => setReminderModalOpen(false)} title="Schedule Reminder">
        <form onSubmit={handleCreateReminder}>
          <Input
            label="Reminder Text"
            value={reminderText}
            onChange={(e) => setReminderText(e.target.value)}
            placeholder="e.g. Call client regarding project milestone"
            required
          />
          <Input
            label="Scheduled Date & Time"
            type="datetime-local"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Button variant="secondary" type="button" onClick={() => setReminderModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Schedule Alert
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Note Modal */}
      <Modal isOpen={noteModalOpen} onClose={() => setNoteModalOpen(false)} title="Create Quick Note">
        <form onSubmit={handleCreateNote}>
          <Input
            label="Note Title"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="e.g. Ideas for system optimization"
            required
          />
          <Input
            label="Content"
            type="textarea"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Type your notes here..."
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Button variant="secondary" type="button" onClick={() => setNoteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Note
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
