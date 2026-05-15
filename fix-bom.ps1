param()
$root = "C:\Users\Desktop\Downloads\Sistema_upgrade-main_atual\frontend"
$exclude = @("node_modules", ".next", ".git")
$fixed = 0
$checked = 0

Get-ChildItem -Path $root -Recurse -Include "*.tsx","*.ts" -File | ForEach-Object {
    $path = $_.FullName
    $skip = $false
    foreach ($ex in $exclude) {
        if ($path -like "*$ex*") { $skip = $true; break }
    }
    if ($skip) { return }
    $checked++
    $bytes = [System.IO.File]::ReadAllBytes($path)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $newBytes = $bytes[3..($bytes.Length - 1)]
        [System.IO.File]::WriteAllBytes($path, $newBytes)
        $fixed++
        Write-Host "FIXED: $($_.Name)"
    }
}
Write-Host "Checked: $checked | Fixed BOM: $fixed"
