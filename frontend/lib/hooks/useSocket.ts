import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = (projectId?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // For now, let's disable socket connection since it's not working
    // We'll use polling for updates instead
    console.log('Socket connection temporarily disabled - using API polling');
    setIsConnected(false);
    return;
    
    const socketInstance = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
      path: '/api/socket',
      addTrailingSlash: false,
    });

    socketInstance.on('connect', () => {
      console.log('Connected to socket server');
      setIsConnected(true);
      
      // Join project room if projectId is provided
      if (projectId) {
        socketInstance.emit('join-project', projectId);
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      if (projectId) {
        socketInstance.emit('leave-project', projectId);
      }
      socketInstance.close();
    };
  }, [projectId]);

  // Join/leave project room when projectId changes
  useEffect(() => {
    if (socket && isConnected && projectId) {
      socket.emit('join-project', projectId);
      
      return () => {
        socket.emit('leave-project', projectId);
      };
    }
  }, [socket, isConnected, projectId]);

  return { socket, isConnected };
};