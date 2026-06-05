import express from 'express';
import http from 'http';
import path from 'path';
import {
  readDatabase,
  writeDatabase,
  hashPassword,
  comparePassword,
  signJWT,
  verifyJWT,
  generateId
} from './server-db';
import { Issue, Project, Comment, Attachment, ProjectStatistics, IssuePriority, IssueStatus } from './src/types';

// Fast server startup initialization
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// High limit JSON body parser to cleanly handle rich attachments as base64 lines
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Express route logs for fast development tracing
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// Authentication middleware using our native cryptographic JWT verification
function reqAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Header: Authorization Bearer <token>' });
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyJWT(token);
  if (!payload) {
    return res.status(401).json({ error: 'Session expired or token invalid. Please log in again.' });
  }
  req.user = payload;
  next();
}

// ==========================================
// AUTH ENTRIES
// ==========================================

// Register a new user
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing credentials. Name, Email, and Password are required.' });
  }

  const db = await readDatabase();
  const normalizedEmail = email.toLowerCase().trim();
  
  if (db.users.find(u => u.email.toLowerCase() === normalizedEmail)) {
    return res.status(400).json({ error: 'A user with this email address already exists.' });
  }

  // Choose role: Default to user. If first user, make admin, otherwise use chosen role
  const isFirstUser = db.users.length === 0;
  const userRole: 'admin' | 'user' = isFirstUser ? 'admin' : (role === 'admin' ? 'admin' : 'user');

  const newUser = {
    id: generateId('USER'),
    email: normalizedEmail,
    name: name.trim(),
    role: userRole,
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(password)
  };

  db.users.push(newUser);
  await writeDatabase(db);

  const { passwordHash, ...userProfile } = newUser;
  const token = signJWT({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name });

  res.status(201).json({ token, user: userProfile });
});

// Authenticate and retrieve token
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Parameters email and password are required.' });
  }

  const db = await readDatabase();
  const normalizedEmail = email.toLowerCase().trim();
  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user || !comparePassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email address or password configuration.' });
  }

  const { passwordHash, ...userProfile } = user;
  const token = signJWT({ id: user.id, email: user.email, role: user.role, name: user.name });

  res.json({ token, user: userProfile });
});

// Retrieve current session identification
app.get('/api/auth/me', reqAuth, async (req: any, res) => {
  const db = await readDatabase();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Active user context no longer found.' });
  }
  const { passwordHash, ...userProfile } = user;
  res.json(userProfile);
});

// Retrieve all system users for issue assignees list
app.get('/api/users', reqAuth, async (req, res) => {
  const db = await readDatabase();
  const sanitizedUsers = db.users.map(({ passwordHash, ...rest }) => rest);
  res.json(sanitizedUsers);
});


// ==========================================
// PROJECT ROUTES
// ==========================================

// Retrieve projects
app.get('/api/projects', reqAuth, async (req, res) => {
  const db = await readDatabase();
  res.json(db.projects);
});

// Create project
app.post('/api/projects', reqAuth, async (req: any, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Project name is required.' });
  }

  const db = await readDatabase();
  const newProject: Project = {
    id: generateId('PROJ'),
    name: name.trim(),
    description: (description || '').trim(),
    createdAt: new Date().toISOString(),
    createdBy: req.user.id
  };

  db.projects.push(newProject);
  await writeDatabase(db);

  res.status(201).json(newProject);
});

// Delete project and clean up cascading data structures
app.delete('/api/projects/:projectId', reqAuth, async (req: any, res) => {
  const { projectId } = req.params;
  const db = await readDatabase();
  
  const projectIdx = db.projects.findIndex(p => p.id === projectId);
  if (projectIdx === -1) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  const project = db.projects[projectIdx];
  // Require to be Admin or Creator to perform deletion
  if (req.user.role !== 'admin' && project.createdBy !== req.user.id) {
    return res.status(403).json({ error: 'Access Denied: Only project creators or administrators can delete projects.' });
  }

  // Extract related issues
  const relatedIssueIds = db.issues.filter(i => i.projectId === projectId).map(i => i.id);

  // Filter lists
  db.projects.splice(projectIdx, 1);
  db.issues = db.issues.filter(i => i.projectId !== projectId);
  db.comments = db.comments.filter(c => !relatedIssueIds.includes(c.issueId));
  db.attachments = db.attachments.filter(a => !relatedIssueIds.includes(a.issueId));

  await writeDatabase(db);
  res.json({ message: 'Project and all cascade issues, files, commentary successfully deleted.' });
});


