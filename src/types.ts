/**
 * Shared Type Definitions for the Jira-like Issue Tracker
 */

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
}

export type IssueStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeId: string | null;
  reporterId: string;
  dueDate: string | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  issueId: string;
  fileName: string;
  fileType: string;
  fileData: string; // Base64 encoded file data
  createdAt: string;
}

export interface ProjectStatistics {
  todoCount: number;
  inProgressCount: number;
  reviewCount: number;
  doneCount: number;
  highPriorityCount: number;
  totalIssuesCount: number;
  assigneeDistribution: Record<string, number>; // assigneeId or name -> count
}
