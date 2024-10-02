# Define the directory you want to compress
$sourceDirectory = ".\dist\index.mjs"  # Change this to your directory
$tempGzipFile = [System.IO.Path]::GetTempFileName() + ".gz"  # Create a temp gzip file name

# Step 1: Compress the directory to a temporary gzipped file
# Create a temporary zip file first
$tempZipFile = [System.IO.Path]::GetTempFileName() + ".zip"

# Compress the directory to a zip file
Compress-Archive -Path "$sourceDirectory" -DestinationPath $tempZipFile

# Step 2: Gzip the temporary zip file
# Use gzip (via System.IO.Compression) to create a gzip file
Add-Type -AssemblyName System.IO.Compression.FileSystem

# Define a function to gzip the file
function Gzip-File {
    param (
        [string]$inputFile,
        [string]$outputFile
    )
    
    # Open input and output streams
    $inputStream = [System.IO.File]::OpenRead($inputFile)
    $outputStream = [System.IO.File]::Create($outputFile)
    $gzipStream = New-Object System.IO.Compression.GZipStream($outputStream, [System.IO.Compression.CompressionMode]::Compress)

    # Copy the input stream to the gzip stream
    $inputStream.CopyTo($gzipStream)

    # Clean up
    $gzipStream.Close()
    $outputStream.Close()
    $inputStream.Close()
}

# Gzip the temporary zip file
Gzip-File -inputFile $tempZipFile -outputFile $tempGzipFile

# Step 3: Measure the size of the gzipped file
$sizeBytes = (Get-Item $tempGzipFile).Length
$sizeKB = [math]::round($sizeBytes / 1KB, 2)  # Convert to KB

# Step 4: Output the size
Write-Host "Size of gzipped indexmjs: $sizeKB KB"

# Step 5: Clean up temporary files
Remove-Item $tempZipFile
Remove-Item $tempGzipFile
