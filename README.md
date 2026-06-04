# Lightweight Jira-like Issue Tracker

A high-performance, self-contained project management and task boards tool designed with fully-featured Kanban dragging, comment sections, base64 file transfers, dynamic workload metrics reporting, and role-based user management.

## 🚀 Features Core
- **Robust User Authentication**: Standard HMAC-SHA256 based JWT context state. Supports `Admin` and `User` roles.
- **Project Selection Workspace**: Multi-workspace management. Cascade deletes clean up all issues, comments, and file indices atomically.
- **Kanban Board**: Clean visual lists (To Do, In Progress, In Review, Done) with native HTML5 Drag and Drop event bindings.
- **Surgical Details Panel**: Live modification of priorities (`low` to `critical`), status pipelines, assignment owners, and due dates.
- **Remarks & File Attachments**: base64 attachment serialization and native streamed file viewing natively in browsers.
- **Metrics Dashboard**: Direct reporting statistics including task volume progress indicators, priority meters, and assignee workloads.

---

## 🛠️ Tech Stack & Architecture
- **Frontend Layer**: React 19 + Tailwind CSS 4.0 utility styling + Lucide Vector icon design.
- **Backend Service Layer**: Node.js + Express + Custom cryptographically verified JWT tokens.
- **Database Engine**: Multi-tiered! 
  - Standard development utilizes our fast, zero-install, transactionally-safe `db.json` layer written atomically to the local disk.
  - Production-ready PostgreSQL translation schema is mapped inside `/schema.sql`.

---

## 💻 Running Locally

### Option 1: Running with npm (Zero-Dependency Startup)

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Establish Environment configuration**:
   Create a local `.env` file (referencing `.env.example` file setup):
   ```env
   # Node Server execution
   JWT_SECRET="any-custom-hmac-sha-256-key-of-preference"
   ```

3. **Start Development Hot Reload**:
   ```bash
   npm run dev
   ```
   This fires up the high-speed Node express router and Vite build middleware at http://localhost:3000.

4. **Production Compilation**:
   ```bash
   npm run build
   npm start
   ```

---

## 🐳 Option 2: Docker Environment Deployment

For complete ecosystem containerization (bundling both Node and Vite outputs together):

1. **Create a standard `Dockerfile`**:
   ```dockerfile
   # --- Multi-Stage Build Layer ---
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   # --- Active Runtime Layer ---
   FROM node:20-alpine AS runner
   WORKDIR /app
   ENV NODE_ENV=production
   COPY package*.json ./
   RUN npm ci --only=production
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/server-db.ts ./server-db.ts
   COPY --from=builder /app/src/types.ts ./src/types.ts
   COPY --from=builder /app/server.ts ./server.ts
   
   # Enable quick TSX parsing for production fast-start
   RUN npm install -g tsx
   EXPOSE 3000
   CMD ["tsx", "server.ts"]
   ```

2. **Execute building**:
   ```bash
   docker build -t jira-issue-tracker .
   docker run -p 3000:3000 -e JWT_SECRET="your-key" jira-issue-tracker
   ```
   Access your containerized tracker locally at `http://localhost:3000`!
