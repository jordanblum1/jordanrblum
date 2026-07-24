export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RevealLogEntry {
  timestamp: string;
  allowed: boolean;
  reason: string;
}

export interface ResumeOfferLogEntry {
  timestamp: string;
}
