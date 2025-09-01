using Microsoft.AspNetCore.Mvc;
using System.IO.Compression;

namespace TestProject.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FileManagerController : ControllerBase
    {
        private const string ROOT_PATH = "C:\\Users\\Bryon\\dev\\projects\\jobTests\\Browseable";

        public FileManagerController()
        {
            if (!Directory.Exists(ROOT_PATH))
            {
                Directory.CreateDirectory(ROOT_PATH);
            }
        }

        [HttpGet("browse")]
        public IActionResult Browse([FromQuery] BrowseQuery q)
        {
            try
            {
                var fullPath = GetFullPath(q.Path ?? "");
                if (!IsValidPath(fullPath))
                {
                    return BadRequest(new { error = "Invalid path" });
                }

                var items = new List<FileSystemItem>();
                GetFiles(Directory.EnumerateFiles(fullPath), items);
                GetDirs(Directory.EnumerateDirectories(fullPath), items);                

                return Ok(new
                {
                    currentPath = q.Path ?? "",
                    items = items.OrderBy(i => !i.IsDirectory).ThenBy(i => i.Name)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("search")]
        public IActionResult Search([FromQuery] SearchQuery q)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(q.Query))
                {
                    return BadRequest(new { error = "Search query is required" });
                }

                var results = new List<FileSystemItem>();
                if (q.IncludeFiles)
                {
                    GetFiles(Directory.EnumerateFiles(ROOT_PATH, $"*{q.Query}*", SearchOption.AllDirectories), results);
                }
                if (q.IncludeDirectories)
                {
                    GetDirs(Directory.EnumerateDirectories(ROOT_PATH, $"*{q.Query}*", SearchOption.AllDirectories), results);
                }
                
                return Ok(new
                {
                    q.Query,
                    results = results.OrderBy(r => !r.IsDirectory).ThenBy(r => r.Name)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpDelete("delete")]
        public IActionResult Delete([FromBody] DeleteRequest request)
        {
            try
            {
                var fullPath = GetFullPath(request.Path);
                if (!IsValidPath(fullPath))
                {
                    return BadRequest(new { error = "Invalid path" });
                }
                if (!System.IO.File.Exists(fullPath) && !Directory.Exists(fullPath))
                {
                    return NotFound(new { error = "File or directory not found" });
                }

                if (Directory.Exists(fullPath))
                {
                    Directory.Delete(fullPath, true);
                }
                else
                {
                    System.IO.File.Delete(fullPath);
                }

                return Ok(new { message = "Deleted successfully", path = request.Path });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("move")]
        public IActionResult Move([FromBody] MoveRequest request)
        {
            try
            {
                var sourcePath = GetFullPath(request.SourcePath);
                var destinationPath = GetFullPath(request.DestinationPath);

                if (!IsValidPath(sourcePath) || !IsValidPath(destinationPath))
                {
                    return BadRequest(new { error = "Invalid path" });
                }

                if (!System.IO.File.Exists(sourcePath) && !Directory.Exists(sourcePath))
                {
                    return NotFound(new { error = "Source not found" });
                }

                var destDir = Path.GetDirectoryName(destinationPath);
                if (!string.IsNullOrEmpty(destDir) && !Directory.Exists(destDir))
                {
                    Directory.CreateDirectory(destDir);
                }

                if (Directory.Exists(sourcePath))
                {
                    Directory.Move(sourcePath, destinationPath);
                }
                else
                {
                    System.IO.File.Move(sourcePath, destinationPath);
                }

                return Ok(new { message = "Moved successfully", from = request.SourcePath, to = request.DestinationPath });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("copy")]
        public IActionResult Copy([FromBody] CopyRequest request)
        {
            try
            {
                var sourcePath = GetFullPath(request.SourcePath);
                var destinationPath = GetFullPath(request.DestinationPath);

                if (!IsValidPath(sourcePath) || !IsValidPath(destinationPath))
                {
                    return BadRequest(new { error = "Invalid path" });
                }

                if (!System.IO.File.Exists(sourcePath) && !Directory.Exists(sourcePath))
                {
                    return NotFound(new { error = "Source not found" });
                }

                var destDir = Path.GetDirectoryName(destinationPath);
                if (!string.IsNullOrEmpty(destDir) && !Directory.Exists(destDir))
                {
                    Directory.CreateDirectory(destDir);
                }

                if (System.IO.File.Exists(destinationPath) && !request.Overwrite)
                {
                    destinationPath = Path.Combine(
                        Path.GetDirectoryName(destinationPath) ?? "",
                        $"{Path.GetFileNameWithoutExtension(destinationPath)}-Copy{Path.GetExtension(destinationPath)}");
                }

                if (Directory.Exists(sourcePath))
                {
                    CopyDirectory(sourcePath, destinationPath);
                }
                else
                {
                    System.IO.File.Copy(sourcePath, destinationPath, request.Overwrite);
                }

                return Ok(new { message = "Copied successfully", from = request.SourcePath, to = request.DestinationPath });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("createfolder")]
        public IActionResult CreateFolder([FromBody] CreateFolderRequest request)
        {
            try
            {
                var fullPath = GetFullPath(Path.Combine(request.ParentPath ?? "", request.FolderName));

                if (!IsValidPath(fullPath))
                {
                    return BadRequest(new { error = "Invalid path" });
                }

                if (Directory.Exists(fullPath))
                {
                    return BadRequest(new { error = "Folder already exists" });
                }

                Directory.CreateDirectory(fullPath);

                return Ok(new { message = "Folder created successfully", path = GetRelativePath(fullPath) });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("upload")]
        public async Task<IActionResult> Upload([FromForm] UploadRequest req, CancellationToken ct)
        {
            var fullPath = GetFullPath(req.Path);
            if (!IsValidPath(fullPath))
            {
                return BadRequest("Invalid path");
            }

            if (!Directory.Exists(fullPath))
            {
                return NotFound("Directory does not exist");
            }

            if (req.Files == null || req.Files.Count == 0)
            {
                return BadRequest("No files uploaded");
            }

            foreach (var file in req.Files)
            {
                var savePath = Path.Combine(fullPath, file.FileName);
                await using var stream = System.IO.File.Create(savePath);
                await file.CopyToAsync(stream, ct);
                Log($"Uploading file: {file.FileName}");
            }
            return Ok(new { message = "Upload successful" });
        }

        [HttpGet("download")]
        public IActionResult Download(string path)
        {
            var fullPath = GetFullPath(path);

            if (string.IsNullOrWhiteSpace(fullPath) || !System.IO.File.Exists(fullPath))
            {
                return NotFound();
            }
            
            var fileName = Path.GetFileName(fullPath);
            var contentType = "application/octet-stream";
            var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read);

            Log($"Downloading file: {fullPath}");
            return File(stream, contentType, fileName);
        }

        [HttpPost("download-batch")]
        public IActionResult DownloadBatch([FromBody] DownloadBatchRequest request)
        {
            if (request.Paths == null || request.Paths.Count == 0)
            {
                return BadRequest("No files selected");
            }

            var zipPath = Path.Combine(Path.GetTempPath(), $"download_{Guid.NewGuid()}.zip");

            try
            {
                using (var zip = ZipFile.Open(zipPath, ZipArchiveMode.Create))
                {
                    foreach (var relativePath in request.Paths)
                    {
                        var fullPath = GetFullPath(relativePath);

                        if (!IsValidPath(fullPath))
                        {
                            continue;
                        }

                        if (System.IO.File.Exists(fullPath))
                        {
                            zip.CreateEntryFromFile(fullPath, Path.GetFileName(fullPath));
                            Log($"Adding file to archive: {fullPath}");
                        }
                        else if (Directory.Exists(fullPath))
                        {
                            var dirInfo = new DirectoryInfo(fullPath);
                            AddDirectoryToZip(zip, dirInfo, dirInfo.Name);
                        }
                    }
                }

                var fileName = $"Download_{DateTime.Now:yyyyMMdd_HHmmss}.zip";
                var stream = new FileStream(zipPath, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, FileOptions.DeleteOnClose);

                return File(stream, "application/zip", fileName);
            }
            catch (Exception ex)
            {
                if (System.IO.File.Exists(zipPath))
                {
                    try 
                    { 
                        System.IO.File.Delete(zipPath);
                    } 
                    catch
                    { 
                        Console.WriteLine("Failed to delete temporary zip file.");
                    }
                }
                return StatusCode(500, new { error = ex.Message });
            }
        }

        private static void GetFiles(IEnumerable<string> files, List<FileSystemItem> results)
        {
            foreach (var file in files)
            {
                var fileInfo = new FileInfo(file);
                results.Add(new FileSystemItem
                {
                    Name = fileInfo.Name,
                    Path = GetRelativePath(file),
                    IsDirectory = false,
                    Size = fileInfo.Length,
                    LastModified = fileInfo.LastWriteTime,
                    Extension = fileInfo.Extension
                });
            }
        }

        private static void GetDirs(IEnumerable<string> dirs, List<FileSystemItem> results)
        {
            foreach (var dir in dirs)
            {
                var dirInfo = new DirectoryInfo(dir);
                results.Add(new FileSystemItem
                {
                    Name = dirInfo.Name,
                    Path = GetRelativePath(dir),
                    IsDirectory = true,
                    Size = 0,
                    LastModified = dirInfo.LastWriteTime,
                    Extension = null
                });
            }
        }

        private static void AddDirectoryToZip(ZipArchive zip, DirectoryInfo directory, string entryName)
        {
            foreach (var file in directory.GetFiles())
            {
                var fileEntryName = Path.Combine(entryName, file.Name).Replace('\\', '/');
                zip.CreateEntryFromFile(file.FullName, fileEntryName);
                Log($"Adding file to archive: {file.FullName}");
            }

            foreach (var subDir in directory.GetDirectories())
            {
                var subDirEntryName = Path.Combine(entryName, subDir.Name).Replace('\\', '/');
                AddDirectoryToZip(zip, subDir, subDirEntryName);
            }
        }

        private static string GetFullPath(string? relativePath)
        {
            if (string.IsNullOrEmpty(relativePath))
            {
                return ROOT_PATH;
            }

            relativePath = relativePath.TrimStart('/', '\\');
            return Path.Combine(ROOT_PATH, relativePath);
        }

        private static string GetRelativePath(string fullPath) =>
            Path.GetRelativePath(ROOT_PATH, fullPath).Replace('\\', '/');

        private static bool IsValidPath(string fullPath)
        {
            try
            {
                var normalizedPath = Path.GetFullPath(fullPath);
                var normalizedRoot = Path.GetFullPath(ROOT_PATH);
                return normalizedPath.StartsWith(normalizedRoot, StringComparison.OrdinalIgnoreCase);
            }
            catch { return false; }
        }

        private static void CopyDirectory(string sourceDir, string destinationDir)
        {
            var dir = new DirectoryInfo(sourceDir);
            if (!dir.Exists) 
            { 
                throw new DirectoryNotFoundException($"Source not found: {dir.FullName}");
            }

            Directory.CreateDirectory(destinationDir);
            foreach (var file in dir.GetFiles())
            {
                file.CopyTo(Path.Combine(destinationDir, file.Name), true);
            }

            foreach (var subDir in dir.GetDirectories())
            {
                CopyDirectory(subDir.FullName, Path.Combine(destinationDir, subDir.Name));
            }
        }

        private static void Log(string message) => Console.WriteLine($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {message}");
    }    
}
