$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = "./backup-$timestamp.sql"
pg_dump -h localhost -U postgres -d vinayaka_transport -f $backupFile
Write-Host "Backup created: $backupFile"
