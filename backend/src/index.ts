import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Extend Express Request interface to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

dotenv.config();

// Initialize Firebase Admin with Service Account (Key file or Env Var)
if (admin.default.apps.length === 0) {
  const firebaseKey = process.env.FIREBASE_SERVICE_ACCOUNT;
  const keyPath = path.join(process.cwd(), 'google-key.json');

  if (firebaseKey) {
    // If we have the key as a string (Cloud Deployment)
    admin.default.initializeApp({
      credential: admin.default.credential.cert(JSON.parse(firebaseKey))
    });
    console.log('Firebase initialized from Environment Variable.');
  } else if (fs.existsSync(keyPath)) {
    // If we have the key as a file (Local Development)
    admin.default.initializeApp({
      credential: admin.default.credential.cert(keyPath)
    });
    console.log('Firebase initialized from local google-key.json.');
  } else {
    admin.default.initializeApp();
    console.log('Firebase initialized with Default Credentials.');
  }
}
const db = admin.default.firestore();

const app = express();

// Google Calendar Setup (using environment variables)
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
let calendar: any = null;

const initGCal = () => {
  // In Firebase Functions, we'll rely on ADC or env vars for the key
  if (CALENDAR_ID) {
    try {
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });
      calendar = google.calendar({ version: 'v3', auth });
      console.log('Google Calendar API initialized.');
    } catch (e) {
      console.error('Failed to initialize Google Calendar:', e);
    }
  }
};

initGCal();

app.use(cors({ origin: true })); // Allow all origins for the external frontend
app.use(express.json());

// --- Database Helper Functions (Firestore) ---

const ensureInitialData = async () => {
  const usersRef = db.collection('users');
  const adminUser = await usersRef.doc('admin').get();
  if (!adminUser.exists) {
    await usersRef.doc('admin').set({
      id: 'admin',
      username: 'admin',
      name: 'Admin',
      role: 'admin',
      password: 'admin' // In production, use Firebase Auth or hash this!
    });
  }

  const roomsRef = db.collection('rooms');
  const roomsSnap = await roomsRef.limit(1).get();
  if (roomsSnap.empty) {
    await roomsRef.add({
      name: '自主空間Ａ',
      equipment: ['projector', 'whiteboard', 'soundSystem'],
      id: Date.now().toString()
    });
  }
};

const authUser = async (req: any, res: any, next: any) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    // Try searching by ID field if not using doc ID
    const userQuery = await db.collection('users').where('id', '==', userId).limit(1).get();
    const firstUser = userQuery.docs[0];
    if (userQuery.empty || !firstUser) return res.status(401).json({ error: 'User not found' });
    req.user = firstUser.data();
  } else {
    req.user = userDoc.data();
  }
  next();
};

const parseDate = (d: string) => {
  if (!d.includes('+') && !d.endsWith('Z')) return new Date(d + '+08:00');
  return new Date(d);
};

// --- Endpoints ---
const apiRouter = express.Router();

apiRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const userQuery = await db.collection('users')
    .where('username', '==', username.toLowerCase())
    .where('password', '==', password)
    .limit(1)
    .get();

  const user = userQuery.docs[0];
  if (user) {
    res.json(user.data());
  } else {
    res.status(401).json({ error: '帳號或密碼錯誤' });
  }
});

apiRouter.get('/rooms', authUser, async (req, res) => {
  const snapshot = await db.collection('rooms').get();
  const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(rooms);
});

apiRouter.get('/admin/users', authUser, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const snapshot = await db.collection('users').get();
  const users = snapshot.docs.map(doc => doc.data());
  res.json(users);
});

apiRouter.post('/admin/users', authUser, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { username, name, password, role } = req.body;
  
  const existing = await db.collection('users').where('username', '==', username).get();
  if (!existing.empty) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const id = Date.now().toString();
  const newUser = { id, username, name, password, role: role || 'user' };
  await db.collection('users').doc(id).set(newUser);
  res.json(newUser);
});

