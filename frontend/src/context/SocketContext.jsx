import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

// Vite / CRA ডায়নামিক URL নির্ধারণ
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL 
  || process.env.REACT_APP_API_URL 
  || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // ⚡ Stable Connection Options with Transports Fallback
        const newSocket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'], // Polling fallback যুক্ত করা হলো
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('✅ Socket Connected Successfully ID:', newSocket.id);
        });

        newSocket.on('connect_error', (err) => {
            console.warn('⚠️ Socket Connection Warning:', err.message);
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);