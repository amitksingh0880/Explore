import * as SQLite from 'expo-sqlite';

// SQLite database name
const DB_NAME = 'wanderplan_new.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Open and return database instance
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  return dbInstance;
}

// Schema definitions
export async function initDatabase(): Promise<void> {
  const db = await getDatabase();

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create tables
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      destination TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      total_days INTEGER DEFAULT 1,
      total_budget REAL DEFAULT 0,
      spent_budget REAL DEFAULT 0,
      currency TEXT DEFAULT '₹',
      status TEXT DEFAULT 'draft',
      progress_percent INTEGER DEFAULT 0,
      cover_gradient TEXT DEFAULT 'g1',
      trip_type TEXT DEFAULT 'solo',
      travelers INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS days (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      day_number INTEGER NOT NULL,
      date TEXT,
      title TEXT,
      weather TEXT DEFAULT '☀️ 28°C',
      FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stops (
      id TEXT PRIMARY KEY,
      day_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      time TEXT,
      duration INTEGER DEFAULT 60,
      location TEXT,
      lat REAL DEFAULT 0,
      lng REAL DEFAULT 0,
      cost REAL DEFAULT 0,
      is_booked INTEGER DEFAULT 0,
      booking_ref TEXT,
      notes TEXT,
      contact_name TEXT,
      contact_phone TEXT,
      FOREIGN KEY (day_id) REFERENCES days (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS packing_items (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_packed INTEGER DEFAULT 0,
      category TEXT DEFAULT 'Other',
      FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      category TEXT DEFAULT 'Other',
      FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS journey_nodes (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      node_type TEXT NOT NULL DEFAULT 'stay',
      location_name TEXT NOT NULL,
      nights INTEGER DEFAULT 0,
      stay_name TEXT,
      room_number TEXT,
      booking_ref TEXT,
      check_in TEXT,
      check_out TEXT,
      transit_mode TEXT,
      transit_from TEXT,
      transit_to TEXT,
      departure_time TEXT,
      arrival_time TEXT,
      notes TEXT,
      is_confirmed INTEGER DEFAULT 0,
      FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
    );
  `);

  // Insert mock data if trips table is completely empty
  const countResult = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM trips;');
  if (countResult && countResult.count === 0) {
    await seedMockData(db);
  }
}

// Seed initial mock data for first-time use
async function seedMockData(db: SQLite.SQLiteDatabase): Promise<void> {
  const tripId1 = 'trip-rajasthan';
  const tripId2 = 'trip-bali';

  // 1. Insert trips
  await db.runAsync(`
    INSERT INTO trips (id, title, destination, start_date, end_date, total_days, total_budget, spent_budget, currency, status, progress_percent, cover_gradient, trip_type, travelers)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    tripId1,
    'Rajasthan Desert Adventure',
    'Rajasthan, India',
    '20/12/2026',
    '30/12/2026',
    10,
    45000,
    18200,
    '₹',
    'active',
    72,
    'g1',
    'group',
    4
  ]);

  await db.runAsync(`
    INSERT INTO trips (id, title, destination, start_date, end_date, total_days, total_budget, spent_budget, currency, status, progress_percent, cover_gradient, trip_type, travelers)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    tripId2,
    'Bali Honeymoon',
    'Bali, Indonesia',
    '10/02/2027',
    '18/02/2027',
    8,
    120000,
    0,
    '₹',
    'draft',
    30,
    'g2',
    'couple',
    2
  ]);

  // 2. Insert days for Rajasthan
  const dayId1 = 'day-raj-1';
  const dayId2 = 'day-raj-2';
  const dayId3 = 'day-raj-3';

  await db.runAsync(`
    INSERT INTO days (id, trip_id, day_number, date, title, weather)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [dayId1, tripId1, 1, '20 Dec', 'Arrival in Jaipur', '☀️ 28°C']);

  await db.runAsync(`
    INSERT INTO days (id, trip_id, day_number, date, title, weather)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [dayId2, tripId1, 2, '21 Dec', 'Amber Fort & City Palace', '🌤️ 26°C']);

  await db.runAsync(`
    INSERT INTO days (id, trip_id, day_number, date, title, weather)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [dayId3, tripId1, 3, '22 Dec', 'Jaipur → Jodhpur', '☀️ 27°C']);

  // 3. Insert stops for Day 1
  await db.runAsync(`
    INSERT INTO stops (id, day_id, name, type, time, duration, location, lat, lng, cost, is_booked, booking_ref, notes, contact_name, contact_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, ['stop-raj-1', dayId1, 'Jaipur Airport', 'transport', '11:00', 60, 'Sanganer, Jaipur', 26.8242, 75.8122, 0, 1, 'AIR-2026-JKL', 'Arrive at Terminal 2. Auto-rickshaw to hotel is ~₹350.', 'IndiGo Airlines', '+91-99999-00000']);

  await db.runAsync(`
    INSERT INTO stops (id, day_id, name, type, time, duration, location, lat, lng, cost, is_booked, booking_ref, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, ['stop-raj-2', dayId1, 'Hotel Samode Haveli', 'accommodation', '13:00', 120, 'Gangapole, Jaipur', 26.9324, 75.8315, 4500, 1, 'BKG-SAMODE', 'Check-in time is strict. Gorgeous boutique heritage stay.']);

  await db.runAsync(`
    INSERT INTO stops (id, day_id, name, type, time, duration, location, lat, lng, cost, is_booked)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, ['stop-raj-3', dayId1, 'Hawa Mahal', 'activity', '16:00', 90, 'Badi Choupad, Jaipur', 26.9239, 75.8267, 200, 0]);

  await db.runAsync(`
    INSERT INTO stops (id, day_id, name, type, time, duration, location, lat, lng, cost, is_booked)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, ['stop-raj-4', dayId1, 'Laxmi Misthan Bhandar', 'food', '19:30', 90, 'Johri Bazar, Jaipur', 26.9205, 75.8245, 350, 0]);

  // 4. Insert stops for Day 2
  await db.runAsync(`
    INSERT INTO stops (id, day_id, name, type, time, duration, location, lat, lng, cost, is_booked)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, ['stop-raj-5', dayId2, 'Amber Fort', 'activity', '08:00', 180, 'Amer, Rajasthan', 26.9855, 75.8513, 500, 1]);

  // 5. Insert contacts for Rajasthan
  await db.runAsync(`
    INSERT INTO contacts (id, trip_id, name, phone, email, category)
    VALUES (?, ?, ?, ?, ?, ?)
  `, ['cont-raj-1', tripId1, 'Hotel Samode Haveli', '+91-141-2632407', 'contact@samode.com', 'Hotel']);

  // 6. Insert packing items for Rajasthan
  await db.runAsync(`
    INSERT INTO packing_items (id, trip_id, name, is_packed, category)
    VALUES (?, ?, ?, ?, ?)
  `, ['pack-raj-1', tripId1, 'Sunscreen lotion SPF 50', 1, 'Toiletries']);

  await db.runAsync(`
    INSERT INTO packing_items (id, trip_id, name, is_packed, category)
    VALUES (?, ?, ?, ?, ?)
  `, ['pack-raj-2', tripId1, 'Camera & Charger', 0, 'Electronics']);

  await db.runAsync(`
    INSERT INTO packing_items (id, trip_id, name, is_packed, category)
    VALUES (?, ?, ?, ?, ?)
  `, ['pack-raj-3', tripId1, 'Light cotton clothing', 1, 'Clothing']);
}

// ── CRUD Helpers for Trips ──────────────────────────────────────────

export interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  total_days: number;
  total_budget: number;
  spent_budget: number;
  currency: string;
  status: string;
  progress_percent: number;
  cover_gradient: string;
  trip_type: string;
  travelers: number;
}

export interface Day {
  id: string;
  trip_id: string;
  day_number: number;
  date: string;
  title: string;
  weather: string;
}

export interface Stop {
  id: string;
  day_id: string;
  name: string;
  type: string;
  time: string;
  duration: number;
  location: string;
  lat: number;
  lng: number;
  cost: number;
  is_booked: boolean;
  booking_ref: string | null;
  notes: string | null;
  contact_name: string | null;
  contact_phone: string | null;
}

export interface PackingItem {
  id: string;
  trip_id: string;
  name: string;
  is_packed: boolean;
  category: string;
}

export interface Contact {
  id: string;
  trip_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  category: string;
}

// Fetch all trips
export async function getAllTrips(): Promise<Trip[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Trip>('SELECT * FROM trips ORDER BY start_date DESC;');
}

// Fetch a single trip by ID
export async function getTripById(id: string): Promise<Trip | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<Trip>('SELECT * FROM trips WHERE id = ?;', [id]);
}

// Insert a new trip
export async function insertTrip(trip: Omit<Trip, 'id' | 'spent_budget' | 'progress_percent'>): Promise<Trip> {
  const db = await getDatabase();
  const id = generateId();

  await db.runAsync(`
    INSERT INTO trips (id, title, destination, start_date, end_date, total_days, total_budget, currency, status, cover_gradient, trip_type, travelers)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    trip.title,
    trip.destination,
    trip.start_date,
    trip.end_date,
    trip.total_days,
    trip.total_budget,
    trip.currency,
    trip.status,
    trip.cover_gradient,
    trip.trip_type,
    trip.travelers
  ]);

  // Automatically insert 'days' rows
  const parsedStartDate = trip.start_date; // e.g. "20/12/2026"
  for (let i = 1; i <= trip.total_days; i++) {
    const dayId = generateId();
    await db.runAsync(`
      INSERT INTO days (id, trip_id, day_number, date, title, weather)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [dayId, id, i, `Day ${i}`, `Day ${i} Itinerary`, '☀️ 28°C']);
  }

  const newTrip = await getTripById(id);
  if (!newTrip) throw new Error('Trip creation failed');
  return newTrip;
}

// Delete a trip
export async function deleteTrip(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM trips WHERE id = ?;', [id]);
}

// Fetch days for a trip
export async function getDaysForTrip(tripId: string): Promise<Day[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Day>('SELECT * FROM days WHERE trip_id = ? ORDER BY day_number ASC;', [tripId]);
}

// Fetch stops for a day
export async function getStopsForDay(dayId: string): Promise<Stop[]> {
  const db = await getDatabase();
  const rawStops = await db.getAllAsync<any>('SELECT * FROM stops WHERE day_id = ? ORDER BY time ASC;', [dayId]);
  return rawStops.map(s => ({
    ...s,
    is_booked: s.is_booked === 1
  }));
}

// Insert a stop
export async function insertStop(stop: Omit<Stop, 'id'>): Promise<Stop> {
  const db = await getDatabase();
  const id = generateId();

  await db.runAsync(`
    INSERT INTO stops (id, day_id, name, type, time, duration, location, lat, lng, cost, is_booked, booking_ref, notes, contact_name, contact_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    stop.day_id,
    stop.name,
    stop.type,
    stop.time,
    stop.duration,
    stop.location,
    stop.lat,
    stop.lng,
    stop.cost,
    stop.is_booked ? 1 : 0,
    stop.booking_ref,
    stop.notes,
    stop.contact_name,
    stop.contact_phone
  ]);

  // Update spent budget on trip
  await recalculateTripBudgetByDayId(() => {
    // We need day_id to find trip_id
    return stop.day_id;
  });

  const rawStop = await db.getFirstAsync<any>('SELECT * FROM stops WHERE id = ?;', [id]);
  return {
    ...rawStop,
    is_booked: rawStop.is_booked === 1
  };
}

// Helper to recalculate trip budget
async function recalculateTripBudgetByDayId(getDayId: () => string): Promise<void> {
  const db = await getDatabase();
  const dayId = getDayId();
  const day = await db.getFirstAsync<{ trip_id: string }>('SELECT trip_id FROM days WHERE id = ?;', [dayId]);
  if (day) {
    const tripId = day.trip_id;
    // Calculate total cost of stops
    const costResult = await db.getFirstAsync<{ total_cost: number }>(`
      SELECT SUM(cost) as total_cost 
      FROM stops 
      WHERE day_id IN (SELECT id FROM days WHERE trip_id = ?);
    `, [tripId]);
    const totalCost = costResult?.total_cost ?? 0;
    await db.runAsync('UPDATE trips SET spent_budget = ? WHERE id = ?;', [totalCost, tripId]);
  }
}

// Fetch packing items for a trip
export async function getPackingItems(tripId: string): Promise<PackingItem[]> {
  const db = await getDatabase();
  const items = await db.getAllAsync<any>('SELECT * FROM packing_items WHERE trip_id = ?;', [tripId]);
  return items.map(i => ({
    ...i,
    is_packed: i.is_packed === 1
  }));
}

// Toggle a packing item
export async function togglePackingItem(itemId: string, isPacked: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE packing_items SET is_packed = ? WHERE id = ?;', [isPacked ? 1 : 0, itemId]);
}

// Fetch contacts for a trip
export async function getContacts(tripId: string): Promise<Contact[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Contact>('SELECT * FROM contacts WHERE trip_id = ? ORDER BY name ASC;', [tripId]);
}

// Insert a single packing item
export async function insertPackingItem(item: Omit<PackingItem, 'id' | 'is_packed'>): Promise<PackingItem> {
  const db = await getDatabase();
  const id = generateId();
  await db.runAsync(
    'INSERT INTO packing_items (id, trip_id, name, is_packed, category) VALUES (?, ?, ?, 0, ?);',
    [id, item.trip_id, item.name, item.category]
  );
  return { id, trip_id: item.trip_id, name: item.name, is_packed: false, category: item.category };
}

// Bulk insert packing items (ignores duplicates by name+trip_id)
export async function bulkInsertPackingItems(
  tripId: string,
  items: { name: string; category: string }[]
): Promise<void> {
  const db = await getDatabase();
  for (const item of items) {
    const exists = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM packing_items WHERE trip_id = ? AND name = ?;',
      [tripId, item.name]
    );
    if (!exists || exists.count === 0) {
      const id = generateId();
      await db.runAsync(
        'INSERT INTO packing_items (id, trip_id, name, is_packed, category) VALUES (?, ?, ?, 0, ?);',
        [id, tripId, item.name, item.category]
      );
    }
  }
}


// ─── Journey Workflow (Pathway Planner) ────────────────────────────────────

export interface JourneyNode {
  id: string;
  trip_id: string;
  order_index: number;
  node_type: string; // 'stay' | 'transit' | 'waypoint'
  location_name: string;
  nights: number;
  stay_name: string | null;
  room_number: string | null;
  booking_ref: string | null;
  check_in: string | null;
  check_out: string | null;
  transit_mode: string | null; // 'flight'|'train'|'bus'|'car'|'ferry'|'walk'
  transit_from: string | null;
  transit_to: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  notes: string | null;
  is_confirmed: boolean;
}

export async function getJourneyNodes(tripId: string): Promise<JourneyNode[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM journey_nodes WHERE trip_id = ? ORDER BY order_index ASC;',
    [tripId]
  );
  return rows.map((r) => ({ ...r, is_confirmed: r.is_confirmed === 1 }));
}

export async function insertJourneyNode(
  node: Omit<JourneyNode, 'id'>
): Promise<JourneyNode> {
  const db = await getDatabase();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO journey_nodes (
      id, trip_id, order_index, node_type, location_name,
      nights, stay_name, room_number, booking_ref, check_in, check_out,
      transit_mode, transit_from, transit_to, departure_time, arrival_time,
      notes, is_confirmed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id, node.trip_id, node.order_index, node.node_type, node.location_name,
      node.nights, node.stay_name ?? null, node.room_number ?? null,
      node.booking_ref ?? null, node.check_in ?? null, node.check_out ?? null,
      node.transit_mode ?? null, node.transit_from ?? null, node.transit_to ?? null,
      node.departure_time ?? null, node.arrival_time ?? null,
      node.notes ?? null, node.is_confirmed ? 1 : 0,
    ]
  );
  const row = await db.getFirstAsync<any>('SELECT * FROM journey_nodes WHERE id = ?;', [id]);
  return { ...row, is_confirmed: row.is_confirmed === 1 };
}

export async function updateJourneyNode(
  id: string,
  updates: Partial<Omit<JourneyNode, 'id' | 'trip_id'>>
): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(key === 'is_confirmed' ? (value ? 1 : 0) : (value ?? null));
  }
  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE journey_nodes SET ${fields.join(', ')} WHERE id = ?;`, values);
}

export async function deleteJourneyNode(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM journey_nodes WHERE id = ?;', [id]);
}


