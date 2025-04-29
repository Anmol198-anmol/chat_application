# In-House File Sharing System Documentation

## Overview

This document provides detailed information about the in-house file sharing system implemented for the chat web application. The system ensures all shared files are stored in a centralized server database before being retrieved and sent to recipients, optimized for speed in LAN/offline environments.

## Architecture

The file sharing system uses MongoDB's GridFS for storing and retrieving files. GridFS is designed to store and retrieve large files efficiently, which makes it ideal for our file sharing requirements.

### Key Components

1. **File Model**: Defines the structure for file metadata storage
2. **File Repository**: Handles file operations (upload, download, delete)
3. **File Controller**: Exposes API endpoints for file operations
4. **Message Controller**: Integrates file sharing with messaging

## Implementation Details

### File Storage

Files are stored using MongoDB's GridFS, which divides files into chunks and stores them in two collections:

- `fs.files`: Stores file metadata
- `fs.chunks`: Stores the actual file content in chunks

### File Upload Process

1. When a user uploads a file, it's temporarily stored in memory (not on disk)
2. The file is then streamed to GridFS and stored in the database
3. A file ID is generated and associated with the message
4. The message is created with a reference to the file

### File Retrieval Process

1. When a user requests a file, the system retrieves it from GridFS
2. The file is streamed directly to the client without storing it locally
3. The client can display or download the file as needed

### File Deletion

When a message with attachments is deleted:

1. The system identifies all files associated with the message
2. Each file is deleted from GridFS
3. The message is then deleted from the database

## API Endpoints

### File Routes

- `GET /api/files/:fileId`: Retrieves a file by ID
- `GET /api/files/metadata/:fileId`: Retrieves file metadata

### Message Routes (with file handling)

- `POST /api/messages/:chatId`: Sends a message with optional file attachments
- `DELETE /api/messages/:messageId`: Deletes a message and its associated files

## Benefits

1. **Centralized Storage**: All files are stored in the database, not on user devices
2. **Optimized for LAN**: Direct streaming from the database provides fast access in local networks
3. **No Local Storage**: Files are not stored on the local filesystem
4. **Secure**: Files are only accessible through authenticated API endpoints
5. **Scalable**: GridFS can handle files of any size efficiently

## Performance Considerations

- **Chunking**: Files are automatically chunked for efficient storage and retrieval
- **Streaming**: Files are streamed directly to/from the database without intermediate storage
- **Indexing**: File metadata is indexed for fast retrieval
- **Memory Management**: Files are processed in memory to avoid disk I/O overhead

## Testing

A test script is provided at `backend/src/tests/fileStorage.test.ts` to verify the functionality of the file storage system. Run it using:

```bash
npx ts-node src/tests/fileStorage.test.ts
```

## Limitations and Future Improvements

1. **File Size Limits**: Currently limited to 50MB per file
2. **Caching**: Could implement caching for frequently accessed files
3. **Compression**: Could add compression for more efficient storage
4. **Encryption**: Could implement end-to-end encryption for sensitive files

## Conclusion

The in-house file sharing system provides a robust, efficient, and secure way to share files within the chat application. By leveraging MongoDB's GridFS, we've created a solution that meets all the requirements without relying on external services or local storage.
