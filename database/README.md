# 🗄️ Banco de Dados — Backup

## Como restaurar o banco de dados

### 1. Subir o container PostgreSQL
```bash
docker compose up -d
```

### 2. Restaurar o backup mais recente
```bash
# No Windows (PowerShell)
$backup = Get-ChildItem .\backups\ | Sort-Object LastWriteTime -Descending | Select-Object -First 1
docker exec -i cursos-postgres psql -U cursos_user -d cursos_db < $backup.FullName

# No Linux/Mac
docker exec -i cursos-postgres psql -U cursos_user -d cursos_db < ./backups/backup_XXXX-XX-XX_XX-XX.sql
```

### 3. Rodar as migrations (se necessário)
```bash
cd backend
npx prisma migrate deploy
```

## Estrutura dos backups
- `backups/backup_YYYY-MM-DD_HH-MM.sql` — Dumps completos gerados automaticamente

## Configuração do banco (local)
- **Host:** localhost
- **Porta:** 5432
- **Banco:** cursos_db
- **Usuário:** cursos_user
- **Container Docker:** `cursos-postgres`

## Como gerar um novo backup
```powershell
$date = Get-Date -Format "yyyy-MM-dd_HH-mm"
docker exec cursos-postgres pg_dump -U cursos_user -d cursos_db > "./backups/backup_$date.sql"
```
