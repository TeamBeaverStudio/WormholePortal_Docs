param(
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$docsRoot = Split-Path -Parent $PSScriptRoot
$venvDirectory = Join-Path $docsRoot ".venv"
$venvPython = Join-Path $venvDirectory "Scripts\python.exe"
$zensicalExecutable = Join-Path $venvDirectory "Scripts\zensical.exe"
$requirementsFile = Join-Path $docsRoot "requirements.txt"
$previewUrl = "http://localhost:8000/WormholePortal_Docs/"

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
    & $zensicalExecutable serve

    if ($LASTEXITCODE -ne 0) {
        throw "The Zensical preview server stopped unexpectedly."
    }
}
finally {
    if ($null -ne $browserJob) {
        Stop-Job -Job $browserJob -ErrorAction SilentlyContinue
        Remove-Job -Job $browserJob -Force -ErrorAction SilentlyContinue
    }
}