// ==========================================
// ISSUE ROUTES
// ==========================================

// Retrieve issues inside a project
app.get('/api/projects/:projectId/issues', reqAuth, async (req, res) => {
  const { projectId } = req.params;
  const db = await readDatabase();
  const projectIssues = db.issues.filter(i => i.projectId === projectId);
  res.json(projectIssues);
});

// Create a new issue
app.post('/api/projects/:projectId/issues', reqAuth, async (req: any, res) => {
  const { projectId } = req.params;
  const { title, description, status, priority, assigneeId, dueDate } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Issue title is required.' });
  }

  const db = await readDatabase();
  // Confirm project validation
  if (!db.projects.find(p => p.id === projectId)) {
    return res.status(404).json({ error: 'Target project does not exist.' });
  }

  const validStatuses: IssueStatus[] = ['todo', 'in_progress', 'review', 'done'];
  const validPriorities: IssuePriority[] = ['low', 'medium', 'high', 'critical'];

  const newIssue: Issue = {
    id: generateId('TASK'),
    projectId,
    title: title.trim(),
    description: (description || '').trim(),
    status: validStatuses.includes(status) ? status : 'todo',
    priority: validPriorities.includes(priority) ? priority : 'medium',
    assigneeId: assigneeId || null,
    reporterId: req.user.id,
    dueDate: dueDate || null,
    createdAt: new Date().toISOString()
  };

  db.issues.push(newIssue);
  await writeDatabase(db);

  res.status(201).json(newIssue);
});

// Update fields of an issue (Kanban board update triggers status changes etc.)
app.patch('/api/issues/:issueId', reqAuth, async (req, res) => {
  const { issueId } = req.params;
  const { title, description, status, priority, assigneeId, dueDate } = req.body;

  const db = await readDatabase();
  const targetIdx = db.issues.findIndex(i => i.id === issueId);
  if (targetIdx === -1) {
    return res.status(404).json({ error: 'Target issue not found' });
  }

  const issue = db.issues[targetIdx];

  // Apply sanitizations
  if (title !== undefined) issue.title = title.trim();
  if (description !== undefined) issue.description = description.trim();
  if (status !== undefined) {
    const validStatuses: IssueStatus[] = ['todo', 'in_progress', 'review', 'done'];
    if (validStatuses.includes(status)) {
      issue.status = status;
    }
  }
  if (priority !== undefined) {
    const validPriorities: IssuePriority[] = ['low', 'medium', 'high', 'critical'];
    if (validPriorities.includes(priority)) {
      issue.priority = priority;
    }
  }
  if (assigneeId !== undefined) {
    issue.assigneeId = assigneeId || null;
  }
  if (dueDate !== undefined) {
    issue.dueDate = dueDate || null;
  }

  db.issues[targetIdx] = issue;
  await writeDatabase(db);

  res.json(issue);
});

// Delete issue
app.delete('/api/issues/:issueId', reqAuth, async (req, res) => {
  const { issueId } = req.params;
  const db = await readDatabase();
  
  const targetIdx = db.issues.findIndex(i => i.id === issueId);
  if (targetIdx === -1) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  db.issues.splice(targetIdx, 1);
  db.comments = db.comments.filter(c => c.issueId !== issueId);
  db.attachments = db.attachments.filter(a => a.issueId !== issueId);

  await writeDatabase(db);
  res.json({ message: 'Issue and associated remarks, logs successfully cleaned up.' });
});


// ==========================================
// COMMENTS SECTION
// ==========================================

// List comments
app.get('/api/issues/:issueId/comments', reqAuth, async (req, res) => {
  const { issueId } = req.params;
  const db = await readDatabase();
  const issueComments = db.comments.filter(c => c.issueId === issueId);
  res.json(issueComments);
});

// Post a comment
app.post('/api/issues/:issueId/comments', reqAuth, async (req: any, res) => {
  const { issueId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment body content cannot be empty.' });
  }

  const db = await readDatabase();
  if (!db.issues.find(i => i.id === issueId)) {
    return res.status(404).json({ error: 'Target issue not found' });
  }

  const newComment: Comment = {
    id: generateId('CMNT'),
    issueId,
    userId: req.user.id,
    userName: req.user.name,
    content: content.trim(),
    createdAt: new Date().toISOString()
  };

  db.comments.push(newComment);
  await writeDatabase(db);

  res.status(201).json(newComment);
});


