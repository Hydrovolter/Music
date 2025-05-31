import os

def get_file_type_for_codeblock(filename):
    """
    Determines a common language identifier for Markdown code blocks
    based on the file extension.
    """
    extension_map = {
        '.js': 'js',
        '.html': 'html',
        '.css': 'css',
        '.py': 'python',
        '.json': 'json',
        '.xml': 'xml',
        '.md': 'markdown',
        '.java': 'java',
        '.c': 'c',
        '.cpp': 'cpp',
        '.cs': 'csharp',
        '.go': 'go',
        '.php': 'php',
        '.rb': 'ruby',
        '.rs': 'rust',
        '.swift': 'swift',
        '.ts': 'typescript',
        '.sh': 'bash',
        '.txt': 'text', # For generic text files, or you can omit
        '.svg': 'xml', # SVGs are XML-based
        # Add more mappings as needed
    }
    _, ext = os.path.splitext(filename)
    return extension_map.get(ext.lower(), '') # Return empty string if no specific type

def generate_codebase_summary(root_dir, output_file, ignore_list=None, ignore_extensions=None):
    """
    Traverses a directory, reads file contents, and writes them to an output file
    in a specified format with Markdown code blocks.

    Args:
        root_dir (str): The root directory to traverse.
        output_file (str): The path to the output .txt file.
        ignore_list (list, optional): A list of directory or file names to ignore.
                                      Defaults to ['.git', '__pycache__', '.DS_Store', output_file_name].
        ignore_extensions (list, optional): A list of file extensions to ignore (e.g., ['.png', '.jpg']).
                                           Defaults to common binary image/font/compiled files.
    """
    if ignore_list is None:
        # Add the output file itself to the ignore list to prevent it from being included
        output_file_name = os.path.basename(output_file)
        ignore_list = ['.git', '.venv', 'venv', 'node_modules', '__pycache__', '.DS_Store', output_file_name]

    if ignore_extensions is None:
        ignore_extensions = [
            '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp',  # Images
            '.ico', # Favicons
            '.mp3', '.wav', '.ogg', '.mp4', '.mov', '.avi', # Media
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', # Documents
            '.zip', '.tar', '.gz', '.rar', # Archives
            '.exe', '.dll', '.so', '.o', '.class', # Compiled/binary
            '.woff', '.woff2', '.ttf', '.otf', '.eot', # Fonts
            '.DS_Store',
            '.txt', '.md', '.svg', '.py'
        ]
    ignore_extensions = [ext.lower() for ext in ignore_extensions]


    with open(output_file, 'w', encoding='utf-8') as outfile:
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Filter out ignored directories
            dirnames[:] = [d for d in dirnames if d not in ignore_list]

            for filename in filenames:
                if filename in ignore_list:
                    continue

                _, ext = os.path.splitext(filename)
                if ext.lower() in ignore_extensions:
                    continue

                file_path = os.path.join(dirpath, filename)
                # Get the relative path from the root_dir for cleaner output
                relative_file_path = os.path.relpath(file_path, root_dir)
                # Normalize path separators for consistency (e.g., use /)
                relative_file_path = relative_file_path.replace(os.sep, '/')


                outfile.write(f"{relative_file_path}\n")
                code_type = get_file_type_for_codeblock(filename)
                outfile.write(f"```{code_type}\n")
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as infile:
                        content = infile.read()
                        outfile.write(content)
                except Exception as e:
                    outfile.write(f"[Error reading file: {e}]\n")
                outfile.write("\n```\n\n") # Add a newline after content and before closing backticks
        print(f"Codebase summary successfully written to {output_file}")

if __name__ == "__main__":
    target_directory = "."  # Current directory. Change to your project's root if needed.
    # Example: target_directory = "/path/to/your/music_player_project"
    output_filename = "codebase_snapshot.txt"

    # Optional: Customize ignore lists
    # my_ignore_dirs_files = ['.git', 'dist', 'build', output_filename]
    # my_ignore_extensions = ['.log', '.tmp']

    # Ensure the target directory exists
    if not os.path.isdir(target_directory):
        print(f"Error: Directory '{target_directory}' not found.")
    else:
        generate_codebase_summary(target_directory, output_filename)
        # generate_codebase_summary(target_directory, output_filename, ignore_list=my_ignore_dirs_files, ignore_extensions=my_ignore_extensions)
