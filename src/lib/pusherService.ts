import pusher from "./pusher";
import { sendPushNotification } from "./pushNotifications";

export async function triggerNotification(
  userId: string,
  notification: {
    id: string;
    type: string;
    title: string;
    body: string;
    linkUrl?: string;
  },
) {
  try {
    await pusher.trigger(`user-${userId}`, "notification", notification);
    // إرسال إشعار المتصفح (PWA Push)
    await sendPushNotification(
      userId,
      notification.title,
      notification.body,
      notification.linkUrl,
    );
  } catch {
    // silent
  }
}

export async function triggerNewMessage(
  senderId: string,
  receiverId: string,
  message: { id: string; body: string; createdAt: string; sender: { id: string; name: string } },
) {
  try {
    await pusher.trigger(`user-${receiverId}`, "new-message", message);
    await pusher.trigger(`user-${senderId}`, "message-sent", message);
  } catch {
    // silent
  }
}

export async function triggerAssignmentUpdate(
  studentId: string,
  assignment: { id: string; subjectName: string; grade?: number; status: string },
) {
  try {
    await pusher.trigger(`user-${studentId}`, "assignment-update", assignment);
  } catch {
    // silent
  }
}

export async function triggerChannelEvent(
  channel: string,
  event: string,
  data: any,
) {
  try {
    await pusher.trigger(channel, event, data);
  } catch {
    // silent
  }
}
