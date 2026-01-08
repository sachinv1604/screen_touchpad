import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Monitor, Wifi, WifiOff } from 'lucide-react';
import io from 'socket.io-client';

// CHANGE THIS TO YOUR LAPTOP'S IP ADDRESS
const SERVER_URL = 'http://10.143.66.177:3001';

const App = () => {
  const [mode, setMode] = useState('select');
  const [sessionId, setSessionId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 400, y: 300 });
  const [clicks, setClicks] = useState([]);
  
  const socketRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });

  // Generate QR Code URL
  const generateQRUrl = (id) => {
    const mobileUrl = `${window.location.origin}?mode=mobile&session=${id}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(mobileUrl)}`;
  };

  // Initialize based on URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    const sessionParam = params.get('session');
    
    if (modeParam === 'mobile' && sessionParam) {
      setMode('mobile');
      setSessionId(sessionParam);
      connectToSession(sessionParam, 'mobile');
    }
  }, []);

  // Connect to WebSocket server
  const connectToSession = (id, role) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
      socket.emit('join-session', { sessionId: id, role });
    });

    socket.on('device-connected', ({ role: connectedRole }) => {
      console.log(`${connectedRole} connected`);
      setIsConnected(true);
    });

    if (role === 'laptop') {
      // Listen for cursor movements
      socket.on('cursor-move', ({ dx, dy }) => {
        setCursorPos(prev => ({
          x: Math.max(0, Math.min(800, prev.x + dx)),
          y: Math.max(0, Math.min(600, prev.y + dy))
        }));
      });

      // Listen for clicks
      socket.on('cursor-click', () => {
        addClickEffect(cursorPos.x, cursorPos.y);
      });
    }

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });
  };

  const addClickEffect = (x, y) => {
    const clickId = Date.now();
    setClicks(prev => [...prev, { id: clickId, x, y }]);
    setTimeout(() => {
      setClicks(prev => prev.filter(c => c.id !== clickId));
    }, 500);
  };

  const startLaptopMode = () => {
    const id = Math.random().toString(36).substr(2, 9);
    setSessionId(id);
    setMode('laptop');
    connectToSession(id, 'laptop');
  };

  // Mobile touch handlers
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const dx = (touch.clientX - touchStartRef.current.x) * 2.5;
    const dy = (touch.clientY - touchStartRef.current.y) * 2.5;
    
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('cursor-move', {
        sessionId,
        dx,
        dy
      });
    }
    
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTap = () => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('cursor-click', { sessionId });
    }
  };

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Mode Selection Screen
  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
            Mobile Touchpad
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Turn your phone into a laptop touchpad
          </p>
          
          <div className="space-y-4">
            <button
              onClick={startLaptopMode}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition"
            >
              <Monitor size={24} />
              I'm on Laptop/Desktop
            </button>
            
            <div className="text-center text-sm text-gray-500">
              <p className="flex items-center justify-center gap-2">
                <Smartphone size={16} />
                Scan QR code with your phone
              </p>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              <Wifi size={14} className="inline mr-1" />
              Both devices must be on the same WiFi network
            </p>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 text-center">
              ⚠️ Update SERVER_URL in App.jsx with your laptop's IP
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Laptop Mode
  if (mode === 'laptop') {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="bg-indigo-600 text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Laptop Screen</h2>
                <p className="text-indigo-200 text-sm">Session: {sessionId}</p>
              </div>
              <div className="flex items-center gap-2">
                {isConnected ? <Wifi size={20} /> : <WifiOff size={20} />}
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`} />
                <span className="text-sm">{isConnected ? 'Connected' : 'Waiting...'}</span>
              </div>
            </div>
            
            <div className="p-8 flex gap-8">
              <div className="flex-shrink-0">
                <div className="bg-gray-100 p-6 rounded-lg">
                  <p className="text-center font-semibold mb-4 text-gray-700">
                    Scan with Mobile
                  </p>
                  <img 
                    src={generateQRUrl(sessionId)} 
                    alt="QR Code"
                    className="rounded border-4 border-white shadow-lg"
                  />
                  <p className="text-xs text-gray-500 text-center mt-4 max-w-[250px]">
                    Open your phone's camera and scan this code
                  </p>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200" style={{ height: '600px' }}>
                  <div className="absolute inset-0 rounded-lg overflow-hidden" style={{ cursor: 'none' }}>
                    {/* Cursor */}
                    <div
                      className="absolute w-6 h-6 pointer-events-none transition-all duration-75"
                      style={{
                        left: `${cursorPos.x}px`,
                        top: `${cursorPos.y}px`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="black" stroke="white" strokeWidth="1.5">
                        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                      </svg>
                    </div>
                    
                    {/* Click effects */}
                    {clicks.map(click => (
                      <div
                        key={click.id}
                        className="absolute w-12 h-12 border-4 border-indigo-500 rounded-full animate-ping opacity-75"
                        style={{
                          left: `${click.x}px`,
                          top: `${click.y}px`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      />
                    ))}
                    
                    {!isConnected && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <Monitor size={48} className="mx-auto mb-2 opacity-50" />
                          <p className="text-lg">Waiting for mobile connection...</p>
                          <p className="text-sm mt-2">Scan the QR code with your phone</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile Mode
  if (mode === 'mobile') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="bg-black bg-opacity-20 text-white p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Touchpad Active</h3>
              <p className="text-xs opacity-75">Session: {sessionId}</p>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? <Wifi size={20} /> : <WifiOff size={20} />}
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            </div>
          </div>
          
          <div 
            className="flex-1 relative select-none active:bg-white active:bg-opacity-5"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            style={{ touchAction: 'none' }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-white text-opacity-30 pointer-events-none">
              <div className="text-center">
                <Smartphone size={64} className="mx-auto mb-4" />
                <p className="text-xl font-semibold">Touch to move cursor</p>
                <p className="text-sm mt-2">Swipe anywhere on the screen</p>
              </div>
            </div>
          </div>
          
          <div className="bg-black bg-opacity-20 p-4">
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                handleTap();
              }}
              className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 active:bg-opacity-40 text-white font-semibold py-6 rounded-xl transition text-lg"
            >
              TAP TO CLICK
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default App;