# Crea icona\icona.png (256 px) da icona.svg con Edge headless, e Icona.gs con l'immagine in base64
# (lo script la salva su Drive e la usa come favicon / icona della schermata Home).
$qui = Split-Path -Parent $MyInvocation.MyCommand.Path
$radice = Split-Path -Parent $qui
$tmp = Join-Path $env:TEMP 'biblioteca-icona'
New-Item -ItemType Directory -Force $tmp | Out-Null
$svg = [IO.File]::ReadAllText((Join-Path $qui 'icona.svg')) -replace 'viewBox="0 0 512 512" width="512" height="512"', 'viewBox="0 0 512 512" width="256" height="256"'
$html = "<!doctype html><html><body style='margin:0;overflow:hidden;background:#000'>$svg</body></html>"
[IO.File]::WriteAllText((Join-Path $tmp 'icona.html'), $html)
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$png = Join-Path $qui 'icona.png'
Start-Process $edge -ArgumentList @('--headless=new', '--disable-gpu', "--user-data-dir=$tmp\profilo", '--window-size=256,256',
  '--hide-scrollbars', '--default-background-color=00000000', "--screenshot=$png", "file:///$($tmp -replace '\\','/')/icona.html") -Wait
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($png))
$gs = "// Generato da icona\crea-icona.ps1: icona dell'app (PNG 512 px). Non modificare a mano.`nconst ICONA_PNG_BASE64 = '$b64';`n"
[IO.File]::WriteAllText((Join-Path $radice 'Icona.gs'), $gs, (New-Object Text.UTF8Encoding $false))
Write-Output "icona.png: $((Get-Item $png).Length) byte, Icona.gs: $($gs.Length) caratteri"