// ==========================================
// ATTACHMENTS SECTION
// ==========================================

// List issue attachments metadata (excluding large base64 fileData payload to optimize state exchange)
app.get('/api/issues/:issueId/attachments', reqAuth, async (req, res) => {
  const { issueId } = req.params;
  const db = await readDatabase();
  const attachmentsList = db.attachments
    .filter(a => a.issueId === issueId)
    .map(({ fileData, ...meta }) => meta); // strip fileData to keep list responses light
    
  res.json(attachmentsList);
});

// Post a new attachment
app.post('/api/issues/:issueId/attachments', reqAuth, async (req, res) => {
  const { issueId } = req.params;
  const { fileName, fileType, fileData } = req.body;

  if (!fileName || !fileType || !fileData) {
    return res.status(400).json({ error: 'File structures (fileName, fileType, and fileData as base64) are required.' });
  }

  const db = await readDatabase();
  if (!db.issues.find(i => i.id === issueId)) {
    return res.status(404).json({ error: 'Target issue not found' });
  }

  const newAttachment: Attachment = {
    id: generateId('FILE'),
    issueId,
    fileName,
    fileType,
    fileData,
    createdAt: new Date().toISOString()
  };

  db.attachments.push(newAttachment);
  await writeDatabase(db);

  // Return attachment info excluding heavy binary strings
  const { fileData: ignored, ...responseMeta } = newAttachment;
  res.status(201).json(responseMeta);
});

// Download/View attachment natively in browser stream
app.get('/api/attachments/:attachmentId/download', reqAuth, async (req, res) => {
  const { attachmentId } = req.params;
  const db = await readDatabase();
  
  const attachment = db.attachments.find(a => a.id === attachmentId);
  if (!attachment) {
    return res.status(404).json({ error: 'Attachment file not found.' });
  }

  try {
    // base64 parsing (handling base64 headers if present, or raw base64 string directly)
    let base64String = attachment.fileData;
    if (base64String.includes(';base64,')) {
      base64String = base64String.split(';base64,')[1];
    }
    const buffer = Buffer.from(base64String, 'base64');

    res.setHeader('Content-Type', attachment.fileType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.fileName)}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Download decode error:', error);
    res.status(500).json({ error: 'Failed to access or decode attachment content.' });
  }
});


// ==========================================
// METRICS & REPORTING DASHBOARD
// ==========================================
app.get('/api/dashboard', reqAuth, async (req, res) => {
  const { projectId } = req.query;
  const db = await readDatabase();

  // Filter issues based on context
  const filteredIssues = projectId
    ? db.issues.filter(i => i.projectId === projectId as string)
    : db.issues;

  const todoCount = filteredIssues.filter(i => i.status === 'todo').length;
  const inProgressCount = filteredIssues.filter(i => i.status === 'in_progress').length;
  const reviewCount = filteredIssues.filter(i => i.status === 'review').length;
  const doneCount = filteredIssues.filter(i => i.status === 'done').length;

  const highPriorityCount = filteredIssues.filter(i => i.priority === 'high' || i.priority === 'critical').length;
  const totalIssuesCount = filteredIssues.length;

  // Compute assignee distribution counts
  const assigneeMap: Record<string, number> = {};
  filteredIssues.forEach(issue => {
    const key = issue.assigneeId || 'Unassigned';
    assigneeMap[key] = (assigneeMap[key] || 0) + 1;
  });

  // Convert assignee ID keys to readable Names for convenient rendering
  const assigneeDistribution: Record<string, number> = {};
  for (const [key, count] of Object.entries(assigneeMap)) {
    if (key === 'Unassigned') {
      assigneeDistribution['Unassigned'] = count;
    } else {
      const user = db.users.find(u => u.id === key);
      const name = user ? user.name : 'Unknown User';
      assigneeDistribution[name] = count;
    }
  }

  const reports: ProjectStatistics = {
    todoCount,
    inProgressCount,
    reviewCount,
    doneCount,
    highPriorityCount,
    totalIssuesCount,
    assigneeDistribution
  };

  res.json(reports);
});


// ==========================================
// VITE AND SITE STATIC SERVING
// ==========================================
async function startServer() {
  if (!process.env.VERCEL) {
    const httpServer = http.createServer(app);

    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: { server: httpServer }
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server successfully started. Running active on: http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
