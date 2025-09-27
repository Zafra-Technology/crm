import { NextApiRequest } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';
import { Socket as NetSocket } from 'net';

export type NextApiResponseServerIO = {
  socket: NetSocket & {
    server: NetServer & {
      io: ServerIO;
    };
  };
} & any;

const SocketHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const io = new ServerIO(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Join project room
      socket.on('join-project', (projectId: string) => {
        socket.join(`project-${projectId}`);
        console.log(`User ${socket.id} joined project room: project-${projectId}`);
      });

      // Leave project room
      socket.on('leave-project', (projectId: string) => {
        socket.leave(`project-${projectId}`);
        console.log(`User ${socket.id} left project room: project-${projectId}`);
      });

      // Handle new message
      socket.on('send-message', (data) => {
        console.log('Broadcasting message to project:', data.projectId);
        // Broadcast to all users in the project room (including sender)
        io.to(`project-${data.projectId}`).emit('new-message', data.message);
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
};

export default SocketHandler;