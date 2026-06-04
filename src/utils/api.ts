/**
 * API Handler Utility to centralize full-stack REST inquiries
 */

let apiToken: string | null = localStorage.getItem('jira_tracker_token');

export const setToken = (token: string | null) => {
  apiToken = token;
  if (token) {
    localStorage.setItem('jira_tracker_token', token);
  } else {
    localStorage.removeItem('jira_tracker_token');
  }
};

export const getToken = () => apiToken;

export async function apiRequest<T = any>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiToken) {
    headers['Authorization'] = `Bearer ${apiToken}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(path, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  // Handle stream attachment files directly bypassing standard json parsing
  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('application/json')) {
    return response as unknown as T;
  }

  return response.json();
}
