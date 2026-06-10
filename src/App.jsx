// Complete React Chat Component
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [selectedModel, setSelectedModel] = useState('claude');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io('http://localhost:5000');

    socketRef.current.on('message_response', (data) => {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: data.userMessage.content, id: data.userMessage._id },
        { role: 'assistant', content: data.aiMessage.content, id: data.aiMessage._id, model: selectedModel }
      ]);
      setLoading(false);
    });

    socketRef.current.on('error', (error) => {
      console.error('Socket error:', error);
      setLoading(false);
    });

    return () => socketRef.current?.disconnect();
  }, [selectedModel]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
      createNewConversation(storedUserId);
    }
  }, []);

  const createNewConversation = async (uid) => {
    try {
      const response = await axios.post('http://localhost:5000/api/conversations', {
        userId: uid,
        title: `Chat - ${new Date().toLocaleString()}`
      });
      setConversationId(response.data._id);
      socketRef.current?.emit('join_conversation', { conversationId: response.data._id });
      setMessages([]);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !conversationId) return;

    // Add user message to UI immediately
    setMessages(prev => [...prev, { role: 'user', content: input, id: Date.now() }]);
    
    // Send via socket
    socketRef.current?.emit('send_message', {
      conversationId,
      message: input,
      model: selectedModel
    });

    setInput('');
    setLoading(true);
  };

  const handleSignup = async (email, password, name) => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/signup', {
        email, password, name
      });
      localStorage.setItem('userId', response.data.user._id);
      setUserId(response.data.user._id);
      createNewConversation(response.data.user._id);
    } catch (error) {
      console.error('Signup error:', error);
    }
  };

  if (!userId) {
    return <AuthForm onSignup={handleSignup} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">AI</span>
          </div>
          <h1 className="text-2xl font-bold text-white">ChatBot</h1>
        </div>
        
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-slate-600 transition"
        >
          <option value="gpt4">🟢 GPT-4</option>
  <option value="gemini">🟡 Gemini</option>
<option value="cohere">🔴 Cohere</option>
        </select>

        <button
          onClick={() => {
            localStorage.removeItem('userId');
            setUserId(null);
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-3xl font-bold text-white mb-2">Welcome to AI Chat</h2>
            <p className="text-slate-400 text-lg">Start a conversation with {selectedModel}</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
          >
            <div
              className={`max-w-md lg:max-w-xl px-6 py-3 rounded-lg shadow-md transition-all hover:shadow-lg ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-none'
                  : 'bg-slate-700 text-slate-100 rounded-bl-none'
              }`}
            >
              {msg.model && (
                <p className="text-xs opacity-70 mb-1 font-semibold">{msg.model}</p>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700 p-4 bg-slate-800">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 transition disabled:opacity-50"
            disabled={loading || !conversationId}
          />
          
          <button
            type="submit"
            disabled={loading || !input.trim() || !conversationId}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition font-semibold shadow-md hover:shadow-lg"
          >
            {loading ? '⏳' : '📤'}
          </button>

          <button
            type="button"
            onClick={() => createNewConversation(userId)}
            className="px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
          >
            ➕
          </button>
        </form>
      </div>
    </div>
  );
};

// Auth Form Component
const AuthForm = ({ onSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSignup(email, password, name);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <form onSubmit={handleSubmit} className="w-full max-w-md p-8 bg-slate-800 rounded-lg shadow-xl border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">🤖 AI Chat</h1>
        
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 mb-4 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
        />
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 mb-4 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
        />
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 mb-6 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
        />
        
        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 font-semibold transition shadow-md"
        >
          Sign Up & Chat
        </button>
      </form>
    </div>
  );
};

export default ChatApp;
