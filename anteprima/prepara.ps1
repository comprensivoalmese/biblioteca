# Crea anteprima\index.html: la vera app (Index.html) con il finto Apps Script e il vero Codice.gs.
# Uso: powershell -ExecutionPolicy Bypass -File anteprima\prepara.ps1   poi aprire anteprima\index.html
$qui = Split-Path -Parent $MyInvocation.MyCommand.Path
$radice = Split-Path -Parent $qui
Copy-Item (Join-Path $radice 'Codice.gs') (Join-Path $qui 'codice.js') -Force
$html = [IO.File]::ReadAllText((Join-Path $radice 'Index.html'), [Text.Encoding]::UTF8)
$inserto = '<script src="finto-gas.js"></script><script src="codice.js"></script><script src="demo.js"></script><script src="prove.js"></script>'
$html = $html.Replace('<!--ANTEPRIMA-->', $inserto)
[IO.File]::WriteAllText((Join-Path $qui 'index.html'), $html, (New-Object Text.UTF8Encoding $false))
Write-Output "Pronto: $(Join-Path $qui 'index.html')"
