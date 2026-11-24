param(
    [string]$Tools = "",
    [string]$Keystore = "",
    [string]$VersionName = "1.0",
    [int]$VersionCode = 1,
    [switch]$SkipPublish
)

# Builds app/ into a signed APK without Gradle.
# Reuses the JDK 17 + Android SDK 34 toolchain from ../android-apk/tools.
$ErrorActionPreference = 'Continue'

$root = $PSScriptRoot
$app = Join-Path $root 'app'
$build = Join-Path $root 'build'
$libs = Join-Path $root 'libs'
$apkName = "suiji-$VersionName"

if (-not $Tools) {
    $candidates = @(
        $env:ANDROID_TOOLCHAIN,
        'C:\Users\juyao\Documents\deepseek-harness\default-workspace\android-apk\tools'
    )
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path (Join-Path $candidate 'sdk\platforms\android-34\android.jar'))) {
            $Tools = $candidate
            break
        }
    }
}
if (-not $Tools) {
    throw 'Android toolchain not found. Pass -Tools <dir> or set ANDROID_TOOLCHAIN.'
}

$sdk = Join-Path $Tools 'sdk'
$jdk = Get-ChildItem $Tools -Directory | Where-Object { $_.Name -like 'jdk-17*' } | Select-Object -First 1
if (-not $jdk) { throw "JDK 17 not found under $Tools" }
$jdkHome = $jdk.FullName
$env:JAVA_HOME = $jdkHome
$env:PATH = (Join-Path $jdkHome 'bin') + ';' + $env:PATH

$bt = Join-Path $sdk 'build-tools\34.0.0'
$androidJar = Join-Path $sdk 'platforms\android-34\android.jar'
foreach ($file in @("$bt\aapt2.exe", "$bt\d8.bat", "$bt\zipalign.exe", "$bt\apksigner.bat", $androidJar)) {
    if (-not (Test-Path $file)) { throw "missing: $file" }
}

$javac = Join-Path $jdkHome 'bin\javac.exe'
$keytool = Join-Path $jdkHome 'bin\keytool.exe'
$python = 'D:\python\python.exe'
if (-not (Test-Path $python)) { $python = 'python' }

# ZXing core (pure Java QR decoder)
$zxing = Join-Path $libs 'zxing-core-3.5.3.jar'
if (-not (Test-Path $zxing)) {
    New-Item -ItemType Directory -Force -Path $libs | Out-Null
    Write-Host '[lib] downloading zxing-core-3.5.3.jar'
    Invoke-WebRequest -Uri 'https://repo1.maven.org/maven2/com/google/zxing/core/3.5.3/core-3.5.3.jar' `
        -OutFile $zxing -UseBasicParsing
}

if (Test-Path $build) { Remove-Item $build -Recurse -Force }
New-Item -ItemType Directory -Force -Path "$build\gen", "$build\classes", "$build\dex" | Out-Null

Write-Host '[1/6] aapt2 compile resources'
& "$bt\aapt2.exe" compile --dir "$app\res" -o "$build\res.zip"
if ($LASTEXITCODE -ne 0) { throw 'aapt2 compile failed' }

Write-Host '[2/6] aapt2 link'
& "$bt\aapt2.exe" link `
    -o "$build\base.apk" `
    -I $androidJar `
    --manifest "$app\AndroidManifest.xml" `
    --java "$build\gen" `
    --min-sdk-version 24 `
    --target-sdk-version 34 `
    --version-code $VersionCode `
    --version-name $VersionName `
    --no-version-vectors `
    "$build\res.zip"
if ($LASTEXITCODE -ne 0) { throw 'aapt2 link failed' }

Write-Host '[3/6] javac'
$sources = @()
$sources += Get-ChildItem "$app\src" -Recurse -Filter *.java | ForEach-Object { $_.FullName }
$sources += Get-ChildItem "$build\gen" -Recurse -Filter *.java | ForEach-Object { $_.FullName }
& $javac --release 8 -encoding UTF-8 -nowarn -classpath "$androidJar;$zxing" -d "$build\classes" @sources
if ($LASTEXITCODE -ne 0) { throw 'javac failed' }

Write-Host '[4/6] d8 dex'
$classes = @(Get-ChildItem "$build\classes" -Recurse -Filter *.class | ForEach-Object { $_.FullName })
& "$bt\d8.bat" --lib $androidJar --min-api 24 --output "$build\dex" @classes $zxing
if ($LASTEXITCODE -ne 0) { throw 'd8 failed' }

Write-Host '[5/6] pack + zipalign'
& $python "$root\pack.py" "$build\base.apk" "$build\dex\classes.dex" "$build\packed.apk"
if ($LASTEXITCODE -ne 0) { throw 'pack.py failed' }
& "$bt\zipalign.exe" -p -f 4 "$build\packed.apk" "$build\aligned.apk"
if ($LASTEXITCODE -ne 0) { throw 'zipalign failed' }

Write-Host '[6/6] sign'
if (-not $Keystore) { $Keystore = Join-Path $root 'signing\suiji.keystore' }
$ksAlias = 'suiji'
$ksPass = 'suiji123'
if (Test-Path $Keystore) {
    & $keytool -list -keystore $Keystore -storepass $ksPass 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        $ksAlias = 'xiaoben'
        $ksPass = 'xiaoben123'
    }
} else {
    New-Item -ItemType Directory -Force -Path (Split-Path $Keystore) | Out-Null
    $legacy = 'C:\Users\juyao\Documents\deepseek-harness\default-workspace\android-apk\signing\xiaoben.keystore'
    if (Test-Path $legacy) {
        Copy-Item $legacy $Keystore
        $ksAlias = 'xiaoben'
        $ksPass = 'xiaoben123'
        Write-Host '[sign] reused xiaoben.keystore'
    } else {
        & $keytool -genkeypair -keystore $Keystore -alias $ksAlias -keyalg RSA -keysize 2048 `
            -validity 10950 -storepass $ksPass -keypass $ksPass `
            -dname 'CN=Suiji, OU=Personal, O=Juyao, L=Shanghai, ST=Shanghai, C=CN'
        if ($LASTEXITCODE -ne 0) { throw 'keytool failed' }
    }
}
if (Test-Path "$root\$apkName.apk") {
    Remove-Item "$root\$apkName.apk" -Force -ErrorAction SilentlyContinue
}
& "$bt\apksigner.bat" sign `
    --ks $Keystore --ks-key-alias $ksAlias `
    --ks-pass "pass:$ksPass" --key-pass "pass:$ksPass" `
    --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true `
    --out "$root\$apkName.apk" "$build\aligned.apk"
if ($LASTEXITCODE -ne 0) { throw 'apksigner failed' }

& "$bt\apksigner.bat" verify --verbose --print-certs "$root\$apkName.apk"
if ($LASTEXITCODE -ne 0) { throw 'apksigner verify failed' }

if (-not $SkipPublish) {
    $publish = Join-Path $root '..\apps\web\src\public\downloads'
    if (Test-Path (Join-Path $root '..\apps\web\src')) {
        New-Item -ItemType Directory -Force -Path $publish | Out-Null
        Copy-Item "$root\$apkName.apk" (Join-Path $publish "$apkName.apk") -Force
        Write-Host "[publish] copied to $publish"
    }
}

$size = (Get-Item "$root\$apkName.apk").Length / 1KB
Write-Host ("OK -> {0}  ({1:N0} KB)" -f "$root\$apkName.apk", $size)
