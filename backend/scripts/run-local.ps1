$ErrorActionPreference = "Stop"

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDirectory = Resolve-Path (Join-Path $scriptDirectory "..")
$envPath = Join-Path $backendDirectory ".env"

if (-not (Test-Path -LiteralPath $envPath)) {
    Write-Error "backend/.env bulunamadı. backend/.env.example dosyasını backend/.env olarak kopyalayın ve yerel değerleri doldurun."
    exit 1
}

$loadedKeys = @{}

Get-Content -LiteralPath $envPath | ForEach-Object {
    $line = $_.Trim()

    if ($line -eq "" -or $line.StartsWith("#")) {
        return
    }

    $separatorIndex = $line.IndexOf("=")

    if ($separatorIndex -le 0) {
        return
    }

    $name = $line.Substring(0, $separatorIndex).Trim()
    $value = $line.Substring($separatorIndex + 1)

    if ($name -eq "") {
        return
    }

    Set-Item -Path "Env:$name" -Value $value
    $loadedKeys[$name] = $true
}

$requiredKeys = @(
    "JWT_SECRET",
    "VERIFICATION_CODE_SECRET",
    "DB_URL",
    "DB_USERNAME",
    "DB_PASSWORD",
    "MAIL_USERNAME",
    "MAIL_APP_PASSWORD",
    "JWT_EXPIRATION_MS",
    "JPA_SHOW_SQL"
)

$missingKeys = $requiredKeys | Where-Object { -not $loadedKeys.ContainsKey($_) }

if ($missingKeys.Count -gt 0) {
    Write-Error "backend/.env eksik alan içeriyor: $($missingKeys -join ', '). backend/.env.example dosyasını referans alın."
    exit 1
}

$emptySecretKeys = @("JWT_SECRET", "VERIFICATION_CODE_SECRET") | Where-Object {
    [string]::IsNullOrWhiteSpace((Get-Item -Path "Env:$_").Value)
}

if ($emptySecretKeys.Count -gt 0) {
    Write-Error "backend/.env içinde zorunlu secret alanları boş: $($emptySecretKeys -join ', '). Yerel geliştirme secret değerlerini doldurun."
    exit 1
}

Push-Location $backendDirectory
try {
    & mvn.cmd spring-boot:run
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
