import { useState, useEffect, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import ReservationModal from './ReservationModal';
import './App.css';

// Replace this URL with your actual Firebase Function URL after deployment
// It usually looks like: https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api/api
const API_BASE_URL = 'https://smhs-area-reservation.vercel.app/api'; 
// Tip: If you host frontend and backend on different servers, 
// change the above to the full 'https://...' URL.

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

// --- Sub-component: Room Editor ---
function RoomEditor({ room, onSave, onCancel, onDelete }: any) {
  const [name, setName] = useState(room?.name || '');
  const [equip, setEquip] = useState<string[]>(room?.equipment || []);
  const [notes, setNotes] = useState(room?.notes || '');
  const [newEquipInput, setNewEquipInput] = useState('');

  const addEquip = () => {
    if (newEquipInput.trim() && !equip.includes(newEquipInput.trim())) {
      setEquip([...equip, newEquipInput.trim()]);
      setNewEquipInput('');
    }
  };

  const removeEquip = (item: string) => {
    setEquip(equip.filter(e => e !== item));
  };

  const translateEquip = (e: string) => {
    const map: any = { projector: '投影機', whiteboard: '白板', soundSystem: '音響系統' };
    return map[e] || e;
  };

  return (
    <div className="room-editor">
      <h3>{room ? `修改教室: ${room.name}` : '新增教室'}</h3>
      <div className="form-group">
        <label>教室名稱</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="名稱" />
      </div>

      <div className="form-group">
        <label>教室備註</label>
        <textarea 
          className="admin-textarea"
          value={notes} 
          onChange={e => setNotes(e.target.value)} 
          placeholder="例如: 冷氣卡在總務處領取"
          rows={3}
        />
      </div>
      
      <div className="form-group">
        <label>設備清單 (輸入後按新增)</label>
        <div className="admin-form">
          <input 
            type="text" 
            value={newEquipInput} 
            onChange={e => setNewEquipInput(e.target.value)} 
            placeholder="例如: 冷氣卡"
            onKeyPress={e => e.key === 'Enter' && addEquip()}
          />
          <button type="button" onClick={addEquip} className="btn-primary small">新增</button>
        </div>
        <div className="equip-tags">
          {equip.map(e => (
            <span key={e} className="equip-tag">
              {translateEquip(e)}
              <i onClick={() => removeEquip(e)}>×</i>
            </span>
          ))}
        </div>
      </div>

      <div className="modal-actions">
        <button onClick={() => onSave({ name, equipment: equip, notes })} className="btn-primary">儲存教室資訊</button>
        {room && <button onClick={() => onDelete(room.id)} className="btn-danger">刪除教室</button>}
        <button onClick={onCancel} className="btn-secondary">取消</button>
      </div>
    </div>
  );
}

// --- Admin Panel Component ---
function AdminPanel({ isOpen, onClose, currentUser, rooms, onRoomsUpdate }: any) {
  const [activeTab, setActiveTab] = useState<'rooms' | 'users'>('rooms');
  const [users, setUsers] = useState<any[]>([]);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');

  useEffect(() => {
    if (isOpen) fetchUsers();
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/users`, { headers: { 'x-user-id': currentUser.id } });
      setUsers(res.data);
    } catch (e) { console.error(e); }
  };

  const handleAddUser = async (e: any) => {
    e.preventDefault();
    if (!newUserUsername || !newUserDisplayName || !newUserPass) return;
    try {
      await axios.post(`${API_BASE_URL}/admin/users`, 
        { username: newUserUsername, name: newUserDisplayName, password: newUserPass, role: newUserRole },
        { headers: { 'x-user-id': currentUser.id } }
      );
      setNewUserUsername('');
      setNewUserDisplayName('');
      setNewUserPass('');
      fetchUsers();
      alert("用戶新增成功");
    } catch (e) { 
      const errorMsg = (e as any).response?.data?.error || "新增失敗";
      alert(errorMsg); 
    }
  };

  const handleSaveRoom = async (roomData: any) => {
    try {
      const payload = { ...roomData, id: editingRoom?.id };
      await axios.post(`${API_BASE_URL}/admin/rooms`, payload, { headers: { 'x-user-id': currentUser.id } });
      setEditingRoom(null);
      setIsAddingRoom(false);
      onRoomsUpdate();
    } catch (e) { alert("儲存失敗"); }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!window.confirm(`確定刪除此教室？`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/admin/rooms/${id}`, { headers: { 'x-user-id': currentUser.id } });
      setEditingRoom(null);
      onRoomsUpdate();
    } catch (e) { alert("刪除失敗"); }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("確定刪除此用戶？")) return;
    try {
      await axios.delete(`${API_BASE_URL}/admin/users/${id}`, { headers: { 'x-user-id': currentUser.id } });
      fetchUsers();
    } catch (e) { alert("刪除失敗"); }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content admin-modal" style={{ '--accent': '#007aff' } as any}>
        <div style={{display:'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h2 style={{margin:0}}>系統管理</h2>
          {(!editingRoom && !isAddingRoom) && <button onClick={onClose} className="btn-text">關閉</button>}
        </div>
        
        {(!editingRoom && !isAddingRoom) && (
          <div className="admin-tabs">
            <button className={activeTab === 'rooms' ? 'active' : ''} onClick={() => setActiveTab('rooms')}>教室管理</button>
            <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>帳號管理</button>
          </div>
        )}

        <div className="admin-tab-content">
          {activeTab === 'rooms' && (
            <>
              {editingRoom || isAddingRoom ? (
                <RoomEditor 
                  room={editingRoom} 
                  onSave={handleSaveRoom} 
                  onDelete={handleDeleteRoom}
                  onCancel={() => { setEditingRoom(null); setIsAddingRoom(false); }} 
                />
              ) : (
                <>
                  <button className="btn-primary" onClick={() => setIsAddingRoom(true)} style={{marginBottom: '15px'}}>新增教室</button>
                  <ul className="admin-list clickable">
                    {rooms.map((r: any) => (
                      <li key={r.name} onClick={() => setEditingRoom(r)}>
                        <span>{r.name}</span>
                        <span className="chevron">›</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          {activeTab === 'users' && (
            <>
              <div className="admin-section">
                <h3>新增用戶</h3>
                <form onSubmit={handleAddUser} className="admin-form-vertical">
                  <input type="text" placeholder="姓名" value={newUserDisplayName} onChange={e => setNewUserDisplayName(e.target.value)} required />
                  <input type="text" placeholder="帳號" value={newUserUsername} onChange={e => setNewUserUsername(e.target.value)} required />
                  <input type="password" placeholder="密碼" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} required />
                  <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                    <option value="user">普通用戶</option>
                    <option value="admin">管理員</option>
                  </select>
                  <button type="submit" className="btn-primary small">建立用戶</button>
                </form>
              </div>
              <div className="admin-section" style={{marginTop: '20px'}}>
                <h3>現有用戶</h3>
                  <ul className="admin-list">
                    {users.map((u: any) => (
                      <li key={u.id}>
                        <span>{u.name} (@{u.username}) - {u.role}</span>
                        {(u.id !== 'admin' && u.id !== currentUser.id) && (
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }} className="btn-text del">刪除</button>
                        )}
                      </li>
                    ))}
                  </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sub-component: Loading Screen ---
function LoadingScreen({ message = '讀取中...' }) {
  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <div className="loading-text">{message}</div>
    </div>
  );
}

// --- Main App Component ---
function App() {
  const [currentUser, setCurrentUser] = useState<any>(JSON.parse(localStorage.getItem('user') || 'null'));
  const [rooms, setRooms] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false); // New state for readonly mode
  const [selectionInfo, setSelectionInfo] = useState<any>(null);
  const [editEvent, setEditEvent] = useState<any>(null);
  const [filterRoom, setFilterRoom] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(false);
  const [initialDataFetched, setInitialDataFetched] = useState(false);
  
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPass, setLoginPassword] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      if (!initialDataFetched) setIsLoading(true);
      try {
        await Promise.all([fetchRooms(), fetchReservations()]);
      } catch (e) {
        console.error("Initial load failed", e);
      } finally {
        setIsLoading(false);
        setInitialDataFetched(true);
      }
    };

    loadData();

    const interval = setInterval(fetchReservations, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const fetchRooms = async () => {
    if (!currentUser) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/rooms`, { headers: { 'x-user-id': currentUser.id } });
      setRooms(res.data);
    } catch (error: any) { 
      console.error(error);
      if (error.response?.status === 401) handleLogout();
      throw error;
    }
  };

  const fetchReservations = async () => {
    if (!currentUser) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/reservations`, { headers: { 'x-user-id': currentUser.id } });
      setEvents(response.data.map((r: any) => ({
        id: r.id,
        title: r.purpose || '預約',
        start: r.start,
        end: r.end,
        extendedProps: { ...r }
      })));
    } catch (error: any) { 
      console.error(error);
      if (error.response?.status === 401) handleLogout();
      throw error;
    }
  };

  const getRoomColor = (roomName: string) => {
    if (roomName === 'All') return 'var(--all-view-color)';
    const idx = rooms.findIndex(r => r.name === roomName);
    if (idx === -1) return '#8e8e93';
    const hue = Math.floor((360 * idx) / rooms.length);
    return `hsl(${hue}, 70%, 50%)`;
  };

  useEffect(() => {
    const color = getRoomColor(filterRoom);
    document.documentElement.style.setProperty('--accent', color);
  }, [filterRoom, rooms]);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/login`, { username: loginUsername, password: loginPass });
      // Reset initial data fetched state on login to trigger the loading screen for the first fetch
      setInitialDataFetched(false); 
      setCurrentUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
    } catch (e) { 
      setIsLoading(false);
      alert("登入失敗: 帳號或密碼錯誤 (請注意大小寫)"); 
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setInitialDataFetched(false);
    localStorage.removeItem('user');
  };

  const handleModalSubmit = async (data: any) => {
    try {
      await axios.post(`${API_BASE_URL}/reservations`, data, { headers: { 'x-user-id': currentUser.id } });
      fetchReservations();
    } catch (error: any) {
      alert(error.response?.data?.error || "提交失敗");
    }
  };

  const handleDeleteRes = async (id: string) => {
    if (!window.confirm("確定刪除？")) return;
    await axios.delete(`${API_BASE_URL}/reservations/${id}`, { headers: { 'x-user-id': currentUser.id } });
    setIsModalOpen(false);
    fetchReservations();
  };

  const filteredEvents = useMemo(() => {
    if (filterRoom === 'All') return events;
    return events.filter(e => e.extendedProps.room === filterRoom);
  }, [events, filterRoom]);

  if (!currentUser) {
    return (
      <div className="login-screen">
        {isLoading && <LoadingScreen />}
        <div className="login-card">
          <h1>教室借用系統</h1>
          <form onSubmit={handleLogin}>
            <input type="text" placeholder="帳號" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} required />
            <input type="password" placeholder="密碼" value={loginPass} onChange={e => setLoginPassword(e.target.value)} required />
            <button type="submit" className="btn-primary">登入</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="view-wrapper">
      {isLoading && <LoadingScreen />}
      <header className="app-header">
        <div className="user-info">
          <span>{currentUser.name} (@{currentUser.username}) ({currentUser.role})</span>
          <div className="header-actions">
            {currentUser.role === 'admin' && <button onClick={() => { triggerHaptic(); setIsAdminOpen(true); }} className="btn-text">管理</button>}
            <button onClick={() => { triggerHaptic(); handleLogout(); }} className="btn-text del">登出</button>
          </div>
        </div>
        <h1>教室借用系統</h1>
        
        <div className="room-filter-container">
          <div className="room-filter">
            <button 
              className={filterRoom === 'All' ? 'active' : ''} 
              style={{ '--room-color': 'var(--all-view-color)' } as any} 
              onClick={() => { triggerHaptic(); setFilterRoom('All'); }}
            >全部</button>
            {rooms.map(room => (
              <button 
                key={room.name}
                className={filterRoom === room.name ? 'active' : ''} 
                style={{ '--room-color': getRoomColor(room.name) } as any} 
                onClick={() => { triggerHaptic(); setFilterRoom(room.name); }}
              >{room.name}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="calendar-container">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          locale="zh-tw"
          buttonText={{
            today: '今天',
            month: '月',
            week: '週',
            day: '日'
          }}
          selectLongPressDelay={0}
          headerToolbar={{ left: 'today prev,next', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          initialView="timeGridWeek"
          allDaySlot={false}
          nowIndicator={true}
          selectable={true}
          events={filteredEvents}
          height="75vh"
          eventContent={(arg) => {
            const r = arg.event.extendedProps;
            const color = getRoomColor(r.room);
            const isOwner = r.userId === currentUser.id || currentUser.role === 'admin';
            return (
              <div className="custom-event" style={{ '--event-color': color } as any}>
                <div className="event-title">{r.room}: {r.purpose}</div>
                <div className="event-owner">預約者: {r.userName}</div>
                {!isOwner && <div className="event-locked">🔒</div>}
              </div>
            );
          }}
          select={(info) => {
            triggerHaptic();
            setIsReadOnly(false); // Regular mode
            setEditEvent(null);
            setSelectionInfo(info);
            setIsModalOpen(true);
          }}
          eventClick={(info) => {
            triggerHaptic();
            const r = info.event.extendedProps;
            if (r.userId !== currentUser.id && currentUser.role !== 'admin') {
              // Open Read-Only Window
              setIsReadOnly(true);
              setEditEvent(info.event);
              setIsModalOpen(true);
              return;
            }
            // Open Regular Edit Window
            setIsReadOnly(false);
            setEditEvent(info.event);
            setIsModalOpen(true);
          }}
          eventDragStart={() => triggerHaptic()}
          eventResizeStart={() => triggerHaptic()}
        />
      </main>

      <AdminPanel 
        isOpen={isAdminOpen} 
        onClose={() => setIsAdminOpen(false)} 
        currentUser={currentUser} 
        rooms={rooms} 
        onRoomsUpdate={fetchRooms} 
      />

      <ReservationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        onDelete={handleDeleteRes}
        selectionInfo={selectionInfo}
        editEvent={editEvent}
        initialRoom={filterRoom !== 'All' ? filterRoom : undefined}
        rooms={rooms}
        isReadOnly={isReadOnly}
        isAdmin={currentUser.role === 'admin'}
      />
    </div>
  );
}

export default App;