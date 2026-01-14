# DocForge-1.0

DocForge-1.0 is a full-stack document management platform designed for developers and technical teams.  
It provides structured storage, versioning, and fast retrieval of technical documentation such as API specs, design notes, and engineering references.

The goal is simple: **never lose knowledge again**.

---

## 🚀 Features

### Core Functionality
- Secure document upload and storage
- Organize documents by language, framework, category, and tags
- Full-text search and advanced filtering
- Document version tracking and change history
- Role-based user access (admin / user)

### Advanced Capabilities
- Collaborative editing
- Export documents to PDF or Markdown
- API documentation integration
- Analytics dashboard for document usage

---

## 🧱 Tech Stack

### Frontend
- React (TypeScript)
- Tailwind CSS or Material UI
- Responsive, component-based UI

### Backend
- Node.js (Express) **or** Python (FastAPI / Django)
- RESTful API architecture
- JWT-based authentication

### Database & Storage
- PostgreSQL or MongoDB
- Redis for caching
- Local file storage or cloud storage (AWS S3 / GCS)

## 🛠️ Development Roadmap

### Phase 1 — MVP
- User authentication
- Document upload and viewing
- Basic search
- File storage integration

### Phase 2 — Enhanced Features
- Advanced search and filters
- Tagging system
- Document versioning
- User roles

### Phase 3 — Advanced Features
- Collaborative editing
- Export tools
- Analytics dashboard
- API integrations

---

## 🔐 Security Considerations
- Input validation and sanitization
- File type and size restrictions
- Rate limiting
- Secure authentication with JWT or OAuth
- Proper access control enforcement

---

## ⚡ Performance & Scalability
- Indexed database queries
- Redis caching for frequent access
- Pagination for large datasets
- CDN support for static assets
- Architecture designed to support future microservices

---

## 🧪 Testing
- Unit tests for backend logic
- Integration tests for API endpoints
- Frontend component testing
- Security and performance testing before deployment

---

## 📦 Installation (Development)

### Phase 1 MVP Setup

1. **Clone and navigate to the web directory**
   ```bash
   git clone https://github.com/yourusername/DocForge-1.0.git
   cd DocForge-1.0/web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy `env.example` to `.env.local`
   - Add your Supabase credentials:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     ```

4. **Enable OAuth providers in Supabase**
   - Go to Authentication > Providers in your Supabase dashboard
   - Enable Google and/or GitHub OAuth
   - Add redirect URL: `http://localhost:3000/auth/callback`
   - For production, add your production URL callback

5. **Run database migrations**
   - Open Supabase SQL Editor
   - Copy and paste the contents of `supabase/schema.sql`
   - Execute the SQL to create tables, indexes, and RLS policies

6. **Start the development server**
   ```bash
   npm run dev
   ```
   
7. **Open the app**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Sign in with Google or GitHub
   - Upload documents and test search functionality

### Important Notes for Phase 1

- **Local Storage**: Files are saved to `web/public/uploads/` for development. This folder is created automatically.
- **File Limits**: Maximum 10MB per file. Allowed types: PDF, TXT, MD, DOC, DOCX, PNG, JPG, JPEG, GIF.
- **Row-Level Security**: Documents are scoped to the authenticated user via Supabase RLS policies.
- **Production**: For production deployment, replace local file storage with Supabase Storage or S3.
