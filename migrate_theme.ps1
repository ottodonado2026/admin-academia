$cssFiles = Get-ChildItem -Path "c:\Colegio Marinella\admin-academia\src" -Filter "*.css" -Recurse

foreach ($file in $cssFiles) {
    $content = Get-Content $file.FullName -Raw

    # 1. Fondos oscuros a blancos/claros
    $content = $content -replace '#0d0d0d', '#FFFFFF'
    $content = $content -replace '#1a1a1a', '#F8FAFC'
    $content = $content -replace '#080b12', '#F8FAFC'
    $content = $content -replace 'rgba\(255,255,255,0.03\)', '#FFFFFF'
    $content = $content -replace 'rgba\(255, 255, 255, 0.03\)', '#FFFFFF'
    $content = $content -replace 'rgba\(255,255,255,0.08\)', '#E2E8F0'
    $content = $content -replace 'rgba\(255, 255, 255, 0.08\)', '#E2E8F0'
    $content = $content -replace 'rgba\(255,255,255,0.45\)', '#94A3B8'

    # 2. Verdes neón a azules institucionales (Syncore blue)
    $content = $content -replace '#39ff14', '#0f62fe'
    $content = $content -replace '#9dff8a', '#0f62fe'
    $content = $content -replace 'rgba\(57,255,20,', 'rgba(15,98,254,'
    $content = $content -replace 'rgba\(57, 255, 20,', 'rgba(15, 98, 254,'

    # 3. Textos blancos puros en fondos oscuros a grises/oscuros
    # Esto es peligroso globalmente, pero como estamos pasando a Light Theme,
    # la mayoría de los color: #fff; (o blancos) deberían ser texto principal.
    # Excepción: botones primarios que ahora son azules, su texto debe seguir siendo blanco.
    # Así que mejor no reemplazo color: #fff; a ciegas, pero sí lo haré específicamente para las opciones de selects.
    $content = $content -replace 'background: #FFFFFF;\s*color: #fff;', 'background: #FFFFFF; color: #1E293B;'

    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "Reemplazo completado"
