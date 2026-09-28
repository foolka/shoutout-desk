$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'assets'
New-Item -ItemType Directory -Path $assetDir -Force | Out-Null
$images = @()
foreach ($size in @(16, 24, 32, 48, 64, 128, 256)) {
    $bmp = [Drawing.Bitmap]::new($size, $size)
    $g = [Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([Drawing.Color]::Transparent)
    $shape = [Drawing.Drawing2D.GraphicsPath]::new()
    $r = [single]($size * .18)
    $edge = [single]($size - 1)
    $shape.AddArc(0, 0, $r, $r, 180, 90)
    $shape.AddArc($edge-$r, 0, $r, $r, 270, 90)
    $shape.AddArc($edge-$r, $edge-$r, $r, $r, 0, 90)
    $shape.AddArc(0, $edge-$r, $r, $r, 90, 90)
    $shape.CloseFigure()
    $brush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#76AA98'))
    $g.FillPath($brush, $shape)
    $font = [Drawing.Font]::new('Segoe UI', [single]($size*.69), [Drawing.FontStyle]::Bold, [Drawing.GraphicsUnit]::Pixel)
    $format = [Drawing.StringFormat]::new()
    $format.Alignment = [Drawing.StringAlignment]::Center
    $format.LineAlignment = [Drawing.StringAlignment]::Center
    $textBrush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#F7FFF9'))
    $g.DrawString('S', $font, $textBrush, [Drawing.RectangleF]::new(0, [single](-$size*.015), $size, $size), $format)
    $stream = [IO.MemoryStream]::new()
    $bmp.Save($stream, [Drawing.Imaging.ImageFormat]::Png)
    $images += ,@{ Size=$size; Bytes=$stream.ToArray() }
    if ($size -eq 256) { $bmp.Save((Join-Path $assetDir 'icon.png'), [Drawing.Imaging.ImageFormat]::Png) }
    $stream.Dispose(); $textBrush.Dispose(); $format.Dispose(); $font.Dispose(); $brush.Dispose(); $shape.Dispose(); $g.Dispose(); $bmp.Dispose()
}
$file = [IO.File]::Create((Join-Path $assetDir 'icon.ico'))
$writer = [IO.BinaryWriter]::new($file)
try {
    $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$images.Count)
    $offset = 6 + 16 * $images.Count
    foreach ($entry in $images) {
        $dim = if ($entry.Size -eq 256) { 0 } else { $entry.Size }
        $writer.Write([byte]$dim); $writer.Write([byte]$dim); $writer.Write([byte]0); $writer.Write([byte]0)
        $writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([uint32]$entry.Bytes.Length); $writer.Write([uint32]$offset)
        $offset += $entry.Bytes.Length
    }
    foreach ($entry in $images) { $writer.Write([byte[]]$entry.Bytes) }
} finally { $writer.Dispose(); $file.Dispose() }
Write-Output (Join-Path $assetDir 'icon.ico')
