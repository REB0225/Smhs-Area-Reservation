import React, { useState, useEffect } from 'react';
import './ReservationModal.css';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onDelete?: (id: string) => void;
  selectionInfo: any;
  initialRoom?: string;
  editEvent?: any;
  rooms: any[];
  isReadOnly?: boolean;
  isAdmin?: boolean;
}

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

const ReservationModal: React.FC<ReservationModalProps> = ({ 
  isOpen, onClose, onSubmit, onDelete, selectionInfo, initialRoom, editEvent, rooms, isReadOnly, isAdmin 
}) => {
  const [room, setRoom] = useState('');
  const [purpose, setPurpose] = useState('');
  const [equipment, setEquipment] = useState<Record<string, boolean>>({});
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [date, setDate] = useState('');
  const [frequency, setFrequency] = useState('none');
  const [untilDate, setUntilDate] = useState('');

  const currentRoomObj = rooms.find(r => r.name === room);
  const capabilities = currentRoomObj?.equipment || [];

  const translateEquip = (e: string) => {
    const map: any = { projector: '投影機', whiteboard: '白板', soundSystem: '音響系統' };
    return map[e] || e;
  };

  useEffect(() => {
    if (isOpen) {
      if (editEvent) {
        const props = editEvent.extendedProps || editEvent;
        const initialRoomName = props.room || rooms[0]?.name;
        setRoom(initialRoomName);
        setPurpose(props.purpose || '');
        setEquipment(props.equipment || {});
        
        const start = new Date(editEvent.start);
        const end = new Date(editEvent.end);
        setDate(start.toISOString().split('T')[0]);
        setStartTime(start.toTimeString().slice(0, 5));
        setEndTime(end.toTimeString().slice(0, 5));
        setFrequency('none');
      } else if (selectionInfo) {
        const initialRoomName = initialRoom && rooms.some(r => r.name === initialRoom) ? initialRoom : rooms[0]?.name;
        setRoom(initialRoomName);
        setPurpose('');
        setEquipment({});
        
        const start = new Date(selectionInfo.start);
        const end = new Date(selectionInfo.end);
        setDate(start.toISOString().split('T')[0]);
        setStartTime(start.toTimeString().slice(0, 5));
        setEndTime(end.toTimeString().slice(0, 5));
        setFrequency('none');
        
        // Default untilDate to 1 month later
        const defaultUntil = new Date(start);
        defaultUntil.setMonth(defaultUntil.getMonth() + 1);
        setUntilDate(defaultUntil.toISOString().split('T')[0]);
      }
    }
  }, [isOpen, editEvent, selectionInfo, initialRoom, rooms]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    triggerHaptic();
    const startISO = `${date}T${startTime}:00`;
    const endISO = `${date}T${endTime}:00`;

    onSubmit({
      id: editEvent?.id,
      room,
      purpose,
      equipment,
      start: startISO,
      end: endISO,
      recurring: frequency !== 'none' ? { frequency, until: untilDate } : undefined
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{isReadOnly ? '預約詳情' : (editEvent ? '修改預約' : '教室預約')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>選擇教室</label>
            {isReadOnly ? <p className="readonly-val">{room}</p> : (
              <select value={room} onChange={(e) => setRoom(e.target.value)}>
                {rooms.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
              </select>
            )}
            {currentRoomObj?.notes && (
              <div className="room-notes-display">
                <span className="notes-label">備註：</span>
                <span className="notes-content">{currentRoomObj.notes}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>日期與時間</label>
            {isReadOnly ? <p className="readonly-val">{date} {startTime} ~ {endTime}</p> : (
              <div className="time-inputs">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <div className="time-range">
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  <span>至</span>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>預約目的</label>
            {isReadOnly ? <p className="readonly-val">{purpose}</p> : (
              <input type="text" required value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="例如：數學社社課" />
            )}
          </div>

          {isAdmin && !editEvent && !isReadOnly && (
            <div className="form-group recurring-section">
              <label>重複預約</label>
              <div className="recurring-inputs">
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                  <option value="none">不重複</option>
                  <option value="daily">每天</option>
                  <option value="weekly">每週</option>
                  <option value="biweekly">每隔週</option>
                  <option value="monthly">每月</option>
                </select>
                {frequency !== 'none' && (
                  <div className="until-input">
                    <span>重複至</span>
                    <input type="date" value={untilDate} onChange={(e) => setUntilDate(e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {capabilities.length > 0 && (
            <div className="form-group">
              <label>所需設備</label>
              <div className="checkbox-group">
                {capabilities.map((e: string) => (
                  isReadOnly ? (
                    equipment[e] && <p key={e} className="readonly-val">✓ {translateEquip(e)}</p>
                  ) : (
                    <label key={e}>
                      <input 
                        type="checkbox" 
                        checked={!!equipment[e]} 
                        onChange={(ev) => { 
                          triggerHaptic(); 
                          setEquipment({...equipment, [e]: ev.target.checked}); 
                        }} 
                      /> {translateEquip(e)}
                    </label>
                  )
                ))}
              </div>
            </div>
          )}

          {editEvent && (
            <div className="event-info-footer">
              <p>預約者：{editEvent.extendedProps.userName}</p>
              <p>建立於：{new Date(editEvent.extendedProps.createdAt).toLocaleString('zh-TW')}</p>
            </div>
          )}

          <div className="modal-actions">
            {!isReadOnly && (
              <>
                <button type="submit" className="btn-primary">{editEvent ? '儲存修改' : '提交預約'}</button>
                {editEvent && onDelete && (
                  <button type="button" onClick={() => { triggerHaptic(); onDelete(editEvent.id); }} className="btn-danger">刪除預約</button>
                )}
              </>
            )}
            <button type="button" onClick={() => { triggerHaptic(); onClose(); }} className="btn-secondary">{isReadOnly ? '關閉' : '取消'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReservationModal;