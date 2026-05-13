$ErrorActionPreference = 'Stop'
$loginBody = @{ email = 'admin@qualifica.com'; password = 'RR@@Upgrade' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody
Write-Host "=== Estrutura da resposta de login ==="
$login | ConvertTo-Json -Depth 4
