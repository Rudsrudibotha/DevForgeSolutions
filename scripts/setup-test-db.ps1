# One-time elevated setup for a local SQL Server Express test database.
# Run as Administrator. Installs SQL Server 2022 Express, enables TCP on
# localhost:1433 and mixed-mode auth, creates a 'kch_test' SQL login with a
# random password and an empty 'devforge_test' database, and writes the
# connection string to .env.test (gitignored).

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$logFile = Join-Path $root 'scripts\setup-test-db.log'
Start-Transcript -Path $logFile -Force | Out-Null

function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

try {
  $svc = Get-Service 'MSSQL$SQLEXPRESS' -ErrorAction SilentlyContinue
  if (-not $svc) {
    Step 'Installing SQL Server 2022 Express via winget (this downloads ~270 MB, please wait)'
    winget install Microsoft.SQLServer.2022.Express --silent --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { throw "winget install failed with exit code $LASTEXITCODE" }
    $svc = Get-Service 'MSSQL$SQLEXPRESS' -ErrorAction Stop
  } else {
    Step 'SQL Server Express already installed - skipping install'
  }

  Step 'Enabling TCP/IP on port 1433 and mixed-mode authentication'
  $instRoot = Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server' |
    Where-Object { $_.PSChildName -match '^MSSQL\d+\.SQLEXPRESS$' } |
    Select-Object -First 1
  if (-not $instRoot) { throw 'Could not locate SQLEXPRESS instance registry root' }
  $base = $instRoot.PSPath

  # Mixed-mode auth (SQL + Windows)
  Set-ItemProperty -Path "$base\MSSQLServer" -Name LoginMode -Value 2

  # TCP enabled, static port 1433 on all interfaces
  $tcp = "$base\MSSQLServer\SuperSocketNetLib\Tcp"
  Set-ItemProperty -Path $tcp -Name Enabled -Value 1
  foreach ($child in Get-ChildItem $tcp) {
    Set-ItemProperty -Path $child.PSPath -Name Enabled -Value 1 -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $child.PSPath -Name TcpDynamicPorts -Value '' -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $child.PSPath -Name TcpPort -Value '1433' -ErrorAction SilentlyContinue
  }

  Step 'Restarting SQL Server service'
  Restart-Service 'MSSQL$SQLEXPRESS' -Force
  Start-Sleep -Seconds 5

  Step 'Creating kch_test login and devforge_test database'
  # Random password: letters+digits only so it is URL-safe in DATABASE_URL.
  $pwd = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
  Add-Type -AssemblyName System.Data
  $conn = New-Object System.Data.SqlClient.SqlConnection('Server=localhost\SQLEXPRESS;Integrated Security=true;TrustServerCertificate=true')
  $conn.Open()
  $cmds = @(
    "IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'kch_test') CREATE LOGIN kch_test WITH PASSWORD = '$pwd', CHECK_POLICY = OFF; ELSE ALTER LOGIN kch_test WITH PASSWORD = '$pwd';",
    "ALTER SERVER ROLE sysadmin ADD MEMBER kch_test;",
    "IF DB_ID('devforge_test') IS NULL CREATE DATABASE devforge_test;"
  )
  foreach ($c in $cmds) {
    $cmd = $conn.CreateCommand(); $cmd.CommandText = $c; [void]$cmd.ExecuteNonQuery()
  }
  $conn.Close()

  Step 'Writing .env.test'
  $envPath = Join-Path $root '.env.test'
  "DATABASE_URL=sqlserver://localhost:1433/devforge_test?user=kch_test&password=$pwd`nDB_ENCRYPT=false" |
    Out-File -FilePath $envPath -Encoding ascii -Force

  Step 'DONE - test DB ready at localhost:1433/devforge_test (credentials in .env.test)'
} catch {
  Write-Host "SETUP FAILED: $_" -ForegroundColor Red
} finally {
  Stop-Transcript | Out-Null
}
