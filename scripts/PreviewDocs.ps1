param(
    [switch]$NoBrowser,
    [ValidateRange(1, 65535)]
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$docsRoot = Split-Path -Parent $PSScriptRoot
$venvDirectory = Join-Path $docsRoot ".venv"
$venvPython = Join-Path $venvDirectory "Scripts\python.exe"
$zensicalExecutable = Join-Path $venvDirectory "Scripts\zensical.exe"
$requirementsFile = Join-Path $docsRoot "requirements.txt"
$englishConfigFile = Join-Path $docsRoot "zensical.toml"
$koreanConfigFile = Join-Path $docsRoot "zensical.ko.toml"
$englishSiteDirectory = Join-Path $docsRoot "site"
$koreanSiteDirectory = Join-Path $docsRoot "site-ko"
$previewRoot = Join-Path $docsRoot ".preview"
$previewSiteDirectory = Join-Path $previewRoot "WormholePortal_Docs"
$previewUrl = "http://localhost:$Port/WormholePortal_Docs/"

Set-Location -LiteralPath $docsRoot

try {
    $existingPreview = Invoke-WebRequest `
        -Uri $previewUrl `
        -UseBasicParsing `
        -TimeoutSec 1

    if (
        $existingPreview.StatusCode -eq 200 -and
        $existingPreview.Content -match "Wormhole Portal"
    ) {
        if (-not $NoBrowser) {
            Start-Process $previewUrl
        }

        Write-Host "The documentation preview is already running."
        exit 0
    }
}
catch {
    # No preview server is running yet.
}

if (-not (Test-Path -LiteralPath $zensicalExecutable)) {
    Write-Host "Preparing the documentation preview for the first time..."

    $pythonLauncher = Get-Command "py" -ErrorAction SilentlyContinue
    if ($null -ne $pythonLauncher) {
        & $pythonLauncher.Source -3 -m venv $venvDirectory
    }

    if (-not (Test-Path -LiteralPath $venvPython)) {
        $pythonCommand = Get-Command "python" -ErrorAction SilentlyContinue
        if ($null -eq $pythonCommand) {
            throw "Python 3 is required. Install Python, then run PreviewDocs.cmd again."
        }

        & $pythonCommand.Source -m venv $venvDirectory
    }

    if (-not (Test-Path -LiteralPath $venvPython)) {
        throw "The Python environment could not be created."
    }

    & $venvPython -m pip install -r $requirementsFile
    if ($LASTEXITCODE -ne 0) {
        throw "Zensical could not be installed."
    }
}

$resolvedDocsRoot = [System.IO.Path]::GetFullPath($docsRoot).TrimEnd(
    [System.IO.Path]::DirectorySeparatorChar
)
$resolvedPreviewRoot = [System.IO.Path]::GetFullPath($previewRoot)
$expectedPreviewPrefix = $resolvedDocsRoot + [System.IO.Path]::DirectorySeparatorChar

if (
    -not $resolvedPreviewRoot.StartsWith(
        $expectedPreviewPrefix,
        [System.StringComparison]::OrdinalIgnoreCase
    )
) {
    throw "The preview directory must be inside the documentation project."
}

Write-Host "Building English documentation..."
& $zensicalExecutable build `
    --config-file $englishConfigFile `
    --clean `
    --strict

if ($LASTEXITCODE -ne 0) {
    throw "The English documentation build failed."
}

Write-Host "Building Korean documentation..."
& $zensicalExecutable build `
    --config-file $koreanConfigFile `
    --clean `
    --strict

if ($LASTEXITCODE -ne 0) {
    throw "The Korean documentation build failed."
}

if (Test-Path -LiteralPath $resolvedPreviewRoot) {
    Remove-Item -LiteralPath $resolvedPreviewRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $previewSiteDirectory -Force | Out-Null

Get-ChildItem -LiteralPath $englishSiteDirectory -Force |
    Copy-Item -Destination $previewSiteDirectory -Recurse -Force

$previewKoreanDirectory = Join-Path $previewSiteDirectory "ko"
New-Item -ItemType Directory -Path $previewKoreanDirectory -Force | Out-Null

Get-ChildItem -LiteralPath $koreanSiteDirectory -Force |
    Copy-Item -Destination $previewKoreanDirectory -Recurse -Force

$browserJob = $null

if (-not $NoBrowser) {
    $browserJob = Start-Job -ScriptBlock {
        param($Url)

        for ($attempt = 0; $attempt -lt 80; $attempt++) {
            try {
                $response = Invoke-WebRequest `
                    -Uri $Url `
                    -UseBasicParsing `
                    -TimeoutSec 1

                if ($response.StatusCode -eq 200) {
                    Start-Process $Url
                    return
                }
            }
            catch {
                # Wait for the preview server to finish starting.
            }

            Start-Sleep -Milliseconds 250
        }
    } -ArgumentList $previewUrl
}

Write-Host ""
Write-Host "Wormhole Portal documentation preview"
Write-Host "Opening $previewUrl"
Write-Host "Keep this window open while previewing. Close it to stop."
Write-Host ""

try {
    & $venvPython -m http.server $Port `
        --bind 127.0.0.1 `
        --directory $previewRoot

    if ($LASTEXITCODE -ne 0) {
        throw "The documentation preview server stopped unexpectedly."
    }
}
finally {
    if ($null -ne $browserJob) {
        Stop-Job -Job $browserJob -ErrorAction SilentlyContinue
        Remove-Job -Job $browserJob -Force -ErrorAction SilentlyContinue
    }
}
