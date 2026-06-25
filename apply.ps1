# apply.ps1 — Sparking build script
# Converte _src/*.html (frontmatter Jekyll) -> HTML completo no root
# Converte pages/*.html e index.html (frontmatter) -> HTML completo in-place
# Gera sparking-formulas.js a partir de _data/formulas.yml
#
# Uso: cd lm\ferramentas; .\apply.ps1

$base = $PSScriptRoot

# ─── 1. FORMULAS.YML -> sparking-formulas.js ─────────────────────────────────

$ymlPath = Join-Path $base '_data\formulas.yml'
$formulas = [ordered]@{}

$lines       = [System.IO.File]::ReadAllLines($ymlPath, [System.Text.Encoding]::UTF8)
$currentKey  = $null
$blockIndent = -1
$blockLines  = [System.Collections.Generic.List[string]]::new()

function Save-Block {
    if ($script:currentKey -and $script:blockLines.Count -gt 0) {
        $script:formulas[$script:currentKey] = ($script:blockLines -join "`n").TrimEnd()
    }
    $script:currentKey  = $null
    $script:blockIndent = -1
    $script:blockLines.Clear()
}

foreach ($line in $lines) {
    if ($line -match '^([a-z][a-z0-9-]+):\s*\|-?\s*$') {
        Save-Block
        $currentKey = $Matches[1]
    } elseif ($null -ne $currentKey) {
        if ($line.Length -eq 0 -or $line.Trim() -eq '') {
            $blockLines.Add('')
        } elseif ($line[0] -ne ' ') {
            Save-Block
        } else {
            if ($blockIndent -lt 0) {
                $m = [regex]::Match($line, '^( +)')
                $blockIndent = if ($m.Success) { $m.Groups[1].Length } else { 0 }
            }
            $stripped = if ($line.Length -gt $blockIndent) { $line.Substring($blockIndent) } else { '' }
            $blockLines.Add($stripped)
        }
    }
}
Save-Block

Write-Host "  formulas carregadas: $($formulas.Count)"

