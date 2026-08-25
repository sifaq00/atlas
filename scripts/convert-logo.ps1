Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\sifaq\Downloads\logo-atlas.png"
$targetPng = "D:\Project\wealthypeople\scope\media\icon.png"
$targetWebview = "D:\Project\wealthypeople\scope\webview\src\assets\logo.png"

$src = [System.Drawing.Image]::FromFile($sourcePath)
Write-Host "Source: $($src.Width)x$($src.Height)"

function CreateSquareImage([System.Drawing.Image]$source, [int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Calculate aspect ratio scale to fit inside square with 4% padding
    $innerSize = [double]($size * 0.94)
    $scale = [Math]::Min($innerSize / $source.Width, $innerSize / $source.Height)
    $drawW = [int]($source.Width * $scale)
    $drawH = [int]($source.Height * $scale)
    $drawX = [int](($size - $drawW) / 2)
    $drawY = [int](($size - $drawH) / 2)

    $g.DrawImage($source, $drawX, $drawY, $drawW, $drawH)
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

# 1. Generate 256x256 high-DPI square icon for VS Code Marketplace
CreateSquareImage $src 256 $targetPng

# 2. Generate 128x128 crisp square logo for Webview header
CreateSquareImage $src 128 $targetWebview

$src.Dispose()

Write-Host "Generated ${targetPng} : $((Get-Item $targetPng).Length) bytes"
Write-Host "Generated ${targetWebview} : $((Get-Item $targetWebview).Length) bytes"
