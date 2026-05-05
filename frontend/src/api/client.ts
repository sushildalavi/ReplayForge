import axios from "axios";
import type {
  DeadLetterOut, EventOut, IncidentSummaryOut,
  MetricsOut, WorkerOut, WorkflowSummaryOut, WorkflowTimelineOut,
} from "../types";

const http = axios.create({
  baseURL: "",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

export type RecentEvent = {
  id: string;
  workflow_id: string;
  event_type: string;
  service_name: string;
  status: string;
  attempt_count: number;
  last_error: string | null;
  updated_at: string | null;
};

export const api = {
  getMetrics: () => http.get<MetricsOut>("/api/metrics").then(r => r.data),
  listWorkflows: (limit = 50) => http.get<WorkflowSummaryOut[]>("/api/workflows", { params: { limit } }).then(r => r.data),
  getWorkflowTimeline: (id: string) => http.get<WorkflowTimelineOut>(`/api/workflows/${id}/timeline`).then(r => r.data),
  listDeadLetters: (limit = 100) => http.get<DeadLetterOut[]>("/api/deadletters", { params: { limit } }).then(r => r.data),
  replayDeadLetter: (id: string) => http.post<EventOut>(`/api/deadletters/${id}/replay`).then(r => r.data),
  listWorkers: () => http.get<WorkerOut[]>("/api/workers").then(r => r.data),
  summarizeIncident: (wfId: string) => http.post<IncidentSummaryOut>(`/api/incidents/${wfId}/summarize`).then(r => r.data),
  generateWorkload: (count = 30) => http.post<{ workflows: number; events_sent: number; errors: number }>("/api/demo/generate-workload", null, { params: { count } }).then(r => r.data),
  recentEvents: (limit = 40) => http.get<RecentEvent[]>("/api/events/recent", { params: { limit } }).then(r => r.data),
};
