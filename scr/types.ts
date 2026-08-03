export interface SportAnnouncement {
  id: string;
  title?: string;
  text: string;
  scope: "public" | "applicants" | "passed";
  category?: "urgent" | "general" | "activity";
  author?: string;
  date?: string;
}

export interface Sport {
  id: string;
  name: string;
  description: string;
  coach: string;
  isOpen: boolean;
  isResultsPublished?: boolean;
  schedule: {
    date: string;
    time: string;
    location: string;
  };
  announcements: SportAnnouncement[];
  pendingGroupLink: string;
  passedGroupLink: string;
}

export interface Student {
  id: string;
  name: string;
  room: string;
  password?: string;
  applications: {
    sportId: string;
    status: "pending" | "passed" | "substitute" | "failed";
  }[];
}

export interface GlobalAnnouncement {
  id: string;
  title?: string;
  text: string;
  date: string;
  category?: "urgent" | "general" | "activity";
  author?: string;
}

export interface Room {
  id: string;
  totalMembers: number;
}

export interface Staff {
  username: string;
  name: string;
  password?: string;
}

export interface RoomManager {
  room: string;
  username: string;
  name: string;
  password?: string;
}

