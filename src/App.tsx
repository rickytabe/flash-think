// src/App.tsx
import { useState, useRef, useEffect } from 'react';

interface Message {
  content: string;
  isUser: boolean;
  image?: string | null;
  displayedContent?: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>
    }
  }>;
}

const API_KEY = "AIzaSyC1_Y7NVC0cArwcde6eFifvN7NP0opUGo0";
const MODEL_NAME = "gemini-1.5-flash-latest";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

export default function App() {
  const [messages, setMessages] = useState<Message[]>([{
    content: "Hello! How can I help you today?",
    isUser: false
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const generateResponse = async (prompt: string) => {
    const parts = [{ text: prompt }];
    
    if (uploadedImage) {
      const base64Data = uploadedImage.split(',')[1];
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: base64Data
        }
      } as any);
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0.9
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("API Error:", error);
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !uploadedImage) return;

    // Add user message
    setMessages(prev => [...prev, {
      content: input,
      isUser: true,
      image: uploadedImage,
      displayedContent: input
    }]);

    setLoading(true);
    setInput('');
    
    try {
      const response = await generateResponse(input);
      
      setMessages(prev => [...prev, {
        content: response,
        isUser: false,
        displayedContent: ''
      }]);
    } finally {
      setLoading(false);
      setUploadedImage(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Simple formatting for newlines
  const formatContent = (text: string) => {
    return text.split('\n').map((line, i) => (
      <p key={i}>{line}</p>
    ));
  };
 // Add useEffect for typing animation
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage?.isUser && lastMessage?.displayedContent?.length !== lastMessage?.content.length) {
      setIsTyping(true);
      const targetContent = lastMessage?.content || '';
      let currentIndex = lastMessage?.displayedContent?.length || 0;

      const typeNextCharacter = () => {
        if (currentIndex < targetContent.length) {
          const newContent = targetContent.slice(0, currentIndex + 1);
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              ...newMessages[newMessages.length - 1],
              displayedContent: newContent
            };
            return newMessages;
          });
          currentIndex++;
          typingTimeout.current = setTimeout(typeNextCharacter, 100); // Adjust speed here
        } else {
          setIsTyping(false);
        }
      };

      typeNextCharacter();
    }

    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, [messages]);

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto p-4">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-800 mb-2">AI Assistant</h1>
          <p className="text-gray-600">Powered by Gemini API</p>
        </header>

        <div className="p-4 mb-6 overflow-y-auto">
          {messages.map((msg, i) => (
            <MessageComponent key={i} {...msg} />
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="sticky bottom-2 bg-white border-t border-gray-200 p-4 rounded-xl ">
          <div className="flex gap-2 mb-2">
            {uploadedImage && (
              <div className="relative">
                <img 
                  src={uploadedImage} 
                  alt="Preview" 
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <button
                  onClick={() => setUploadedImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-4 bottom">
            <label className="cursor-pointer text-blue-600 hover:text-blue-700 p-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/>
              </svg>
            </label>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={1}
            />

            <button
              onClick={handleSend}
              disabled={loading}
              className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center text-gray-600 mt-4">Generating response...</div>
        )}
      </div>
    </div>
  );
}

function MessageComponent({ displayedContent, content, isUser, image }: Message) {
  return (
    <div className={`flex gap-4 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <svg className="w-8 h-8 text-blue-600 flex-shrink-0" viewBox="0 0 24 24">
          <path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 12H7v-2h10v2zm0-3H7v-2h10v2zm0-3H7V6h10v2z"/>
        </svg>
      )}
      
      <div className={`p-4 rounded-xl max-w-[80%] ${
        isUser 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-800'
      }`}>
        {image && <img src={image} alt="Upload" className="mb-2 rounded-lg max-w-[200px]" />}
        <div className="whitespace-pre-wrap">
          {displayedContent || content}
        </div>
        {!isUser && displayedContent?.length !== content.length && (
          <span className="animate-pulse">█</span> // Typing cursor
        )}
      </div>

      {isUser && (
        <svg className="w-8 h-8 text-blue-600 flex-shrink-0" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
        </svg>
      )}
    </div>
  );
}