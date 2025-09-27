import { Server as NetServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Socket as NetSocket } from 'net';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: NetSocket & {
    server: NetServer & {
      io: ServerIO;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function SocketHandler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const io = new ServerIO(res.socket.server);
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Join project room
      socket.on('join-project', (projectId: string) => {
        socket.join(`project-${projectId}`);
        console.log(`User joined project room: project-${projectId}`);
      });

      // Leave project room
      socket.on('leave-project', (projectId: string) => {
        socket.leave(`project-${projectId}`);
        console.log(`User left project room: project-${projectId}`);
      });

      // Handle new message
      socket.on('send-message', (data) => {
        console.log('New message:', data);
        // Broadcast to all users in the project room
        socket.to(`project-${data.projectId}`).emit('new-message', data.message);
      });

      // Handle typing indicator
      socket.on('typing', (data) => {
        socket.to(`project-${data.projectId}`).emit('user-typing', {
          userId: data.userId,
          userName: data.userName,
          isTyping: data.isTyping
        });
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
  }
  res.end();
}