$js = [System.Text.StringBuilder]::new()
[void]$js.AppendLine('(function(){')
[void]$js.AppendLine('var F={')
foreach ($k in $formulas.Keys) {
    $v = $formulas[$k].Replace('\','\\').Replace('"','\"').Replace("`r`n",'\n').Replace("`n",'\n').Replace("`r",'')
    [void]$js.AppendLine("""$k"":""$v"",")
}
[void]$js.AppendLine('};')
[void]$js.AppendLine('document.addEventListener(''DOMContentLoaded'',function(){')
[void]$js.AppendLine('  var tool=document.body.getAttribute(''data-tool'');')
[void]$js.AppendLine('  if(!tool||!F[tool])return;')
[void]$js.AppendLine('  var el=document.getElementById(''panel-form'');')
[void]$js.AppendLine('  if(el)el.innerHTML=F[tool];')
[void]$js.AppendLine('});')
[void]$js.Append('})();')

$enc = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Join-Path $base 'sparking-formulas.js'), $js.ToString(), $enc)
Write-Host '[OK] sparking-formulas.js'

# ─── 2. PTS-TBL.JSON -> tabela de grandezas por painel ──────────────────────

$ptsTblPath = Join-Path $base '_data\pts-tbl.json'
$ptsTbl = [System.IO.File]::ReadAllText($ptsTblPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json

function Get-PtsTbl($rows) {
    $sb = [System.Text.StringBuilder]::new()
    [void]$sb.Append('<table class="pts-tbl"><thead><tr><th>Grandeza</th><th>Valor</th></tr></thead>')
    foreach ($row in $rows) {
        if ($null -ne $row.PSObject.Properties['value']) {
            [void]$sb.Append("<tr><td>$($row.label)</td><td>$($row.value)</td></tr>")
        } elseif ($null -ne $row.PSObject.Properties['badge'] -and $row.badge) {
            $cls = if ($null -ne $row.PSObject.Properties['badgeClass']) { "badge $($row.badgeClass)" } else { 'badge' }
            [void]$sb.Append("<tr><td>$($row.label)</td><td><div id=""$($row.id)"" class=""$cls"">&mdash;</div></td></tr>")
        } else {
            [void]$sb.Append("<tr><td>$($row.label)</td><td id=""$($row.id)"">&mdash;</td></tr>")
        }
    }
    [void]$sb.Append('</table>')
    return $sb.ToString()
}

# ─── 3. HEAD builder ──────────────────────────────────────────────────────────

function Get-ToolHead($title, $mathjax, $chartjs) {
    $mj = "MathJax={tex:{displayMath:[['\\[','\\]']],inlineMath:[['\\(','\\)']],tags:'none'},chtml:{scale:1.1}}"
    $h  = [System.Text.StringBuilder]::new()
    [void]$h.AppendLine('<meta charset="UTF-8">')
    [void]$h.AppendLine('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
    [void]$h.AppendLine("<title>$title</title>")
    [void]$h.AppendLine('<link rel="preconnect" href="https://fonts.googleapis.com">')
    [void]$h.AppendLine('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">')
    if ($mathjax) { [void]$h.AppendLine("<script>$mj</script>") }
    [void]$h.AppendLine('<link rel="stylesheet" href="sparking.css">')
    if ($mathjax) { [void]$h.AppendLine('<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js" async></script>') }
    if ($chartjs)  { [void]$h.AppendLine('<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>') }
    [void]$h.AppendLine('<script src="sparking.js"></script>')
    [void]$h.AppendLine('<script src="sparking-formulas.js"></script>')
    return $h.ToString()
}

# ─── 3. FRONTMATTER parser ────────────────────────────────────────────────────

function Parse-FM($raw) {
    $raw = $raw.Replace("`r`n", "`n").TrimStart([char]0xFEFF)
    if ($raw -notmatch '^---\n([\s\S]*?)\n---\n') { return $null }
    $fm  = $Matches[1]
    $content = $raw.Substring($Matches[0].Length).Trim()
    return @{
        title   = if ($fm -match 'title:\s*"([^"]+)"') { $Matches[1] } elseif ($fm -match "title:\s*'([^']+)'") { $Matches[1] } else { 'Sparking' }
        tool_id = if ($fm -match 'tool_id:\s*(\S+)')   { $Matches[1] } else { '' }
        mathjax = $fm -match 'mathjax:\s*true'
        chartjs = -not ($fm -match 'chartjs:\s*false')
        layout  = if ($fm -match 'layout:\s*(\S+)')    { $Matches[1] } else { '' }
        content = $content
    }
}

# ─── 4. NAV ───────────────────────────────────────────────────────────────────

$nav = '<nav class="sparking-nav"><a href="pages/ferramentas.html">&#8592; Ferramentas</a><span class="badge">Sparking</span></nav>'

# ─── 5. BUILD TOOLS from _src/ ────────────────────────────────────────────────

$srcDir    = Join-Path $base '_src'
$toolFiles = Get-ChildItem $srcDir -Filter '*.html' -File -ErrorAction SilentlyContinue

foreach ($f in $toolFiles) {
    $raw = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $fm  = Parse-FM $raw
    if (-not $fm) { Write-Warning "skip (sem frontmatter): $($f.Name)"; continue }

    $head = Get-ToolHead $fm.title $fm.mathjax $fm.chartjs
    $content = $fm.content
    $toolEntry = $ptsTbl.PSObject.Properties[$fm.tool_id]
    if ($toolEntry) {
        foreach ($panel in $toolEntry.Value.PSObject.Properties) {
            $placeholder = "<!-- pts-tbl:$($panel.Name) -->"
            $replaced = $content.Replace($placeholder, (Get-PtsTbl $panel.Value))
            if ($replaced -eq $content) {
                Write-Host "[WARN] $($f.Name): placeholder '$placeholder' nao encontrado -> tabela ausente no output!" -ForegroundColor Red
            }
            $content = $replaced
        }
    }
    if ($content -match '<!--\s*pts-tbl:[^-]+-->') {
        Write-Host "[WARN] $($f.Name): marcacao pts-tbl sem correspondencia no JSON encontrada no output!" -ForegroundColor Red
    }
    $html = "<!DOCTYPE html>`n<html lang=""pt-BR"">`n<head>`n$head`n</head>`n<body data-tool=""$($fm.tool_id)"">`n$nav`n$content`n</body>`n</html>"

    $out = Join-Path $base $f.Name
    [System.IO.File]::WriteAllText($out, $html, $enc)
    Write-Host "[OK] $($f.Name)"
}

# ─── 6. CONVERT PAGES (frontmatter -> HTML completo, uma vez) ─────────────────

function Convert-Page($path) {
    $raw = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    if (-not $raw.TrimStart([char]0xFEFF).TrimStart().StartsWith('---')) { return }
    $fm  = Parse-FM $raw
    if (-not $fm) { return }
    $html = "<!DOCTYPE html>`n<html lang=""pt-BR"">`n<head>`n<meta charset=""UTF-8"">`n<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">`n<title>$($fm.title)</title>`n</head>`n<body>`n$($fm.content)`n</body>`n</html>"
    [System.IO.File]::WriteAllText($path, $html, $enc)
    Write-Host "[OK] $(Split-Path $path -Leaf) (page convertida)"
}

$pagesDir = Join-Path $base 'pages'
Get-ChildItem $pagesDir -Filter '*.html' -File -ErrorAction SilentlyContinue | ForEach-Object { Convert-Page $_.FullName }
$idxPath = Join-Path $base 'index.html'
if (Test-Path $idxPath) { Convert-Page $idxPath }

Write-Host "`nDone. Abra os .html no browser para testar."