apiRouter.delete('/admin/users/:id', authUser, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  if (req.params.id === 'admin') return res.status(400).json({ error: 'Cannot delete super admin' });
  await db.collection('users').doc(req.params.id).delete();
  res.json({ message: 'Deleted' });
});

apiRouter.post('/admin/rooms', authUser, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { id, name, equipment, notes } = req.body;
  
  if (id) {
    const roomRef = db.collection('rooms').doc(id);
    const roomDoc = await roomRef.get();
    if (roomDoc.exists) {
      const oldName = roomDoc.data()?.name;
      await roomRef.update({ name, equipment, notes: notes || '' });
      
      // Update room name in reservations (denormalized data update)
      const resQuery = await db.collection('reservations').where('room', '==', oldName).get();
      const batch = db.batch();
      resQuery.docs.forEach(doc => {
        batch.update(doc.ref, { room: name });
      });
      await batch.commit();
    } else {
      return res.status(404).json({ error: 'Room not found' });
    }
  } else {
    const newId = Date.now().toString();
    await db.collection('rooms').doc(newId).set({ id: newId, name, equipment, notes: notes || '' });
  }
  
  const snapshot = await db.collection('rooms').get();
  res.json(snapshot.docs.map(doc => doc.data()));
});

apiRouter.delete('/admin/rooms/:id', authUser, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  await db.collection('rooms').doc(req.params.id).delete();
  const snapshot = await db.collection('rooms').get();
  res.json(snapshot.docs.map(doc => doc.data()));
});

apiRouter.get('/reservations', authUser, async (req, res) => {
  const snapshot = await db.collection('reservations')
    .where('status', '==', 'approved')
    .get();
  const localEvents = snapshot.docs.map(doc => doc.data());

  if (!calendar || !CALENDAR_ID) {
    return res.json(localEvents);
  }

  try {
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 3);

    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: timeMin.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500
    });

    const googleEvents = response.data.items?.map((event: any) => ({
      id: event.id,
      title: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      room: event.summary?.split(':')[0] || 'Unknown',
      purpose: event.summary?.split(':')[1]?.trim() || '',
      userName: 'Google Calendar',
      userId: 'google',
      createdAt: event.created,
      gcalEventId: event.id,
      status: 'approved'
    })) || [];

    const googleEventIds = new Set(googleEvents.map((e: any) => e.id));
    const validLocalEvents = localEvents.filter((r: any) => !r.gcalEventId || googleEventIds.has(r.gcalEventId));
    const localGcalIds = new Set(validLocalEvents.map((r: any) => r.gcalEventId).filter(Boolean));
    const uniqueGoogleEvents = googleEvents.filter((ge: any) => !localGcalIds.has(ge.id));

    res.json([...validLocalEvents, ...uniqueGoogleEvents]);
  } catch (error) {
    console.error('Error fetching from Google Calendar:', error);
    res.json(localEvents);
  }
});

