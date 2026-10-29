param(
    [Parameter(Mandatory=$true)][string]$PackageDirectory,
    [Parameter(Mandatory=$true)][string]$RootTarget,
    [Parameter(Mandatory=$true)][string]$IdentityFile,
    [Parameter(Mandatory=$true)][string]$UploadTarget
)
$ErrorActionPreference = 'Stop'
$packagePath = (Resolve-Path -LiteralPath $PackageDirectory).Path
$manifest = Get-Content -LiteralPath (Join-Path $packagePath 'manifest.json') -Raw | ConvertFrom-Json
$version = $manifest.version
if ($manifest.id -ne 'wujie-sync' -or $version -notmatch '^\d+\.\d+\.\d+-alpha\.\d+$') { throw 'Expected a Wujie Alpha package' }
$stage = Join-Path ([System.IO.Path]::GetTempPath()) ('wujie-alpha-publish-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
$hashes = @{}
foreach ($name in @('manifest.json','main.js','styles.css')) {
    $file = Join-Path $packagePath $name
    $hashes[$name] = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
    Copy-Item -LiteralPath $file -Destination (Join-Path $stage $name)
}
$release = @{id='wujie-sync';version=$version;channel='Alpha';baseUrl="https://user.wujiesync.cc/download/alpha/$version/";sha256=$hashes;rollbackSafe=$false;publishedAt=[DateTimeOffset]::UtcNow.ToString('o')}
[IO.File]::WriteAllText((Join-Path $stage 'release.json'),($release | ConvertTo-Json -Depth 6),[Text.UTF8Encoding]::new($false))
$remote = "/home/app/wujie-alpha-upload/$version"
& ssh $UploadTarget "mkdir -p $remote"
if ($LASTEXITCODE) { throw 'Could not prepare upload directory' }
foreach ($name in @('manifest.json','main.js','styles.css','release.json')) {
    & scp (Join-Path $stage $name) "${UploadTarget}:$remote/$name"
    if ($LASTEXITCODE) { throw "Upload failed: $name" }
}
$updater = Join-Path $PSScriptRoot 'update-alpha-index.py'
& scp $updater "${UploadTarget}:/home/app/update-alpha-index.py"
if ($LASTEXITCODE) { throw 'Could not upload index updater' }
& ssh -i $IdentityFile -o BatchMode=yes -o IdentitiesOnly=yes $RootTarget "python3 /home/app/update-alpha-index.py --import-dir $remote --write --backup-dir /var/backups/wujie-download-index"
if ($LASTEXITCODE) { throw 'Publication failed; inspect the server before retrying' }
Write-Output "Published Alpha $version and refreshed the full Alpha index. Local receipt files: $stage"
