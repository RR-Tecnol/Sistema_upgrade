$ErrorActionPreference = 'Stop'

Write-Host "`n=== Teste de sincronizacao de feedbacks orfaos ===" -ForegroundColor Cyan

# 1. Login admin
$loginBody = @{ email = 'admin@qualifica.com'; password = 'RR@@Upgrade' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody
Write-Host ("[1] Login admin: OK - " + $login.user.name) -ForegroundColor Green
$h = @{ Authorization = 'Bearer ' + $login.accessToken }

# 2. Primeira chamada do sync
$r1 = Invoke-RestMethod -Uri 'http://localhost:3001/api/feedbacks/admin/sync-orphans' -Method Post -Headers $h
Write-Host ("[2] Sync #1: scanned=" + $r1.scanned + "  created=" + $r1.created + "  skipped=" + $r1.skipped) -ForegroundColor Yellow

# 3. Segunda chamada (idempotencia)
$r2 = Invoke-RestMethod -Uri 'http://localhost:3001/api/feedbacks/admin/sync-orphans' -Method Post -Headers $h
Write-Host ("[3] Sync #2 (idempotencia): scanned=" + $r2.scanned + "  created=" + $r2.created + "  skipped=" + $r2.skipped) -ForegroundColor Yellow

# 4. KPIs
$k = Invoke-RestMethod -Uri 'http://localhost:3001/api/feedbacks/kpis' -Method Get -Headers $h
Write-Host ("[4] KPIs: totalInvites=" + $k.totalInvites + "  responseRate=" + $k.responseRate + "%  approved=" + $k.approved + "  submitted=" + $k.submitted) -ForegroundColor Cyan

# 5. Login aluno e listar feedbacks
$alunoLogin = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/login' -Method Post -ContentType 'application/json' -Body (@{ email = 'aluno@qualifica.com'; password = 'RR@@Upgrade' } | ConvertTo-Json)
$hAluno = @{ Authorization = 'Bearer ' + $alunoLogin.accessToken }
$minhas = Invoke-RestMethod -Uri 'http://localhost:3001/api/feedbacks/my' -Method Get -Headers $hAluno
Write-Host ("[5] Feedbacks do Joao (aluno): " + $minhas.Count + " convite(s)") -ForegroundColor Green
foreach ($fb in $minhas) {
    Write-Host ("    - " + $fb.class.course.name + " | status: " + $fb.status)
}

Write-Host "`n=== Teste concluido ===" -ForegroundColor Cyan
