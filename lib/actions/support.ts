"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createSupportTicket(data: {
  subject: string;
  category: string;
  message: string;
  priority?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const ticket = await db.supportTicket.create({
    data: {
      userId: session.user.id,
      subject: data.subject,
      category: data.category,
      priority: (data.priority as any) || "MEDIUM",
      messages: {
        create: {
          senderId: session.user.id,
          senderRole: "USER",
          content: data.message,
        },
      },
    },
  });

  await db.notification.create({
    data: {
      userId: session.user.id,
      title: "Support Ticket Created",
      message: `Ticket #${ticket.id.slice(-6).toUpperCase()} has been created. Our team will respond shortly.`,
      type: "SUPPORT",
    },
  });

  revalidatePath("/dashboard/support");
  return { success: true, ticketId: ticket.id };
}

export async function sendSupportMessage(ticketId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const ticket = await db.supportTicket.findFirst({
    where: { id: ticketId, userId: session.user.id },
  });

  if (!ticket) return { error: "Ticket not found" };

  await db.supportMessage.create({
    data: {
      ticketId,
      senderId: session.user.id,
      senderRole: "USER",
      content,
    },
  });

  await db.supportTicket.update({
    where: { id: ticketId },
    data: { status: "OPEN", updatedAt: new Date() },
  });

  revalidatePath(`/dashboard/support/${ticketId}`);
  return { success: true };
}

export async function getUserTickets(userId: string) {
  return db.supportTicket.findMany({
    where: { userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
}
