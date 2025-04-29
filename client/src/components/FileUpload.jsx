import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext"; // Assuming you already have auth context

const FileUpload = ({ onFileUploaded }) => {
  const { user } = useAuth();
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${user?.token}`,
          },
        }
      );

      onFileUploaded(response.data.fileUrl); // Pass the file URL to the parent component (Chat)
      setFile(null); // Reset file state
    } catch (error) {
      console.error("File upload failed:", error);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
};

export default FileUpload;