apiRouter.post('/reservations', authUser, async (req, res) => {
  const { id, room, purpose, start, end, equipment, recurring } = req.body;
  
  const seriesId = Date.now().toString();
  const reservationsToCreate: any[] = [];
  
  // Basic overlap check in Firestore (simplified for the prompt)
  const checkOverlap = async (roomName: string, startStr: string, endStr: string, excludeId?: string) => {
    const snap = await db.collection('reservations')
      .where('room', '==', roomName)
      .get();
    
    const newStart = parseDate(startStr);
    const newEnd = parseDate(endStr);

    return snap.docs.some(doc => {
      const r = doc.data();
      if (r.id === excludeId) return false;
      return newStart < parseDate(r.end) && newEnd > parseDate(r.start);
    });
  };

  if (!id && recurring && req.user.role === 'admin') {
    const { frequency, until } = recurring;
    const untilDate = new Date(until + 'T23:59:59');
    let currentStart = parseDate(start);
    const duration = parseDate(end).getTime() - currentStart.getTime();

    const baseId = Date.now();
    while (currentStart <= untilDate) {
      const startStr = currentStart.toISOString();
      const endStr = new Date(currentStart.getTime() + duration).toISOString();

      if (await checkOverlap(room, startStr, endStr)) {
        return res.status(400).json({ error: `時段 ${currentStart.toLocaleString('zh-TW')} 已有預約` });
      }

      reservationsToCreate.push({
        id: (baseId + reservationsToCreate.length).toString(),
        room, purpose, start: startStr, end: endStr, equipment,
        userId: req.user.id,
        userName: req.user.name,
        status: 'approved',
        createdAt: new Date().toISOString(),
        seriesId
      });

      if (frequency === 'daily') currentStart.setDate(currentStart.getDate() + 1);
      else if (frequency === 'weekly') currentStart.setDate(currentStart.getDate() + 7);
      else if (frequency === 'biweekly') currentStart.setDate(currentStart.getDate() + 14);
      else if (frequency === 'monthly') currentStart.setMonth(currentStart.getMonth() + 1);
      else break;
    }
  } else {
    if (await checkOverlap(room, start, end, id)) {
      return res.status(400).json({ error: '該時段已有預約' });
    }

    if (id) {
      const resRef = db.collection('reservations').doc(id);
      const resDoc = await resRef.get();
      if (!resDoc.exists) return res.status(404).json({ error: 'Not found' });
      if (resDoc.data()?.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }
      const updated = { ...resDoc.data(), room, purpose, start, end, equipment };
      reservationsToCreate.push(updated);
    } else {
      const newId = Date.now().toString();
      const reservation = { 
        id: newId, room, purpose, start, end, equipment,
        userId: req.user.id, userName: req.user.name,
        status: 'approved', createdAt: new Date().toISOString() 
      };
      reservationsToCreate.push(reservation);
    }
  }

  // Save and Sync
  const batch = db.batch();
  for (const reservation of reservationsToCreate) {
    const resRef = db.collection('reservations').doc(reservation.id);
    
    if (calendar && CALENDAR_ID) {
      try {
        const gEvent = {
          summary: `${reservation.room}: ${reservation.purpose}`,
          description: `預約者: ${reservation.userName}`,
          start: { dateTime: parseDate(reservation.start).toISOString() },
          end: { dateTime: parseDate(reservation.end).toISOString() },
        };
        if (reservation.gcalEventId) {
          await calendar.events.update({ calendarId: CALENDAR_ID, eventId: reservation.gcalEventId, requestBody: gEvent });
        } else {
          const result = await calendar.events.insert({ calendarId: CALENDAR_ID, requestBody: gEvent });
          reservation.gcalEventId = result.data.id;
        }
      } catch (e) { console.error('GCal Sync Error:', e); }
    }
    batch.set(resRef, reservation);
  }
  await batch.commit();
  
  res.json(reservationsToCreate[0]);
});

apiRouter.delete('/reservations/:id', authUser, async (req, res) => {
  const resRef = db.collection('reservations').doc(req.params.id);
  const resDoc = await resRef.get();
  if (!resDoc.exists) return res.status(404).json({ error: 'Not found' });
  
  const reservation = resDoc.data();
  if (reservation?.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Permission denied' });
  }

  if (calendar && CALENDAR_ID && reservation?.gcalEventId) {
    try { await calendar.events.delete({ calendarId: CALENDAR_ID, eventId: reservation.gcalEventId }); }
    catch (e) { console.error('GCal Delete Error:', e); }
  }

  await resRef.delete();
  res.json({ message: 'Deleted' });
});

// Setup Initial Data on Startup (for first-time deployment)
ensureInitialData();

app.use('/api', apiRouter);

const port = Number(process.env.PORT) || 3001;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
