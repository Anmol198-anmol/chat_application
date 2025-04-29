import { Types } from 'mongoose';
import fileRepo from '../database/repositories/fileRepo';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { db } from '../config';
import '../database'; // Initialize database connection

/**
 * This is a simple test script to verify the GridFS file storage implementation.
 * Run this script using ts-node to test file upload and retrieval.
 */
async function testFileStorage() {
  try {
    console.log('Starting file storage test...');
    
    // Wait for database connection to be established
    console.log('Waiting for database connection...');
    await new Promise<void>((resolve) => {
      if (mongoose.connection.readyState === 1) {
        resolve();
        return;
      }
      
      mongoose.connection.once('connected', () => {
        resolve();
      });
    });
    
    console.log('Database connected successfully');
    
    // Create a test file buffer
    const testContent = 'This is a test file content for GridFS storage';
    const testBuffer = Buffer.from(testContent);
    
    // Upload the file to GridFS
    console.log('Uploading test file to GridFS...');
    const fileId = await fileRepo.uploadFile(
      testBuffer,
      'test-file.txt',
      'text/plain',
      new Types.ObjectId('000000000000000000000000'), // Mock user ID
      'test-file.txt'
    );
    
    console.log(`File uploaded successfully with ID: ${fileId}`);
    
    // Retrieve the file metadata
    console.log('Retrieving file metadata...');
    const metadata = await fileRepo.getFileMetadata(fileId);
    console.log('File metadata:', metadata);
    
    // Retrieve the file
    console.log('Retrieving file content...');
    const { stream, file } = await fileRepo.getFileById(fileId);
    
    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const retrievedBuffer = Buffer.concat(chunks);
    const retrievedContent = retrievedBuffer.toString('utf-8');
    
    console.log('Retrieved file content:', retrievedContent);
    console.log('Original file content:', testContent);
    console.log('Content matches:', retrievedContent === testContent);
    
    // Delete the file
    console.log('Deleting file...');
    await fileRepo.deleteFile(fileId);
    console.log('File deleted successfully');
    
    console.log('File storage test completed successfully!');
    
    // Close the database connection
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error in file storage test:', error instanceof Error ? error.message : 'Unknown error');
    console.error(error);
    
    // Close the database connection even if there's an error
    await mongoose.connection.close();
  }
}

// Run the test
testFileStorage();