Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('c:\Users\Administrador\Desktop\Sistema_upgrade-main-atual\Sistema_upgrade-main\Auditoria_VPS_Upgrade_v3.docx')
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xml = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()
$text = $xml -replace '<w:p[ >]', "`n<w:p" -replace '<[^>]+>', ''
Write-Output $text
