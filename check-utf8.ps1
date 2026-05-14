param()
$dir = "C:\Users\Desktop\Downloads\Sistema_upgrade-main_atual\frontend\components\enrollment"
Get-ChildItem $dir -Filter "*.tsx" | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    # Detecta sequências double-encoded comuns (Ã©, Ã£, Ã§, Â·, etc.)
    $bad = ([regex]::Matches($text, 'Ã.|â€|Â[^\s]')).Count
    if ($bad -gt 0) { Write-Host "CORRUPTED: $($_.Name) ($bad bad)" }
    else { Write-Host "OK: $($_.Name)" }
}
