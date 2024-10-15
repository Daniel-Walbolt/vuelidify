# Hard-coded input file path
input_file="./dist/index.mjs"

# Check if the input file exists
if [ ! -f "$input_file" ]; then
    echo "Error: File '$input_file' does not exist."
    exit 1
fi

# Create a temporary gzip file
temp_gzip_file=$(mktemp "${TMPDIR:-/tmp}/compressed.XXXXXX.gz")

# Compress the file
gzip -c "$input_file" > "$temp_gzip_file"

# Output the size of the compressed file
compressed_size=$(stat -c%s "$temp_gzip_file")
echo "Size of compressed file: $compressed_size bytes"

# Clean up temporary file
rm "$temp_gzip_file"
