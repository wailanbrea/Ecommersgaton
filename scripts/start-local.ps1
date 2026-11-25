$ErrorActionPreference = 'Stop'
$root = 'C:\xampp\php\www\EcommersGaton'
Set-Location -LiteralPath $root
$envText = [IO.File]::ReadAllText((Join-Path $root '.env.local'))
$secret = [regex]::Match($envText, '(?m)^SESSION_SECRET=(.+)$').Groups[1].Value
$email = [regex]::Match($envText, '(?m)^ADMIN_EMAIL=(.+)$').Groups[1].Value
$password = [regex]::Match($envText, '(?m)^ADMIN_PASSWORD=(.+)$').Groups[1].Value
if ($secret.Length -lt 32 -or !$email -or !$password) { throw 'Configuración local incompleta' }
$env:SESSION_SECRET = $secret
$env:ADMIN_EMAIL = $email
$env:ADMIN_PASSWORD = $password
npm.cmd run start:local
