import { create } from 'zustand';
import {
  initDatabase,
  getAllTrips,
  getTripById,
  insertTrip,
  deleteTrip,
  getDaysForTrip,
  getStopsForDay,
  insertStop,
  getPackingItems,
  togglePackingItem,
  getContacts,
  Trip,
  Day,
  Stop,
  PackingItem,
  Contact,
} from './database';

interface WanderPlanState {
  trips: Trip[];
  activeTrip: Trip | null;
  activeDays: Day[];
  activeStopsByDay: Record<string, Stop[]>;
  activePackingItems: PackingItem[];
  activeContacts: Contact[];
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  refreshTrips: () => Promise<void>;
  selectTrip: (tripId: string) => Promise<void>;
  createNewTrip: (trip: Omit<Trip, 'id' | 'spent_budget' | 'progress_percent'>) => Promise<Trip>;
  removeTrip: (tripId: string) => Promise<void>;
  addStop: (stop: Omit<Stop, 'id'>) => Promise<void>;
  togglePackItem: (itemId: string, currentStatus: boolean) => Promise<void>;
}

export const useWanderPlanStore = create<WanderPlanState>((set, get) => ({
  trips: [],
  activeTrip: null,
  activeDays: [],
  activeStopsByDay: {},
  activePackingItems: [],
  activeContacts: [],
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true });
    try {
      await initDatabase();
      const trips = await getAllTrips();
      set({ trips, isInitialized: true });
    } catch (error) {
      console.error('Failed to initialize database:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  refreshTrips: async () => {
    set({ isLoading: true });
    try {
      const trips = await getAllTrips();
      set({ trips });
    } catch (error) {
      console.error('Failed to refresh trips:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  selectTrip: async (tripId: string) => {
    set({ isLoading: true });
    try {
      const trip = await getTripById(tripId);
      if (!trip) {
        set({ activeTrip: null, activeDays: [], activeStopsByDay: {}, activePackingItems: [], activeContacts: [] });
        return;
      }

      const days = await getDaysForTrip(tripId);
      const stopsByDay: Record<string, Stop[]> = {};
      
      for (const day of days) {
        stopsByDay[day.id] = await getStopsForDay(day.id);
      }

      const packingItems = await getPackingItems(tripId);
      const contacts = await getContacts(tripId);

      set({
        activeTrip: trip,
        activeDays: days,
        activeStopsByDay: stopsByDay,
        activePackingItems: packingItems,
        activeContacts: contacts,
      });
    } catch (error) {
      console.error(`Failed to load details for trip ${tripId}:`, error);
    } finally {
      set({ isLoading: false });
    }
  },

  createNewTrip: async (tripData) => {
    set({ isLoading: true });
    try {
      const newTrip = await insertTrip(tripData);
      const trips = await getAllTrips();
      set({ trips });
      return newTrip;
    } catch (error) {
      console.error('Failed to create new trip:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  removeTrip: async (tripId) => {
    set({ isLoading: true });
    try {
      await deleteTrip(tripId);
      const trips = await getAllTrips();
      const activeTrip = get().activeTrip;
      
      set({ 
        trips,
        activeTrip: activeTrip?.id === tripId ? null : activeTrip
      });
    } catch (error) {
      console.error('Failed to delete trip:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addStop: async (stopData) => {
    set({ isLoading: true });
    try {
      await insertStop(stopData);
      // Reload details of current active trip
      const activeTrip = get().activeTrip;
      if (activeTrip) {
        await get().selectTrip(activeTrip.id);
      }
    } catch (error) {
      console.error('Failed to add stop:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  togglePackItem: async (itemId, currentStatus) => {
    try {
      const nextStatus = !currentStatus;
      await togglePackingItem(itemId, nextStatus);
      
      // Update local state reactively
      set((state) => ({
        activePackingItems: state.activePackingItems.map((item) =>
          item.id === itemId ? { ...item, is_packed: nextStatus } : item
        ),
      }));

      // Recalculate trip readiness percentage
      const activeTrip = get().activeTrip;
      if (activeTrip) {
        const items = get().activePackingItems;
        const packedCount = items.filter(i => i.is_packed).length;
        const pct = items.length > 0 ? Math.round((packedCount / items.length) * 100) : 0;
        
        // Update local activeTrip object
        set({
          activeTrip: {
            ...activeTrip,
            progress_percent: pct
          }
        });
      }
    } catch (error) {
      console.error('Failed to toggle packing item:', error);
    }
  },
}));
