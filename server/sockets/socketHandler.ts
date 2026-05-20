import { Server, Socket } from "socket.io";

export default function registerSocketHandler(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`Socket connection handshake verified: ${socket.id}`);

    // Join a client into a designated order room for isolated updates
    socket.on("joinOrderRoom", (orderId: string) => {
      socket.join(String(orderId));
      console.log(`Client [${socket.id}] joined order tracking channel: ${orderId}`);
    });

    // Handle order status transitions and coordinates push from delivery partners
    socket.on("updateOrderStatus", ({ orderId, updatedStatus, partnerLocation }) => {
      console.log(`Socket updateOrderStatus received for [${orderId}]: status=${updatedStatus}`);

      // Broadcast immediately to anyone listening inside that specific order's tracking panel
      io.to(String(orderId)).emit("orderStatusChanged", {
        orderId,
        status: updatedStatus,
        location: partnerLocation,
        updatedAt: new Date().toISOString(),
      });

      // Synchronize overall order panels or active dashboards
      io.emit("globalOrderUpdate", {
        id: orderId,
        status: updatedStatus,
        location: partnerLocation,
        updatedAt: new Date().toISOString(),
      });
    });

    // Handle user disconnects
    socket.on("disconnect", () => {
      console.log(`Socket channel terminated: ${socket.id}`);
    });
  });
}
