
export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface SchoolData {
  id: string;
  name: string;
  governorate: string;
  city: string;
  specialty: string;
  address: string;
  mapUrl: string;
  eligibleGovernorates: string;
  status: string;
}
