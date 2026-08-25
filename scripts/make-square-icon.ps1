Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\sifaq\Downloads\logo-atlas.png"
$targetPng = "D:\Project\wealthypeople\scope\media\icon.png"
$targetWebview = "D:\Project\wealthypeople\scope\webview\src\assets\logo.png"

$src = [System.Drawing.Image]::FromFile($sourcePath)
Write-Host "Source: $($src.Width)x$($src.Height)"

function CreateSquareIcon([System.Drawing.Image]$source, [int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Fit height completely to canvas and center horizontally with transparent padding
    $scale = [double]$size / [double]$source.Height
    $drawW = [int]($source.Width * $scale)
    $drawH = $size
    $drawX = [int](($size - $drawW) / 2)
    $drawY = 0

    $g.DrawImage($source, $drawX, $drawY, $drawW, $drawH)
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

CreateSquareIcon $src 512 $targetPng
CreateSquareIcon $src 256 $targetWebview

$src.Dispose()

Write-Host "Generated Square media/icon.png: $((Get-Item $targetPng).Length) bytes"
Write-Host "Generated Square webview logo.png: $((Get-Item $targetWebview).Length) bytes"
