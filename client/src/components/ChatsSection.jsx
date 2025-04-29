import React, { useEffect, useRef, useState } from "react";
import { saveAs } from "file-saver";
import {
  BiSearch,
  BsThreeDotsVertical,
  FaFile,
  FiImage,
  ImEnlarge2,
  IoMdAttach,
  IoMdSend,
  IoVideocamOutline,
  MdArrowBackIos,
  MdDeleteOutline,
  PiDownloadSimpleBold,
  RxCross2,
} from "../assets";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import moment from "moment";
import Loading from "./Loading";
import { getOpponentParticipant, limitChar } from "../utils";
import OutsideClickHandler from "react-outside-click-handler";
import { useConnectWebRtc } from "../context/WebRtcContext";
import ViewImage from "./ViewImage";

const MessageCont = ({ isOwnMessage, message }) => {
  const { deleteChatMessage } = useChat();
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [isOpenView, setIsOpenView] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const { user } = useAuth();

  const handleEnlargeClick = (url) => {
    setCurrentImageUrl(url);
    setIsOpenView(true);
  };

  return (
    <div className={`w-auto flex my-2`}>
      <div className={`flex ${isOwnMessage ? "ml-auto" : "mr-auto"}`}>
        <div
          className={`flex flex-col justify-center relative dark:bg-opacity-20 dark:bg-primary min-w-[120px] max-w-full bg-backgroundLight3 p-2 md:p-1 rounded-xl ${
            isOwnMessage ? "rounded-br-none" : "rounded-bl-none"
          } mb-5 ${isOwnMessage ? "order-2" : "order-1"}`}
        >
          {message.attachments?.length ? (
            <div className="flex gap-1 flex-wrap">
              {message.attachments?.map((file) => (
                <div key={file.url} className="flex flex-col">
                  <div>
                    {(() => {
                      const fileExtension = file.url
                        .split("/")
                        .pop()
                        .toLowerCase()
                        .split(".")
                        .pop();
                      const isImage = [
                        "jpg",
                        "jpeg",
                        "png",
                        "webp",
                        "gif",
                        "svg",
                      ].includes(fileExtension);

                      if (isImage) {
                        return (
                          <img
                            src={file.url}
                            loading="lazy"
                            className={`${
                              message.attachments?.length > 1
                                ? "size-44"
                                : "size-72 md:size-60"
                            } object-cover rounded-md`}
                          />
                        );
                      } else {
                        return (
                          <div className="flex flex-col items-center justify-center">
                            <FaFile className="text-3xl text-slate-400" />
                            <p>
                              {limitChar(file.url.split("/").pop(), 10)}.
                              {fileExtension}
                            </p>
                          </div>
                        );
                      }
                    })()}

                    {isOpenView && (
                      <ViewImage
                        openView={isOpenView}
                        setOpenView={setIsOpenView}
                        imageUrl={currentImageUrl}
                      />
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-3 rounded-sm">
                    <div
                      className="cursor-pointer"
                      onClick={() => handleEnlargeClick(file.url)}
                    >
                      <ImEnlarge2 className="dark:text-text_light_primary" />
                    </div>
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        saveAs(file.url, file.url.split("/").slice(-1));
                      }}
                    >
                      <PiDownloadSimpleBold className="text-xl dark:text-text_light_primary" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            ""
          )}
          <p className="p-2 md:p-2 text-base md:text-md text-slate-900 dark:text-slate-100">
            {message.content}
          </p>

          <div className="flex items-center gap-1 text-xs text-slate-400 absolute bottom-0 right-1">
            <span className="text-[10px]">
              {moment(message.createdAt).format('HH:mm')} • {
                moment(message.createdAt).calendar(null, {
                  sameDay: '[Today]',
                  lastDay: '[Yesterday]',
                  lastWeek: 'dddd',
                  sameElse: 'MMM D'
                })
              }
            </span>
            {isOwnMessage && (
              <span className="ml-1">
                {message.status === 'sending' && (
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  </svg>
                )}
                {message.status === 'sent' && (
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {message.status === 'delivered' && (
                  <div className="relative w-3 h-3">
                    {/* First checkmark */}
                    <svg className="absolute w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {/* Second checkmark (slightly offset) */}
                    <svg className="absolute w-3 h-3 text-gray-400 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {message.status === 'read' && (
                  <div className="relative w-3 h-3">
                    {/* First checkmark */}
                    <svg className="absolute w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {/* Second checkmark (slightly offset) */}
                    <svg className="absolute w-3 h-3 text-blue-500 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </span>
            )}
          </div>
        </div>
        <div className={`mx-3 md:mx-0 ${isOwnMessage ? "order-1" : "order-2"}`}>
          <div className="relative cursor-pointer text-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-300">
            <OutsideClickHandler
              onOutsideClick={() => setShowMessageMenu(false)}
            >
              <BsThreeDotsVertical
                onClick={() => setShowMessageMenu(!showMessageMenu)}
              />
              {showMessageMenu ? (
                <div className="text-slate-100 bg-text_dark_secondary p-2 text-sm rounded-md absolute top-0 -left-14">
                  <p
                    onClick={() => {
                      navigator.clipboard.writeText(message.content);
                      setShowMessageMenu(false);
                    }}
                    className="mb-1 hover:text-slate-300"
                  >
                    copy
                  </p>
                  <p
                    onClick={() => deleteChatMessage(message._id)}
                    className={`text-red-400 hover:text-red-500 ${
                      user._id !== message?.sender._id && "hidden"
                    }`}
                  >
                    Delete
                  </p>
                </div>
              ) : (
                ""
              )}
            </OutsideClickHandler>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ChatsSection() {
  const {
    messages,
    currentSelectedChat,
    loadingMessages,
    message,
    setMessage,
    sendChatMessage,
    attachments,
    setAttachments,
    removeFileFromAttachments,
    deleteUserChat,
    setIsChatSelected,
  } = useChat();
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [largeFileWarningShown, setLargeFileWarningShown] = useState(false);

  const opponentParticipant = getOpponentParticipant(
    currentSelectedChat.current?.participants,
    user._id
  );

  const opponentUsername = opponentParticipant?.username;
  const opponentProfilePictureUrl = opponentParticipant?.avatarUrl;

  const scrollToBottomRef = useRef();

  const scrollToBottom = () => {
    scrollToBottomRef.current?.scrollIntoView();
  };

  const { handleCall, setTargetUserId, targetUserId } = useConnectWebRtc();

  const handleCallButtonClick = async () => {
    if (opponentParticipant?._id) {
      setTargetUserId(opponentParticipant?._id);
    }
  };

  useEffect(() => {
    if (targetUserId) {
      handleCall();
    }
  }, [targetUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message && !attachments.length) return;

    setIsUploading(true);

    try {
      await sendChatMessage(
        currentSelectedChat.current._id,
        message,
        attachments
      );
      setMessage("");
      setAttachments([]);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append("attachments", file); // Changed to match backend field name

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      // Use the correct API endpoint for message attachments
      xhr.open("POST", `${import.meta.env.VITE_API_URL}/api/messages/${currentSelectedChat.current._id}`, true);
      xhr.setRequestHeader(
        "Authorization",
        `Bearer ${localStorage.getItem("token")}`
      );

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress((prevProgress) => ({
            ...prevProgress,
            [file.name]: progress,
          }));
          
          // Log progress for large files
          if (file.size > 100 * 1024 * 1024 && progress % 10 === 0) {
            console.log(`Uploading ${file.name}: ${progress}% complete`);
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            
            // Check if the response contains a duplicate file indicator
            if (response.isDuplicate) {
              // Show a notification that the file was already uploaded before
              console.log(`File ${file.name} was already uploaded before. Reusing existing file.`);
              
              // You could show a toast notification here
              if (window.confirm) {
                window.confirm(`File ${file.name} was already uploaded before. Reusing existing file to save bandwidth.`);
              }
            }
            
            setAttachments((prevAttachments) => [
              ...prevAttachments,
              { 
                name: file.name,
                size: file.size,
                type: file.type
              },
            ]);
            resolve(response);
          } catch (error) {
            console.error("Error parsing response:", error);
            reject(new Error("Invalid response format"));
          }
        } else {
          console.error("Upload failed with status:", xhr.status);
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        console.error("Network error during upload");
        reject(new Error("Network error"));
      };

      xhr.ontimeout = () => {
        console.error("Upload timed out");
        reject(new Error("Upload timed out"));
      };

      // Set a longer timeout for large files (5 minutes)
      xhr.timeout = 5 * 60 * 1000;

      xhr.send(formData);
    });
  };

  const handleAttachFiles = async (files) => {
    setIsUploading(true);
    
    try {
      // Check for large files (over 1GB) and show warning
      const largeFiles = Array.from(files).filter(file => file.size > 1024 * 1024 * 1024);
      
      if (largeFiles.length > 0 && !largeFileWarningShown) {
        const totalSize = largeFiles.reduce((sum, file) => sum + file.size, 0);
        const sizeInGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);
        
        const proceed = window.confirm(
          `You're about to upload ${largeFiles.length} large file(s) totaling ${sizeInGB}GB. ` +
          `This may take some time and the chat will show a progress indicator. Continue?`
        );
        
        if (!proceed) {
          setIsUploading(false);
          return;
        }
        
        setLargeFileWarningShown(true);
      }
      
      for (const file of files) {
        // Initialize progress for this file
        setUploadProgress((prevProgress) => ({
          ...prevProgress,
          [file.name]: 0,
        }));
        
        await handleFileUpload(file);
        
        // Mark as complete
        setUploadProgress((prevProgress) => ({
          ...prevProgress,
          [file.name]: 100,
        }));
      }
    } catch (error) {
      console.error("File upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="overflow-y-hidden">
      <div className="flex w-full items-center justify-between p-5 md:p-4 shadow-md md:shadow-xl">
        <div className="flex gap-3 items-center">
          <div onClick={() => setIsChatSelected(false)}>
            <MdArrowBackIos className="hidden md:block dark:text-white text-2xl" />
          </div>
          {currentSelectedChat.current.isGroupChat ? (
            <div className="w-10 relative h-10 flex-shrink-0 flex justify-start items-center flex-nowrap mr-3">
              {currentSelectedChat.current.participants
                .slice(0, 3)
                .map((participant, i) => (
                  <img
                    key={participant._id}
                    src={participant.avatarUrl}
                    className={`w-10 h-10 border-white rounded-full absolute outline outline-3 outline-black ${
                      i === 0
                        ? "left-0 z-30"
                        : i === 1
                        ? "left-2 z-20"
                        : i === 2
                        ? "left-4 z-10"
                        : ""
                    }`}
                  />
                ))}
            </div>
          ) : (
            <img
              className="size-10 rounded-full object-cover"
              src={opponentProfilePictureUrl}
              alt=""
              loading="lazy"
            />
          )}
          <h3 className="font-medium text-xl md:text-md text-slate-800 dark:text-white">
            {currentSelectedChat.current?.isGroupChat
              ? currentSelectedChat.current.name
              : opponentUsername}
          </h3>
        </div>

        <div className="text-xl flex gap-5 text-slate-800 dark:text-slate-100">
          <div className="cursor-pointer">
            <BiSearch />
          </div>
          <div className="cursor-pointer">
            {!currentSelectedChat.current?.isGroupChat && (
              <IoVideocamOutline onClick={handleCallButtonClick} />
            )}
          </div>
          <div className="cursor-pointer text-red-500">
            {currentSelectedChat.current?.admin.toString() === user._id ? (
              <MdDeleteOutline
                onClick={() => deleteUserChat(currentSelectedChat.current?._id)}
              />
            ) : (
              ""
            )}
          </div>
        </div>
      </div>
      <div className="chat-msg-cont relative overflow-auto px-4 md:px-2 w-full h-[calc(100vh-180px)] md:h-[calc(100vh-260px)]">
        {loadingMessages ? (
          <div className="h-full w-full flex items-center justify-center">
            <Loading />
          </div>
        ) : !messages?.length ? (
          <div className="h-full w-full flex items-center justify-center">
            <h1 className="text-2xl text-slate-400 dark:text-slate-500">
              No Messages Yet...
            </h1>
          </div>
        ) : (
          <div>
            {messages?.reduce((result, msg, index, array) => {
              // Add date separator if this is the first message or if the date is different from the previous message
              const currentDate = moment(msg.createdAt).startOf('day');
              const prevDate = index > 0 ? moment(array[index - 1].createdAt).startOf('day') : null;
              
              if (index === 0 || !currentDate.isSame(prevDate, 'day')) {
                // Format the date
                let dateDisplay;
                if (currentDate.isSame(moment().startOf('day'))) {
                  dateDisplay = 'Today';
                } else if (currentDate.isSame(moment().subtract(1, 'days').startOf('day'))) {
                  dateDisplay = 'Yesterday';
                } else if (currentDate.isAfter(moment().subtract(7, 'days'))) {
                  dateDisplay = currentDate.format('dddd'); // Day name
                } else {
                  dateDisplay = currentDate.format('MMMM D, YYYY'); // Full date
                }
                
                // Add date separator
                result.push(
                  <div key={`date-${msg._id}`} className="flex justify-center my-4">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full px-3 py-1 text-xs text-gray-600 dark:text-gray-300">
                      {dateDisplay}
                    </div>
                  </div>
                );
              }
              
              // Add the message
              result.push(
                <MessageCont
                  key={msg._id}
                  isOwnMessage={msg.sender?._id === user?._id}
                  message={msg}
                />
              );
              
              return result;
            }, [])}
            <div ref={scrollToBottomRef} />
          </div>
        )}
      </div>
      {isUploading && <Loading />} {/* Display loading component */}
      {!!attachments.length && (
        <div className="showAttachmentFiles absolute bottom-24 grid grid-cols-5 gap-2">
          {attachments?.map((file, index) => (
            <div
              key={index}
              className="px-2 bg-slate-900 bg-opacity-50 rounded-md flex flex-col items-center"
            >
              <div className="text-red-500 w-full">
                <RxCross2
                  className="float-right text-2xl cursor-pointer"
                  onClick={() => removeFileFromAttachments(index)}
                />
              </div>
              {file.type.startsWith("image/") ? (
                <img
                  className="w-full h-auto object-cover"
                  src={URL.createObjectURL(file)}
                  alt=""
                />
              ) : (
                <div className="flex flex-col gap-2 my-5 items-center">
                  <FaFile className="text-3xl text-white" />
                  <p className="text-xs text-slate-400 dark:text-white">
                    {file.name}
                  </p>
                </div>
              )}
              <div className="w-full">
                <progress
                  value={uploadProgress[file.name] || 0}
                  max="100"
                  className="w-full h-4"
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="h-[90px] md:h-auto border-t shadow-xl dark:border-slate-500 light-upper-cont-shadow dark:dark-upper-cont-shadow bg-slate w-full flex items-center justify-between p-4 md:p-2">
        <div className="flex-1 mr-4 md:mr-2">
          <input
            type="text"
            placeholder="Enter Message..."
            className="w-full h-full px-4 py-2 md:p-2 md:text-sm rounded-lg dark:bg-slate-600 border border-transparent bg-backgroundLight3 focus:outline-none dark:text-white text-black"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendMessage();
            }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-4 md:space-x-2">
          <div>
            <label htmlFor="imageAttach" className="cursor-pointer">
              <FiImage className="text-primary text-2xl md:text-md hover:text-primary_hover" />
            </label>
            <input
              type="file"
              accept="image/*"
              id="imageAttach"
              hidden
              multiple
              onChange={(e) => setAttachments([...e.target.files])}
            />
          </div>
          <div>
            <label htmlFor="fileAttach" className="cursor-pointer">
              <IoMdAttach className="text-primary text-xl hover:text-primary_hover" />
            </label>
            <input
              type="file"
              id="fileAttach"
              hidden
              multiple
              onChange={(e) => handleAttachFiles(e.target.files)}
            />
          </div>

          <button
            disabled={!message && !attachments.length}
            onClick={handleSendMessage}
            className="bg-primary hover:bg-primary_hover transition-colors px-4 py-2 md:px-3 md:py-1 rounded-lg text-white"
          >
            <IoMdSend className="text-xl" />
          </button>
        </div>
      </div>
    </div>
  );
}
