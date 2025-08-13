import { userHashedId } from "@/features/auth/helpers";
import { OpenAIInstance } from "@/features/common/openai";
import { AI_NAME } from "@/features/theme/customise";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { similaritySearchVectorWithScore } from "./azure-cog-search/azure-cog-vector-store";
import { initAndGuardChatSession } from "./chat-thread-service";
import { CosmosDBChatMessageHistory } from "./cosmosdb/cosmosdb";
import { PromptGPTProps } from "./models";
import { getDepartment } from "@/features/documents/cosmos-db-dept-service";

const SYSTEM_PROMPT = `あなたは ${AI_NAME}です。ユーザーからの質問に対して日本語で丁寧に回答します。 \n`;

const CONTEXT_PROMPT = ({
  context,
  userQuestion,
}: {
  context: string;
  userQuestion: string;
}) => {
  return `
- Given the following extracted parts of a long document, create a final answer. \n
- If you don't know the answer, just say that you don't know. Don't try to make up an answer.\n
- You must always include a citation at the end of your answer and don't include full stop.\n
- Use the format for your citation {% citation items=[{name:"filename 1",id:"file id"}, {name:"filename 2",id:"file id"}] /%}\n 
----------------\n 
context:\n 
${context}
----------------\n 
question: ${userQuestion}`;
};

export const ChatAPIDoc = async (props: PromptGPTProps) => {
  const { lastHumanMessage, id, chatThread } = await initAndGuardChatSession(
    props
  );

  const openAI = OpenAIInstance();

  const userId = await userHashedId();

  let chatAPIModel = "";
  if (props.chatAPIModel === "GPT-3") {
    chatAPIModel = "gpt-35-turbo-16k";
  }else{
    chatAPIModel = "gpt-4o";
  }
 // console.log("Model_doc: ", process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME);
 // console.log("PromptGPTProps_doc: ", props.chatAPIModel);

  const chatHistory = new CosmosDBChatMessageHistory({
    sessionId: chatThread.id,
    userId: userId,
  });

  const history = await chatHistory.getMessages();
  const topHistory = history.slice(history.length - 30, history.length);

  const relevantDocuments = await findRelevantDocuments(
    lastHumanMessage.content,
    id,
    props.selectedDepartmentId
  );

  const context = relevantDocuments
    .map((result, index) => {
      const content = result.pageContent.replace(/(\r\n|\n|\r)/gm, "");
      const context = `[${index}]. file name: ${result.metadata} \n file id: ${result.id} \n ${content}`;
      return context;
    })
    .join("\n------\n");

  try {
    const response = await openAI.chat.completions.create({
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        ...topHistory,
        {
          role: "user",
          content: CONTEXT_PROMPT({
            context,
            userQuestion: lastHumanMessage.content,
          }),
        },
      ],
      //model: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
      model: chatAPIModel,
      stream: true,
    });

    const stream = OpenAIStream(response, {
      async onCompletion(completion) {
        await chatHistory.addMessage({
          content: lastHumanMessage.content,
          role: "user",
        });

        await chatHistory.addMessage(
          {
            content: completion,
            role: "assistant",
          },
          context
        );
      },
    });

    return new StreamingTextResponse(stream);
  } catch (e: unknown) {
    if (e instanceof Error) {
      return new Response(e.message, {
        status: 500,
        statusText: e.toString(),
      });
    } else {
      return new Response("An unknown error occurred.", {
        status: 500,
        statusText: "Unknown Error",
      });
    }
  }
};

const findRelevantDocuments = async (query: string, chatThreadId: string, selectedDepartmentId?: string) => {
  let filter = `chatType eq 'doc'`;
  
  // 部門が選択されている場合は、その部門のドキュメントのみを検索
  if (selectedDepartmentId && selectedDepartmentId.trim() !== "" && selectedDepartmentId !== "all") {
    // 部門IDから部門名を取得
    const department = await getDepartment(selectedDepartmentId);
    if (department) {
      filter += ` and deptName eq '${department.name}'`;
      console.log('Filtering by department:', department.name);
    } else {
      console.log('Department not found for ID:', selectedDepartmentId);
    }
  } else {
    console.log('No department selected or "all" selected, searching all departments');
  }
  
  console.log('AI Search filter:', filter);
  
  // デバッグ用：まずフィルターなしで全ドキュメントを確認
  console.log('=== DEBUG: Checking all documents in AI Search ===');
  const allDocuments = await similaritySearchVectorWithScore(query, 10, {
    filter: `chatType eq 'doc'`,
  });
  console.log('All documents found:', allDocuments.length);
  allDocuments.forEach((doc, index) => {
    console.log(`Document ${index}:`, {
      id: doc.id,
      chatType: doc.chatType,
      deptName: doc.deptName,
      metadata: doc.metadata,
      pageContentLength: doc.pageContent?.length || 0
    });
  });
  
  // さらに詳細なデバッグ：chatType別の検索
  console.log('=== DEBUG: Checking documents by chatType ===');
  const documentTypeDocs = await similaritySearchVectorWithScore(query, 10, {
    filter: `chatType eq 'document'`,
  });
  console.log('Documents with chatType "document":', documentTypeDocs.length);
  
  const docTypeDocs = await similaritySearchVectorWithScore(query, 10, {
    filter: `chatType eq 'doc'`,
  });
  console.log('Documents with chatType "doc":', docTypeDocs.length);
  
  const relevantDocuments = await similaritySearchVectorWithScore(query, 10, {
    filter: filter,
  });
  
  console.log('Filtered documents found:', relevantDocuments.length);
  return relevantDocuments;
};

