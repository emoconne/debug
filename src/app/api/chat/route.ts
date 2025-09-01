import { chatAPIEntry } from "@/features/chat/chat-services/chat-api-entry";

export async function POST(req: Request) {
  console.log('=== DEBUG: /api/chat POST called ===');
  const body = await req.json();
  console.log('Request body:', {
    chatType: body.chatType,
    id: body.id,
    messagesCount: body.messages?.length,
    lastMessage: body.messages?.[body.messages.length - 1]?.content
  });
  return await chatAPIEntry(body);
}
