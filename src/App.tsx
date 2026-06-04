import React, { useState, useEffect } from 'react';
import { 
  setToken, 
  getToken, 
  apiRequest 
} from './utils/api';
import { 
  User, 
  Project, 
  Issue, 
  Comment, 
  Attachment, 
  IssueStatus, 
  IssuePriority 
} from './types';
import ReportingDashboard from './components/ReportingDashboard';
import { 
  KanbanSquare, 
  Plus, 
  LogOut, 
  User as UserIcon, 
  Settings, 
  Folder, 
  ListTodo, 
  BarChart3, 
  ChevronRight, 
  Calendar, 
  Paperclip, 
  MessageSquare, 
  Trash2, 
  X, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Shield,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function App() {
  // Authentication states
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authRole, setAuthRole] = useState<'admin' | 'user'>('user');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Core domain records
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  
  // Active Navigation & UX controllers
  const [activeTab, setActiveTab] = useState<'kanban' | 'dashboard' | 'projects'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  // Detail & creation modulators
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [attachments, setAttachments] = useState<Partial<Attachment>[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);

  // New project dialog values
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // New ticket dialog values
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueDesc, setNewIssueDesc] = useState('');
  const [newIssuePriority, setNewIssuePriority] = useState<IssuePriority>('medium');
  const [newIssueAssignee, setNewIssueAssignee] = useState<string>('');
  const [newIssueDueDate, setNewIssueDueDate] = useState('');

  // Loading indicator states
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Check login on startup
  useEffect(() => {
    const startupToken = getToken();
    if (startupToken) {
      apiRequest<User>('/api/auth/me')
        .then(profile => {
          setUser(profile);
          fetchInitialDataset();
        })
        .catch(() => {
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setIsLoadingAuth(false);
        });
    } else {
      setIsLoadingAuth(false);
    }
  }, []);

  // Sync users list whenever user modifies boards
  const fetchUsersList = async () => {
    try {
      const usersData = await apiRequest<User[]>('/api/users');
      setUsers(usersData);
    } catch (e) {
      console.warn('Could not read user pool indices:', e);
    }
  };

  const fetchInitialDataset = async () => {
    setIsLoadingData(true);
    try {
      const projData = await apiRequest<Project[]>('/api/projects');
      setProjects(projData);
      fetchUsersList();

      if (projData.length > 0) {
        setSelectedProjectId(projData[0].id);
      }
    } catch (e) {
      console.error('Error fetching baseline project records:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Sync issues list whenever selected project toggles
  useEffect(() => {
    if (selectedProjectId) {
      setIsLoadingData(true);
      apiRequest<Issue[]>(`/api/projects/${selectedProjectId}/issues`)
        .then(tickets => {
          setIssues(tickets);
        })
        .catch(err => {
          console.error('Error fetching issue records for project:', err);
        })
        .finally(() => {
          setIsLoadingData(false);
        });
    } else {
      setIssues([]);
    }
  }, [selectedProjectId]);

  // Auth execution: Signup
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authEmail || !authPassword || !authName) {
      setAuthError('Please fill out all fields.');
      return;
    }
    try {
      const data = await apiRequest('/api/auth/signup', 'POST', {
        email: authEmail,
        password: authPassword,
        name: authName,
        role: authRole
      });
      setToken(data.token);
      setUser(data.user);
      fetchInitialDataset();
    } catch (err: any) {
      setAuthError(err.message || 'Signup failed.');
    }
  };

  // Auth execution: Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authEmail || !authPassword) {
      setAuthError('Email and password must be supplied.');
      return;
    }
    try {
      const data = await apiRequest('/api/auth/login', 'POST', {
        email: authEmail,
        password: authPassword
      });
      setToken(data.token);
      setUser(data.user);
      fetchInitialDataset();
    } catch (err: any) {
      setAuthError(err.message || 'Login details incorrect. Check password rules.');
    }
  };

  // Clear session token
  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setProjects([]);
    setSelectedProjectId(null);
    setIssues([]);
    setComments([]);
    setSelectedIssue(null);
  };

  // Create Project
  const createProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const newProj = await apiRequest<Project>('/api/projects', 'POST', {
        name: newProjectName,
        description: newProjectDesc
      });
      setProjects([...projects, newProj]);
      setSelectedProjectId(newProj.id);
      setIsProjectModalOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
    } catch (e: any) {
      alert(e.message || 'Error occurred creating new workspace.');
    }
  };

  // Delete Project cascading structures
  const deleteProject = async (projId: string) => {
    if (!confirm('Are you absolutely sure you want to delete this project and all its issues, comments, and attachments? This action cannot be undone.')) {
      return;
    }
    try {
      await apiRequest(`/api/projects/${projId}`, 'DELETE');
      const updatedList = projects.filter(p => p.id !== projId);
      setProjects(updatedList);
      if (selectedProjectId === projId) {
        setSelectedProjectId(updatedList.length > 0 ? updatedList[0].id : null);
      }
    } catch (e: any) {
      alert(e.message || 'Failed deleting project. Review role permissions.');
    }
  };

  // Create Issue
  const createIssue = async () => {
    if (!newIssueTitle.trim() || !selectedProjectId) return;
    try {
      const ticket = await apiRequest<Issue>(`/api/projects/${selectedProjectId}/issues`, 'POST', {
        title: newIssueTitle,
        description: newIssueDesc,
        priority: newIssuePriority,
        assigneeId: newIssueAssignee || null,
        dueDate: newIssueDueDate || null,
        status: 'todo'
      });
      setIssues([...issues, ticket]);
      setIsIssueModalOpen(false);
      setNewIssueTitle('');
      setNewIssueDesc('');
      setNewIssuePriority('medium');
      setNewIssueAssignee('');
      setNewIssueDueDate('');
    } catch (e: any) {
      alert(e.message || 'Failed to file your issue context.');
    }
  };

  // Delete Issue
  const deleteActiveIssue = async (issueId: string) => {
    if (!confirm('Delete this task permanently?')) return;
    try {
      await apiRequest(`/api/issues/${issueId}`, 'DELETE');
      setIssues(issues.filter(i => i.id !== issueId));
      if (selectedIssue?.id === issueId) {
        setSelectedIssue(null);
      }
    } catch (e: any) {
      alert(e.message || 'Error executing issue deletion request.');
    }
  };

  // Live Inline Status Drag & Drop Trigger and updates
  const updateIssueStatus = async (issueId: string, nextStatus: IssueStatus) => {
    try {
      const updated = await apiRequest<Issue>(`/api/issues/${issueId}`, 'PATCH', { status: nextStatus });
      setIssues(issues.map(i => i.id === issueId ? updated : i));
      if (selectedIssue && selectedIssue.id === issueId) {
        setSelectedIssue(updated);
      }
    } catch (e: any) {
      alert(e.message || 'Failed status update synchronization.');
    }
  };

  // Update specific attributes like assignment, priorities, description in detail modal view
  const editIssueDetails = async (updates: Partial<Issue>) => {
    if (!selectedIssue) return;
    try {
      const updated = await apiRequest<Issue>(`/api/issues/${selectedIssue.id}`, 'PATCH', updates);
      setIssues(issues.map(i => i.id === selectedIssue.id ? updated : i));
      setSelectedIssue(updated);
    } catch (e: any) {
      alert(e.message || 'Error occurred editing ticket values.');
    }
  };

  // Load comment details whenever user views issue detailmodal
  const viewIssueDetailsModal = async (ticket: Issue) => {
    setSelectedIssue(ticket);
    try {
      const fetchedComments = await apiRequest<Comment[]>(`/api/issues/${ticket.id}/comments`);
      setComments(fetchedComments);
      const fetchedAttachments = await apiRequest<Partial<Attachment>[]>(`/api/issues/${ticket.id}/attachments`);
      setAttachments(fetchedAttachments);
    } catch (e) {
      console.warn('Error loading notes or attachments indices:', e);
    }
  };

  // Post comment
  const postComment = async () => {
    if (!selectedIssue || !newCommentText.trim()) return;
    try {
      const comment = await apiRequest<Comment>(`/api/issues/${selectedIssue.id}/comments`, 'POST', {
        content: newCommentText
      });
      setComments([...comments, comment]);
      setNewCommentText('');
    } catch (e: any) {
      alert(e.message || 'Error posting remark');
    }
  };

  // Handle Attachment Upload (base64 standard serialization)
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedIssue || !e.target.files || e.target.files.length === 0) return;
    setUploadProgress(true);
    const file = e.target.files[0];
    
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const rawBase64 = reader.result as string;
        const uploadResponse = await apiRequest(`/api/issues/${selectedIssue.id}/attachments`, 'POST', {
          fileName: file.name,
          fileType: file.type,
          fileData: rawBase64
        });
        setAttachments([...attachments, uploadResponse]);
      } catch (err: any) {
        alert(err.message || 'File size is too big or failed to upload attachment.');
      } finally {
        setUploadProgress(false);
      }
    };
    reader.onerror = () => {
      alert('Failed reading chosen file contents.');
      setUploadProgress(false);
    };
    reader.readAsDataURL(file);
  };

  // Helper utility mapping User IDs to Names
  const findAssigneeName = (id: string | null) => {
    if (!id) return 'Unassigned';
    const match = users.find(u => u.id === id);
    return match ? match.name : 'Unknown User';
  };

  // Native React drag functions
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedIssueId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, status: IssueStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedIssueId;
    if (id) {
      updateIssueStatus(id, status);
      setDraggedIssueId(null);
    }
  };

  // Filter Issues logic
  const filteredIssuesList = issues.filter(issue => {
    const matchesSearch = 
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = priorityFilter === 'all' ? true : issue.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === 'all' 
      ? true 
      : (assigneeFilter === 'unassigned' ? !issue.assigneeId : issue.assigneeId === assigneeFilter);

    return matchesSearch && matchesPriority && matchesAssignee;
  });

  // Kanban column status definitions
  const columns: { id: IssueStatus; title: string; color: string; border: string; bg: string }[] = [
    { id: 'todo', title: 'To Do', color: 'text-zinc-600', border: 'border-zinc-200', bg: 'bg-zinc-100' },
    { id: 'in_progress', title: 'In Progress', color: 'text-blue-600', border: 'border-blue-200', bg: 'bg-blue-50/50' },
    { id: 'review', title: 'In Review', color: 'text-amber-600', border: 'border-amber-200', bg: 'bg-amber-50/50' },
    { id: 'done', title: 'Done', color: 'text-emerald-600', border: 'border-emerald-200', bg: 'bg-emerald-50/50' }
  ];

  // Helper priority stylers
  const getPriorityBadge = (prio: IssuePriority) => {
    switch (prio) {
      case 'critical':
        return <span className="bg-red-100 text-red-700 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Critical</span>;
      case 'high':
        return <span className="bg-orange-100 text-orange-700 text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">High</span>;
      case 'medium':
        return <span className="bg-blue-100 text-blue-700 text-[10px] font-mono px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">Medium</span>;
      default:
        return <span className="bg-zinc-100 text-zinc-600 text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider">Low</span>;
    }
  };

  // Rendering Loading Splash Screen
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white mb-4 animate-bounce">
          <KanbanSquare className="h-6 w-6" />
        </div>
        <h2 className="text-zinc-800 font-medium text-sm">Initializing Secure Issue Framework</h2>
        <p className="text-zinc-400 text-xs font-mono mt-1">Establishing token session credentials...</p>
      </div>
    );
  }

  // Auth Overlay / Prompt Login or Sign Up
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white border border-zinc-200 shadow-xl rounded-2xl w-full max-w-md overflow-hidden relative">
          
          {/* Header branding */}
          <div className="p-8 text-center bg-zinc-900 text-white flex flex-col items-center">
            <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center text-white mb-3">
              <KanbanSquare className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Personal Agile Workspace</h1>
            <p className="text-xs text-zinc-400 mt-1">Lightweight issue management and tracking</p>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex border-b border-zinc-200">
              <button 
                id="btn-login-tab"
                onClick={() => { setIsSignUp(false); setAuthError(null); }}
                className={`flex-1 pb-3 text-center text-xs font-mono uppercase tracking-wider font-semibold transition-colors ${!isSignUp ? 'border-b-2 border-zinc-900 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                Sign In
              </button>
              <button 
                id="btn-signup-tab"
                onClick={() => { setIsSignUp(true); setAuthError(null); }}
                className={`flex-1 pb-3 text-center text-xs font-mono uppercase tracking-wider font-semibold transition-colors ${isSignUp ? 'border-b-2 border-zinc-900 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                Register
              </button>
            </div>

            {authError && (
              <div className="bg-red-50 text-red-600 text-xs p-3.5 rounded-lg border border-red-100 flex gap-2 items-start font-mono">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-1 block">Full Name</label>
                  <input 
                    id="input-auth-name"
                    type="text" 
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 placeholder-zinc-400"
                    placeholder="Enter your first & last name"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-1 block">Email Address</label>
                <input 
                  id="input-auth-email"
                  type="email" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 placeholder-zinc-400"
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-1 block">Password</label>
                <input 
                  id="input-auth-password"
                  type="password" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500"
                  placeholder="••••••••••••"
                  required
                />
              </div>

              {isSignUp && (
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold mb-1 block">Assigned Workspace Role</label>
                  <select 
                    id="select-auth-role"
                    value={authRole}
                    onChange={(e) => setAuthRole(e.target.value as any)}
                    className="w-full text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 outline-none focus:border-zinc-400 font-mono"
                  >
                    <option value="user">User Role (Standard issue operations)</option>
                    <option value="admin">Administrator Role (Full cascade deletes)</option>
                  </select>
                </div>
              )}

              <button 
                id="btn-auth-submit"
                type="submit"
                className="w-full bg-zinc-900 border border-zinc-800 text-white font-medium hover:bg-zinc-800 rounded-lg px-4 py-2.5 text-xs font-mono uppercase tracking-widest mt-2 flex justify-center items-center gap-2"
              >
                {isSignUp ? 'Create Workspace Account' : 'Authenticate Credentials'}
                <ArrowRight className="h-3 w-3" />
              </button>
            </form>

            <div className="border-t border-zinc-100 pt-4 text-center">
              <span className="text-[10px] font-mono text-zinc-400">
                Self-contained persistence: JSON database is updated live at root
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Main UI Workspace Container
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 flex flex-col font-sans">
      
      {/* Top Bar Branding Navigation */}
      <header className="bg-white border-b border-zinc-200 shrink-0 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-bold text-sm tracking-tight text-zinc-900">
              <span className="h-8 w-8 bg-zinc-950 text-white flex items-center justify-center rounded-lg font-mono text-sm shadow-xs font-black">J</span>
              <span className="hidden sm:inline">Jira-like Board</span>
              <span className="bg-zinc-100 text-zinc-500 text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wide font-mono scale-95 font-medium ml-1">Personal v1</span>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              <button 
                id="nav-btn-kanban"
                onClick={() => setActiveTab('kanban')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'kanban' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'}`}
              >
                <KanbanSquare className="h-3.5 w-3.5" /> board
              </button>
              <button 
                id="nav-btn-dashboard"
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'dashboard' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'}`}
              >
                <BarChart3 className="h-3.5 w-3.5" /> report analytics
              </button>
              <button 
                id="nav-btn-projects"
                onClick={() => setActiveTab('projects')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'projects' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'}`}
              >
                <Folder className="h-3.5 w-3.5" /> workspaces list
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Profile info */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-zinc-800 truncate max-w-[120px]" title={user.name}>{user.name}</span>
              <span className="text-[10px] text-zinc-400 uppercase font-mono flex items-center justify-end gap-1">
                <Shield className="h-2.5 w-2.5" /> {user.role}
              </span>
            </div>

            <div className="h-8 w-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-600 border border-zinc-200 text-xs font-bold uppercase" title={`${user.name} (${user.role})`}>
              {user.name.substring(0, 2)}
            </div>

            <button 
              id="btn-logout"
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-850"
              title="Logout session"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mini Segment for Mobile view toggler only */}
      <div className="md:hidden bg-white border-b border-zinc-200 px-4 py-2 flex items-center justify-between shrink-0">
        <span className="text-xs font-mono uppercase tracking-wider font-semibold text-zinc-500">Navigation:</span>
        <div className="flex gap-1.5">
          <button id="mobile-btn-kanban" onClick={() => setActiveTab('kanban')} className={`px-2 py-1 rounded text-xs font-mono ${activeTab === 'kanban' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}>Board</button>
          <button id="mobile-btn-dashboard" onClick={() => setActiveTab('dashboard')} className={`px-2 py-1 rounded text-xs font-mono ${activeTab === 'dashboard' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}>Report</button>
          <button id="mobile-btn-projects" onClick={() => setActiveTab('projects')} className={`px-2 py-1 rounded text-xs font-mono ${activeTab === 'projects' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}>Projects</button>
        </div>
      </div>

      {/* Primary Outer Shell Container */}
      <main className="grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-hidden">
        
        {/* Workspace select header bar */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block">ACTIVE AGILE WORKSPACE</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <select 
                id="select-project-workspace"
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(e.target.value || null)}
                className="font-semibold text-lg text-zinc-900 outline-none bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg px-2 py-1"
              >
                {projects.length === 0 ? (
                  <option id="opt-no-projects-avail" value="">No projects, create one first</option>
                ) : (
                  projects.map(p => (
                    <option id={`opt-proj-${p.id}`} key={p.id} value={p.id}>{p.name}</option>
                  ))
                )}
              </select>
              {selectedProjectId && (
                <div className="flex gap-2">
                  <span className="text-zinc-300">/</span>
                  <p className="text-xs text-zinc-500 self-center max-w-[200px] truncate">
                    {projects.find(p => p.id === selectedProjectId)?.description || 'No description provided.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2.5 w-full sm:w-auto">
            <button 
              id="btn-trigger-new-project-modal"
              onClick={() => setIsProjectModalOpen(true)}
              className="flex-1 sm:flex-initial text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg text-xs font-semibold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              <Folder className="h-3.5 w-3.5" /> New Project
            </button>
            {selectedProjectId && (
              <button 
                id="btn-trigger-new-issue-modal"
                onClick={() => setIsIssueModalOpen(true)}
                className="flex-1 sm:flex-initial bg-zinc-900 hover:bg-zinc-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> File Ticket
              </button>
            )}
          </div>
        </div>

        {/* LOADING DATA BLOCK */}
        {isLoadingData && (
          <div className="text-center py-12 flex flex-col items-center justify-center text-zinc-400 gap-1 bg-white border border-zinc-100 rounded-xl">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-950 border-t-transparent mb-2"></div>
            <span className="text-xs font-mono">Syncing active database changes...</span>
          </div>
        )}

        {/* TAB WORKFLOWS DISPLAY ELEMENT */}
        {!isLoadingData && (
          <div className="grow flex flex-col min-h-0">
            
            {/* TAB CONTENT: KANBAN BOARD */}
            {activeTab === 'kanban' && (
              <div className="grow flex flex-col gap-4 min-h-0">
                
                {/* Board query filter metrics panel bar */}
                {selectedProjectId ? (
                  <div className="bg-white border border-zinc-200 rounded-xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
                    <div className="relative grow max-w-md">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                        <Search className="h-3.5 w-3.5" />
                      </div>
                      <input 
                        id="input-search-query-filter"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search key identifier or text match..."
                        className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg pl-8.5 pr-3 py-1.5 outline-none focus:border-zinc-400 placeholder-zinc-400"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-550">
                        <span>Prio:</span>
                        <select 
                          id="select-prio-query-filter"
                          value={priorityFilter}
                          onChange={(e) => setPriorityFilter(e.target.value)}
                          className="bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-xs outline-none"
                        >
                          <option value="all">All Priorities</option>
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-550">
                        <span>Assignee:</span>
                        <select 
                          id="select-assignee-query-filter"
                          value={assigneeFilter}
                          onChange={(e) => setAssigneeFilter(e.target.value)}
                          className="bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-xs outline-none"
                        >
                          <option value="all">All Assignees</option>
                          <option value="unassigned">Unassigned Only</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>

                      {(searchQuery || priorityFilter !== 'all' || assigneeFilter !== 'all') && (
                        <button 
                          id="btn-clear-query-filters"
                          onClick={() => { setSearchQuery(''); setPriorityFilter('all'); setAssigneeFilter('all'); }}
                          className="bg-zinc-105 select-priority text-[10px] text-zinc-600 font-mono px-2 py-1 rounded hover:bg-zinc-150 transition-all font-semibold"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Main Grid element containing column categories */}
                {!selectedProjectId ? (
                  <div className="bg-white border border-zinc-200 rounded-2xl p-16 text-center space-y-4 shadow-xs">
                    <div className="h-12 w-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 mx-auto">
                      <Folder className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900">No project selected</h3>
                      <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">Get started by creating a workspace where issues can be added and categorized into boards.</p>
                    </div>
                    <button 
                      id="btn-welcome-create-proj"
                      onClick={() => setIsProjectModalOpen(true)}
                      className="bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 rounded-lg px-4 py-2 text-xs font-mono uppercase tracking-widest font-semibold"
                    >
                      Establish Your First Project
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start overflow-x-auto grow min-h-0 [scrollbar-width:thin]">
                    {columns.map(col => {
                      const colIssues = filteredIssuesList.filter(i => i.status === col.id);
                      return (
                        <div 
                          id={`col-status-${col.id}`}
                          key={col.id} 
                          onDragOver={onDragOver}
                          onDrop={(e) => onDrop(e, col.id)}
                          className="flex flex-col max-h-full min-w-[250px] shrink-0"
                        >
                          {/* Column Title Header */}
                          <div className={`p-3 rounded-t-xl border-t border-x border-zinc-200 bg-white font-mono text-xs flex justify-between items-center ${col.color}`}>
                            <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <span className={`inline-block w-2 h-2 rounded-full ${col.id === 'todo' ? 'bg-zinc-400' : col.id === 'in_progress' ? 'bg-blue-500' : col.id === 'review' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                              {col.title}
                            </span>
                            <span className="bg-zinc-100 text-zinc-500 rounded-full px-2 py-0.5 text-[10px] font-bold">
                              {colIssues.length}
                            </span>
                          </div>

                          {/* Cards List container body drop zone */}
                          <div className={`flex-1 overflow-y-auto p-2 space-y-2.5 rounded-b-xl border-x border-b border-zinc-200 ${col.bg} p-2.5 min-h-[400px]`}>
                            {colIssues.length === 0 ? (
                              <div className="text-center py-10 text-zinc-450 text-[10px] uppercase font-mono border border-dashed border-zinc-200/60 rounded-xl bg-white/40">
                                Drop tickets here
                              </div>
                            ) : (
                              colIssues.map(issue => (
                                <div 
                                  id={`issue-card-${issue.id}`}
                                  key={issue.id}
                                  draggable="true"
                                  onDragStart={(e) => onDragStart(e, issue.id)}
                                  onClick={() => viewIssueDetailsModal(issue)}
                                  className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs hover:border-zinc-400 hover:shadow-xs cursor-pointer select-none transition-all duration-150 transform hover:-translate-y-0.5 group active:cursor-grabbing"
                                >
                                  {/* Top key identifier & Priority layout banner */}
                                  <div className="flex justify-between items-start mb-1.5">
                                    <span className="text-[10px] font-mono text-zinc-400 font-bold group-hover:text-zinc-600 transition-colors uppercase">
                                      {issue.id}
                                    </span>
                                    {getPriorityBadge(issue.priority)}
                                  </div>

                                  {/* Title content */}
                                  <h4 className="font-semibold text-xs text-zinc-900 group-hover:text-zinc-950 transition-colors tracking-tight line-clamp-2">
                                    {issue.title}
                                  </h4>

                                  {/* Description Snippet preview */}
                                  {issue.description && (
                                    <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2 font-sans leading-relaxed">
                                      {issue.description}
                                    </p>
                                  )}

                                  {/* Assignee Footer metrics indicator */}
                                  <div className="flex justify-between items-center pt-3 border-t border-zinc-100 mt-3 text-[10px] text-zinc-400 font-mono">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>{issue.dueDate ? new Date(issue.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'No Date'}</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-zinc-50 px-1.5 py-0.5 border border-zinc-150 rounded">
                                      <UserIcon className="h-3 w-3 text-zinc-400" />
                                      <span className="text-zinc-650 max-w-[80px] truncate" title={findAssigneeName(issue.assigneeId)}>
                                        {findAssigneeName(issue.assigneeId)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: REPORTING DASHBOARD */}
            {activeTab === 'dashboard' && (
              <ReportingDashboard projectId={selectedProjectId} />
            )}

            {/* TAB CONTENT: PROJECTS DIRECTORY PREFERENCE */}
            {activeTab === 'projects' && (
              <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Project Workspace Directories</h3>
                  <p className="text-xs text-zinc-500 mt-1">Review active workspaces. System administrators and workspace creators can execute cascade deletions.</p>
                </div>

                <div className="space-y-3">
                  {projects.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-zinc-200 rounded-xl text-zinc-400 text-xs font-mono">
                      No projects exist yet. Establish one to start tracking.
                    </div>
                  ) : (
                    projects.map(proj => {
                      const isCreator = proj.createdBy === user.id;
                      const isAdmin = user.role === 'admin';
                      return (
                        <div id={`proj-row-${proj.id}`} key={proj.id} className="border border-zinc-200 rounded-xl p-4 flex items-center justify-between gap-4 bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-zinc-900">{proj.name}</h4>
                              <span className="text-[10px] font-mono bg-zinc-100 text-zinc-500 px-1.5 py-0.2 rounded uppercase">{proj.id}</span>
                            </div>
                            <p className="text-xs text-zinc-550">{proj.description || 'No description provided.'}</p>
                            <span className="text-[10px] text-zinc-400 font-mono block">
                              Created on {new Date(proj.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button 
                              id={`btn-select-proj-${proj.id}`}
                              onClick={() => { setSelectedProjectId(proj.id); setActiveTab('kanban'); }}
                              className="bg-white hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-800 font-mono"
                            >
                              Open Board
                            </button>
                            {(isCreator || isAdmin) && (
                              <button 
                                id={`btn-delete-proj-${proj.id}`}
                                onClick={() => deleteProject(proj.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-650 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg shrink-0 transition-colors"
                                title="Delete Project Workspaces and Cascading Items"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-zinc-200 p-4 font-mono text-[10px] text-zinc-400 text-center shrink-0">
        <div>
          <span>Personal Agile Tracker Workspace &bull; Local JSON Schema Layer Enabled &bull; {new Date().getFullYear()}</span>
        </div>
      </footer>


      {/* ========================================================== */}
      {/* DIALOG MODALS SECTION (PROJECTS, DETAILS, ISSUES)       */}
      {/* ========================================================== */}

      {/* CREATE PROJECT MODAL */}
      {isProjectModalOpen && (
        <div id="modal-create-project" className="fixed inset-0 bg-transparent/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-zinc-200 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-100">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Folder className="h-4 w-4" /> Establish Dedicated Project Workspace
              </h3>
              <button 
                id="btn-close-project-modal"
                onClick={() => setIsProjectModalOpen(false)} 
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-550 block mb-1 font-semibold">Workspace / Project name</label>
                <input 
                  id="input-new-project-name"
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Next-Gen Mobile App Development"
                  className="w-full text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-zinc-500 placeholder-zinc-400 font-medium text-zinc-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-555 block mb-1 font-semibold">Purpose Description</label>
                <textarea 
                  id="textarea-new-project-description"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  rows={3}
                  placeholder="Summarize objectives, goals, and workflow tracking definitions..."
                  className="w-full text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-zinc-500 placeholder-zinc-400 text-zinc-655"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button 
                  id="btn-cancel-project-creation"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-3.5 py-2 border border-zinc-250 text-zinc-600 rounded-lg text-xs font-semibold hover:bg-zinc-50 transition-colors font-mono"
                >
                  Cancel
                </button>
                <button 
                  id="btn-confirm-project-creation"
                  onClick={createProject}
                  disabled={!newProjectName.trim()}
                  className="bg-zinc-900 text-white px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* CREATE ISSUE / TICKET TICKET MODAL */}
      {isIssueModalOpen && (
        <div id="modal-create-issue" className="fixed inset-0 bg-transparent/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-zinc-200 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-100">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ListTodo className="h-4 w-4" /> File New Tracking Ticket
              </h3>
              <button 
                id="btn-close-issue-modal"
                onClick={() => setIsIssueModalOpen(false)} 
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-550 block mb-1 font-semibold">Ticket Subject / Title</label>
                <input 
                  id="input-new-issue-title"
                  type="text"
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  placeholder="e.g. Implement authentication endpoints on API server"
                  className="w-full text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 placeholder-zinc-450 font-medium text-zinc-800"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-550 block mb-1 font-semibold">Scope Details</label>
                <textarea 
                  id="textarea-new-issue-description"
                  value={newIssueDesc}
                  onChange={(e) => setNewIssueDesc(e.target.value)}
                  rows={4}
                  placeholder="Provide precise details, steps to reproduce, or technical context..."
                  className="w-full text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-zinc-500 placeholder-zinc-450 text-zinc-650"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-550 block mb-1 font-semibold">Priority Severity</label>
                  <select 
                    id="select-new-issue-priority"
                    value={newIssuePriority}
                    onChange={(e) => setNewIssuePriority(e.target.value as any)}
                    className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 outline-none cursor-pointer"
                  >
                    <option value="low">Low Severity</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="critical">Critical Core Block</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-550 block mb-1 font-semibold">Assign Owner</label>
                  <select 
                    id="select-new-issue-assignee"
                    value={newIssueAssignee}
                    onChange={(e) => setNewIssueAssignee(e.target.value)}
                    className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 outline-none cursor-pointer"
                  >
                    <option value="">Leave Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-550 block mb-1 font-semibold">Target Due Date</label>
                  <input 
                    id="input-new-issue-duedate"
                    type="date"
                    value={newIssueDueDate}
                    onChange={(e) => setNewIssueDueDate(e.target.value)}
                    className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 outline-none text-zinc-600 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button 
                  id="btn-cancel-issue-creation"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-3.5 py-2 border border-zinc-200 text-zinc-600 rounded-lg text-xs font-semibold hover:bg-zinc-50 transition-colors font-mono"
                >
                  Cancel
                </button>
                <button 
                  id="btn-confirm-issue-creation"
                  onClick={createIssue}
                  disabled={!newIssueTitle.trim()}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                >
                  Generate Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* TICKET DETAILS / COMMENTS / ATTACHMENT DETAILS MODAL SIDEBAR */}
      {selectedIssue && (
        <div id="modal-issue-details" className="fixed inset-0 bg-transparent/40 backdrop-blur-xs flex items-center justify-end z-50 animate-in fade-in duration-200">
          <div className="bg-white border-l border-zinc-200 shadow-2xl w-full max-w-2xl h-full flex flex-col animate-in slide-in-from-right duration-250">
            
            {/* Header toolbar */}
            <div className="p-4 border-b border-zinc-150 bg-zinc-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-400 bg-white/10 px-2.5 py-0.5 rounded uppercase font-bold tracking-wider">{selectedIssue.id}</span>
                <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wide">Workspace Ticket Context</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  id="btn-detail-trash-ticket"
                  onClick={() => deleteActiveIssue(selectedIssue.id)}
                  className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-red-500 rounded-lg shrink-0"
                  title="Remove ticket permanently"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button 
                  id="btn-detail-close-modal"
                  onClick={() => setSelectedIssue(null)} 
                  className="p-1.5 hover:bg-white/10 text-zinc-3 w-4 rounded-lg text-zinc-300 hover:text-white"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Scrollable multi-pane detailed area */}
            <div className="grow overflow-y-auto p-6 space-y-6">
              
              {/* Title Section */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block font-bold">Ticket title / Subject</label>
                <input 
                  id="input-edit-issue-title"
                  type="text"
                  value={selectedIssue.title}
                  onChange={(e) => editIssueDetails({ title: e.target.value })}
                  className="w-full font-bold text-lg text-zinc-900 bg-transparent hover:bg-zinc-50 border border-transparent hover:border-zinc-200 rounded p-1.5 outline-none focus:bg-white focus:border-zinc-400"
                />
              </div>

              {/* Status and Parameters controls pane */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                
                {/* Board Column status control */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Board Status</span>
                  <select 
                    id="select-edit-issue-status"
                    value={selectedIssue.status}
                    onChange={(e) => updateIssueStatus(selectedIssue.id, e.target.value as any)}
                    className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs font-semibold text-zinc-700 outline-none"
                  >
                    <option value="todo">To Do Pipeline</option>
                    <option value="in_progress">In Progress Dev</option>
                    <option value="review">Work Review Underway</option>
                    <option value="done">Completed & Done</option>
                  </select>
                </div>

                {/* Priority severity controller */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Priority Weight</span>
                  <select 
                    id="select-edit-issue-priority"
                    value={selectedIssue.priority}
                    onChange={(e) => editIssueDetails({ priority: e.target.value as any })}
                    className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs font-semibold text-zinc-750 outline-none"
                  >
                    <option value="low">Low Severity</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="critical">Critical Core Block</option>
                  </select>
                </div>

                {/* Owner Assignee control */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-semibold">Assigned Owner</span>
                  <select 
                    id="select-edit-issue-assignee"
                    value={selectedIssue.assigneeId || ''}
                    onChange={(e) => editIssueDetails({ assigneeId: e.target.value || null })}
                    className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs font-medium text-zinc-700 outline-none"
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* Target Due date update */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-semibold">Target Due Date</span>
                  <input 
                    id="input-edit-issue-duedate"
                    type="date"
                    value={selectedIssue.dueDate || ''}
                    onChange={(e) => editIssueDetails({ dueDate: e.target.value || null })}
                    className="w-full bg-white border border-zinc-200 rounded-lg p-1.5 text-xs font-mono text-zinc-650 outline-none"
                  />
                </div>
              </div>

              {/* Description Content Section */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block font-bold">Scope Context / Description</label>
                <textarea 
                  id="textarea-edit-issue-description"
                  value={selectedIssue.description}
                  onChange={(e) => editIssueDetails({ description: e.target.value })}
                  rows={4}
                  placeholder="Summarize instructions, constraints or code details here..."
                  className="w-full text-xs text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-transparent hover:border-zinc-200 rounded p-2 outline-none focus:bg-white focus:border-zinc-400"
                />
              </div>

              {/* Attachments Section */}
              <div className="space-y-3 pt-4 border-t border-zinc-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" /> Associated Files ({attachments.length})
                  </span>
                  
                  {/* Native upload button trigger */}
                  <label className="cursor-pointer bg-zinc-100 hover:bg-zinc-200 text-zinc-720 border border-zinc-250 rounded px-2.5 py-1 text-[10px] font-semibold font-mono uppercase tracking-widest transition-colors">
                    Upload
                    <input 
                      id="input-attachment-file-upload"
                      type="file"
                      onChange={handleAttachmentUpload}
                      className="hidden"
                      disabled={uploadProgress}
                    />
                  </label>
                </div>

                {uploadProgress && (
                  <div className="text-center text-[10px] font-mono text-blue-600 animate-pulse bg-blue-50 py-1.5 rounded">
                    Sending raw files binary structures to local DB filesystem...
                  </div>
                )}

                {attachments.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 font-mono italic">No reference attachments included in this ticket.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {attachments.map(att => (
                      <div id={`attachment-${att.id}`} key={att.id} className="border border-zinc-205 rounded-lg p-2 flex items-center gap-2.5 bg-zinc-50 hover:bg-zinc-100 transition-colors text-xs overflow-hidden">
                        <FileText className="h-4 w-4 text-zinc-500 shrink-0" />
                        <div className="grow min-w-0">
                          <p className="font-semibold text-zinc-800 truncate" title={att.fileName}>{att.fileName}</p>
                          <span className="text-[9px] text-zinc-400 uppercase font-mono block tracking-wide">{att.fileType?.split('/')[1] || 'binary'}</span>
                        </div>
                        <a 
                          id={`link-download-attachment-${att.id}`}
                          href={`/api/attachments/${att.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] bg-white hover:bg-zinc-200 border border-zinc-200 px-2 py-1 rounded font-mono shrink-0 font-bold"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Remarks System Comments area */}
              <div className="space-y-4 pt-4 border-t border-zinc-200">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Comments & Discussion Feed ({comments.length})
                </span>

                {/* Listing of message items */}
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-[11px] text-zinc-400 font-mono italic py-4 text-center">No comments have been posted yet. Start the conversation!</p>
                  ) : (
                    comments.map(c => (
                      <div id={`comment-${c.id}`} key={c.id} className="bg-zinc-50 border border-zinc-150 rounded-xl p-3 space-y-1 text-xs">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="font-semibold text-zinc-805 uppercase shrink-0">{c.userName}</span>
                          <span className="text-zinc-400">{new Date(c.createdAt).toLocaleDateString()} at {new Date(c.createdAt).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="text-zinc-700 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Post Remark Action Box */}
                <div className="flex gap-2">
                  <textarea 
                    id="textarea-post-comment-text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    rows={2}
                    placeholder="Contribute ideas, ask clarifying questions, or provide updates..."
                    className="grow text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 resize-none outline-none focus:border-zinc-400"
                  />
                  <button 
                    id="btn-post-comment-submit"
                    onClick={postComment}
                    disabled={!newCommentText.trim()}
                    className="bg-zinc-900 text-white px-3 py-2 rounded-lg text-xs font-bold font-mono uppercase hover:bg-zinc-850 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-800 shrink-0 self-end transition-colors"
                  >
                    Post
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
