# build.ps1 — Genera dist/, añade .htaccess y crea calculadora_dist.zip

# 1) Instalar dependencias
if (Test-Path package-lock.json) {
  npm ci
} else {
  npm install
}

# 2) Compilar
$env:NODE_ENV = "production"
npm run build

# 3) .htaccess en dist/
$htaccess = @"
# Fuerza HTTPS
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# SPA fallback
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule . /index.html [L]

# CSP para permitir embed desde tu dominio principal
<IfModule mod_headers.c>
  Header always set Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' https: 'unsafe-inline'; connect-src 'self' https:; frame-ancestors https://calculadorainmobiliaria.es https://www.calculadorainmobiliaria.es"
  Header always unset X-Frame-Options
</IfModule>

# Cache estática
<FilesMatch "\.(js|css|png|jpg|jpeg|gif|webp|svg|ico)$">
  <IfModule mod_headers.c>
    Header set Cache-Control "public, max-age=2592000, immutable"
  </IfModule>
</FilesMatch>
"@

$distPath = Join-Path $PSScriptRoot "dist"
$htaccessPath = Join-Path $distPath ".htaccess"
$htaccess | Out-File -FilePath $htaccessPath -Encoding utf8 -Force

# 4) ZIP
$zipOut = Join-Path $PSScriptRoot "calculadora_dist.zip"
if (Test-Path $zipOut) { Remove-Item $zipOut -Force }
Compress-Archive -Path (Join-Path $distPath "*") -DestinationPath $zipOut

Write-Host "✅ Build completado."
Write-Host "📁 Dist: $distPath"
Write-Host "📦 ZIP:  $zipOut"
