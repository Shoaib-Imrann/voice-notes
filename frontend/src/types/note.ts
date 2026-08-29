export type NoteStatus =
  | "UPLOADED"
  | "PROCESSING_ASR"
  | "SUMMARIZING"
  | "PROCESSING_LLM"
  | "COMPLETED"
  | "FAILED";

export interface StructuredSummary {
  executive_summary?: string;
  key_takeaways?: string[];
  action_items?: string[];
  topics?: string[];
  model_used?: string;
}

export interface AudioNote {
  id: string;
  slug?: string;
  title: string;
  filename: string;
  file_url: string;
  duration_seconds: number;
  file_size_bytes: number;
  status: NoteStatus;
  transcript?: string | null;
  summary?: StructuredSummary | string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteStatusResponse {
  id: string;
  slug?: string;
  status: NoteStatus;
  error_message?: string | null;
  updated_at: string;
}
