export interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  location?: string;
  category?: "date" | "anniversary" | "trip" | "reminder" | "other";
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: number;
}

export interface CreateScheduleInput {
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string;
  location?: string;
  category?: "date" | "anniversary" | "trip" | "reminder" | "other";
}
