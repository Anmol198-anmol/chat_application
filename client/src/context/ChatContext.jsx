import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  deleteChat,
  deleteMessage,
  getAllcurrentUserChats,
  getChatMessages,
  sendMessage,
} from "../api";
import { requestHandler } from "../utils";
import { useSocket } from "./SocketContext";

const chatContext = createContext();

// created a hook to use the chat context
export const useChat = () => useContext(chatContext);

export const ChatProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false); // state to store the socket connection status
  const [searchedUsers, setSearchedUsers] = useState(null); // state to store the stored users
  const [openAddChat, setOpenAddChat] = useState(false); // state to display the AddChat modal
  const [newChatUser, setNewChatUser] = useState(null); // storing the new user with chat is going to be created
  const [currentUserChats, setCurrentUserChats] = useState([]); // storing current user chats
  const [loadingChats, setLoadingChats] = useState(false); // state to manage loading while fetching the user chats
  const [loadingMessages, setLoadingMessages] = useState(false); // state to manage loading
  const [messages, setMessages] = useState([]); // state to store the chat messages
  const [message, setMessage] = useState(""); // state to store the current message
  const [attachments, setAttachments] = useState([]); // state to store files
  const [uploadProgress, setUploadProgress] = useState({}); // state to track file upload progress
  // state to manage the left menu activeSidebar has three values: ["profile", "recentChats", "searchUser"]
  const [activeLeftSidebar, setActiveLeftSidebar] = useState("recentChats");
  const [unreadMessages, setUnreadMessages] = useState({}); // track unread messages by chat ID

  // state for mobile responsive
  const [isChatSelected, setIsChatSelected] = useState(false);

  // ref to maintain the current selected chat
  const currentSelectedChat = useRef();

  const { socket, socketEvents } = useSocket();

  // get the current user chats
  const getCurrentUserChats = () => {
    requestHandler(
      async () => getAllcurrentUserChats(),
      setLoadingChats,
      (res) => {
        const { data } = res;
        setCurrentUserChats(data || []);
      },
      alert
    );
  };

  // function to get current selected chat messages
  const getMessages = (chatId) => {
    if (!chatId) return alert("no chat selected");

    if (!socket) return alert("socket connection not available");

    // emit an event to join the current chat
    socket.emit(socketEvents.JOIN_CHAT_EVENT, chatId);

    requestHandler(
      async () => await getChatMessages(chatId),
      setLoadingMessages,
      (res) => {
        const { data } = res;
        setMessages(data || []);

        // Mark messages as read when chat is opened
        markMessagesAsRead(chatId);

        // Clear unread count for this chat
        setUnreadMessages((prev) => ({
          ...prev,
          [chatId]: 0,
        }));
      },
      alert
    );
  };

  // Mark messages as read
  const markMessagesAsRead = (chatId) => {
    if (!socket || !chatId) return;

    // Emit event to server to mark messages as read
    socket.emit(socketEvents.MESSAGE_READ_EVENT, { chatId });
  };

  // update last message of the current selected chat with new message
  const updateLastMessageOfCurrentChat = (chatId, message) => {
    const updatedChat = currentUserChats?.find((chat) => chat._id === chatId);

    if (!updatedChat) return;

    updatedChat.lastMessage = message;
    updatedChat.updatedAt = message?.updatedAt;

    setCurrentUserChats((prevChats) =>
      prevChats.map((chat) => (chat._id === chatId ? updatedChat : chat))
    );
  };

  // delete message
  const deleteChatMessage = async (messageId) => {
    setMessages((prevMsgs) =>
      prevMsgs.filter((msg) => msg._id.toString() !== messageId.toString())
    );
    await requestHandler(
      async () => await deleteMessage(messageId),
      null,
      (res) => {},
      alert
    );
  };

  // delete chats
  const deleteUserChat = async (chatId) => {
    // alert message to confirm delete chat
    if (
      !window.confirm(
        "Are you sure you want to delete this chat? This action cannot be undone"
      )
    )
      return;

    const currentSelectedChatId = currentSelectedChat.current?._id;
    // set the current selected chat to null
    currentSelectedChat.current = null;

    // remove the chat from the current user chats
    setCurrentUserChats((prevChats) =>
      prevChats.filter((chat) => chat._id !== currentSelectedChatId)
    );

    // remove the messages of the deleted chat
    setMessages((prevMessages) =>
      prevMessages.filter((message) => message.chat !== currentSelectedChatId)
    );

    // request the server to delete the selected chat
    await requestHandler(
      async () => await deleteChat(currentSelectedChatId),
      null,
      (res) => {},
      alert
    );
  };

  // send message
  const sendChatMessage = async () => {
    if (!socket || !currentSelectedChat.current?._id) return;

    await requestHandler(
      async () =>
        await sendMessage(
          currentSelectedChat.current?._id,
          message,
          attachments
        ),
      null,
      (res) => {
        setMessage("");
        setAttachments([]);
        setMessages((prevMsgs) => [...prevMsgs, res.data]);

        // update the last message of the chat
        updateLastMessageOfCurrentChat(
          currentSelectedChat.current?._id,
          res.data
        );
      },
      alert
    );
  };

  // handle on message received event from server
  // ie when a new message is sent to the server and the server sends a event to participants of chat with current message

  const onMessageReceived = useCallback(
    (message) => {
      // Update the messages array when a new message event received from the server
      if (currentSelectedChat.current?._id === message.chat) {
        setMessages((prevMsgs) => [...prevMsgs, message]);
        // If we're currently viewing this chat, mark messages as read immediately
        markMessagesAsRead(message.chat);
        
        // If the message has upload status, track it
        if (message.uploadStatus) {
          setUploadProgress((prev) => ({
            ...prev,
            [message._id]: message.uploadStatus
          }));
        }
      } else {
        // Increment unread count for this chat
        setUnreadMessages((prev) => ({
          ...prev,
          [message.chat]: (prev[message.chat] || 0) + 1,
        }));
      }

      // Update the last message of the current chat
      updateLastMessageOfCurrentChat(message.chat, message);
    },
    [currentUserChats]
  );
  
  // Handle message updated event (for file upload completion)
  const onMessageUpdated = useCallback((updatedMessage) => {
    setMessages((prevMsgs) => 
      prevMsgs.map(msg => 
        msg._id === updatedMessage._id ? updatedMessage : msg
      )
    );
    
    // Update upload progress
    if (updatedMessage.uploadStatus) {
      setUploadProgress((prev) => ({
        ...prev,
        [updatedMessage._id]: updatedMessage.uploadStatus
      }));
    }
    
    // Update the last message of the chat
    updateLastMessageOfCurrentChat(updatedMessage.chat, updatedMessage);
  }, [currentUserChats]);
  
  // Handle upload progress updates
  const onUploadProgress = useCallback((progressData) => {
    const { messageId, uploadStatus } = progressData;
    
    setUploadProgress((prev) => ({
      ...prev,
      [messageId]: uploadStatus
    }));
  }, []);

  // handle when a message is deleted
  const onMessageDeleted = useCallback((payload) => {
    setMessages((prevMsgs) =>
      prevMsgs.filter(
        (msg) => msg._id.toString() !== payload.messageId.toString()
      )
    );
  }, []);

  // Handle message read updates from other users
  const onMessageReadUpdate = useCallback((data) => {
    // Update messages to show read status
    if (data.chatId && data.userId) {
      setMessages((prevMsgs) =>
        prevMsgs.map((msg) => {
          if (msg.chat === data.chatId && !msg.readBy?.includes(data.userId)) {
            return {
              ...msg,
              readBy: [...(msg.readBy || []), data.userId],
            };
          }
          return msg;
        })
      );
    }
  }, []);

  // handle searching users
  // const searchUsers = async (query) => {
  //   requestHandler(
  //     async () => await apiClient.get(`api/users/search/${query}`),
  //     null,
  //     (res) => {
  //       const { data } = res;
  //       setSearchedUsers(data || []);
  //     },
  //     alert
  //   );
  // };

  // handle removing file from attachments
  const removeFileFromAttachments = (index) => {
    setAttachments((prevAttachments) => [
      ...prevAttachments.slice(0, index),
      ...prevAttachments.slice(index + 1),
    ]);
  };

  useEffect(() => {
    if (!socket) return;

    // setup all the listeners for the socket events from server
    socket.on(socketEvents.CONNECTED_EVENT, () => setIsConnected(true));
    socket.on(socketEvents.DISCONNECT_EVENT, () => setIsConnected(false));
    socket.on(socketEvents.MESSAGE_RECEIVED_EVENT, onMessageReceived);
    socket.on(socketEvents.MESSAGE_UPDATED_EVENT, onMessageUpdated);
    socket.on(socketEvents.MESSAGE_DELETE_EVENT, onMessageDeleted);
    socket.on(socketEvents.MESSAGE_READ_UPDATE_EVENT, onMessageReadUpdate);
    socket.on(socketEvents.UPLOAD_PROGRESS_EVENT, onUploadProgress);

    return () => {
      // remove all the listeners for the socket events
      socket.off(socketEvents.CONNECTED_EVENT);
      socket.off(socketEvents.DISCONNECT_EVENT);
      socket.off(socketEvents.MESSAGE_RECEIVED_EVENT, onMessageReceived);
      socket.off(socketEvents.MESSAGE_UPDATED_EVENT, onMessageUpdated);
      socket.off(socketEvents.MESSAGE_DELETE_EVENT, onMessageDeleted);
      socket.off(socketEvents.MESSAGE_READ_UPDATE_EVENT, onMessageReadUpdate);
      socket.off(socketEvents.UPLOAD_PROGRESS_EVENT, onUploadProgress);
    };
  }, [
    socket,
    onMessageReceived,
    onMessageUpdated,
    onMessageDeleted,
    onMessageReadUpdate,
    onUploadProgress,
    socketEvents,
  ]);

  return (
    <chatContext.Provider
      value={{
        searchedUsers,
        setSearchedUsers,
        openAddChat,
        setOpenAddChat,
        newChatUser,
        setNewChatUser,
        currentUserChats,
        setCurrentUserChats,
        loadingChats,
        setLoadingChats,
        getCurrentUserChats,
        messages,
        setMessages,
        loadingMessages,
        getMessages,
        currentSelectedChat,
        message,
        setMessage,
        attachments,
        setAttachments,
        sendChatMessage,
        removeFileFromAttachments,
        activeLeftSidebar,
        setActiveLeftSidebar,
        deleteChatMessage,
        deleteUserChat,
        isChatSelected,
        setIsChatSelected,
        unreadMessages,
        markMessagesAsRead,
      }}
    >
      {children}
    </chatContext.Provider>
  );
};
