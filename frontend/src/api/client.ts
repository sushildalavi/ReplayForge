import axios from "axios";
import type {
  DeadLetterOut,
  EventOut,
  IncidentSummaryOut,
  MetricsOut,
  WorkerOut,
  WorkflowSummaryOut,
  WorkflowTimelineOut,
} from "../types";

const http = axios.create({
  baseURL: (import.meta as unknown as Record<string, Record<string, string>>).env?.VITE_API_BASE_URL ?? "",
  timeout: 15_000,
});

export const api = {
  getMetrics: () => http.get<MetricsOut>("/api/metrics").then((r) => r.data),

  listWorkflows: (limit = 50) =>
    http.get<WorkflowSummaryOut[]>("/api/workflows", { params: { limit } }).then((r) => r.data),

  getWorkflowTimeline: (workflowId: string) =>
    http.get<WorkflowTimelineOut>(`/api/workflows/${workflowId}/timeline`).then((r) => r.data),

  listDeadLetters: (limit = 50) =>
    http.get<DeadLetterOut[]>("/api/deadletters", { params: { limit } }).then((r) => r.data),

  replayDeadLetter: (id: string) =>
    http.post<EventOut>(`/api/deadletters/${id}/replay`).then((r) => r.data),

  listWorkers: () => http.get<WorkerOut[]>("/api/workers").then((r) => r.data),

  summarizeIncident: (workflowId: string) =>
    http.post<IncidentSummaryOut>(`/api/incidents/${workflowId}/summarize`).then((r) => r.data),

  generateWorkload: (count = 20) =>
    http.post<{ workflows: number; events_sent: number; errors: number }>(
      `/api/demo/generate-workload`,
      null,
      { params: { count } }
    ).then((r) => r.data),
};
