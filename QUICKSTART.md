# Quick Start Guide - Projeto Cursos Upgrade

## 🚀 Start the System (3 Steps)

### 1. Start Infrastructure
```bash
docker-compose up -d
```

### 2. Setup Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🌐 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Prisma Studio**: `npx prisma studio` → http://localhost:5555
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin123)

## 🧪 Test the API

### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin123!","name":"Admin Test","role":"ADMIN"}'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin123!"}'
```

## 📁 Project Structure

```
projeto-cursos-upgrade/
├── backend/          # NestJS API (port 3001)
├── frontend/         # Next.js App (port 3000)
├── docs/             # Documentation
└── docker-compose.yml
```

## 🛠️ Common Commands

### Backend
```bash
npm run start:dev      # Start development server
npm run build          # Build for production
npx prisma studio      # Open database GUI
npx prisma migrate dev # Run migrations
```

### Frontend
```bash
npm run dev            # Start development server
npm run build          # Build for production
npm run start          # Start production server
```

### Docker
```bash
docker-compose up -d   # Start all services
docker-compose down    # Stop all services
docker-compose logs -f # View logs
```

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3001
kill -9 <PID>
```

### Database Connection Error
```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check connection string in backend/.env
DATABASE_URL="postgresql://cursos_user:cursos_password@localhost:5432/cursos_db?schema=public"
```

### Module Not Found
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json .next
npm install
```

## 📚 Full Documentation

See [docs/SETUP.md](docs/SETUP.md) for detailed setup instructions and troubleshooting.
