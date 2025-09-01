namespace TestProject
{
    public class FileSystemItem
    {
        public string Name { get; set; } = "";
        public string Path { get; set; } = "";
        public bool IsDirectory { get; set; }
        public long Size { get; set; }
        public DateTime LastModified { get; set; }
        public string? Extension { get; set; }
    }

    public class BrowseQuery
    {
        public string? Path { get; set; } = "";
        public bool IncludeHidden { get; set; } = false;        
        public int? Page { get; set; }
        public int? PageSize { get; set; }
    }

    public class SearchQuery
    {
        public string Query { get; set; } = "";
        public bool IncludeFiles { get; set; } = true;
        public bool IncludeDirectories { get; set; } = true;
    }

    public class DeleteRequest
    {
        public string Path { get; set; } = "";
    }

    public class MoveRequest
    {
        public string SourcePath { get; set; } = "";
        public string DestinationPath { get; set; } = "";
    }

    public class CopyRequest
    {
        public string SourcePath { get; set; } = "";
        public string DestinationPath { get; set; } = "";
        public bool Overwrite { get; set; } = false;
    }

    public class CreateFolderRequest
    {
        public string ParentPath { get; set; } = "";
        public string FolderName { get; set; } = "";
    }

    public class UploadRequest
    {
        public string? Path { get; set; } = "";
        public List<IFormFile> Files { get; set; } = [];
    }

    public class DownloadBatchRequest
    {
        public List<string> Paths { get; set; } = [];
    }
}
