import { userHashedId } from "@/features/auth/helpers";
import { OpenAIInstance } from "@/features/common/openai";
import { AI_NAME } from "@/features/theme/customise";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { similaritySearchVectorWithScore } from "./azure-cog-search/azure-cog-vector-store";
import { initAndGuardChatSession } from "./chat-thread-service";
import { CosmosDBChatMessageHistory } from "./cosmosdb/cosmosdb";
import { PromptGPTProps } from "./models";
import { getDepartment } from "@/features/documents/cosmos-db-dept-service";

const SYSTEM_PROMPT = `あなたは ${AI_NAME} です。企業内ドキュメント検索アシスタントとして、以下の指針に従って対応します：

1. 正確性：ドキュメントから得られた情報のみを回答に含め、推測や想像は避けます
2. 明確性：専門用語を使う場合は解説を付け、分かりやすい表現を心がけます
3. 構造化：重要な情報から順に論理的に情報を提示します
4. 透明性：情報源を明示し、複数の文書から情報を取得した場合は出典を区別して示します
5. 適切な範囲：ユーザーの権限レベルに応じた情報のみを提供します
6. 丁寧さ：敬語を用い、プロフェッショナルな対応を維持します

回答できない内容については、「その情報は提供されたドキュメントには含まれていません」と率直に伝えてください。
常に回答の最後には情報源の引用を必ず含めてください。`;

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

  let chatAPIModel = process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME || "gpt-4o";
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

  console.log('Relevant documents found:', relevantDocuments.length);
  console.log('First document sample:', relevantDocuments[0] ? {
    id: relevantDocuments[0].id,
    fileName: relevantDocuments[0].fileName,
    metadata: relevantDocuments[0].metadata,
    hasSasUrl: !!relevantDocuments[0].sasUrl,
    sasUrl: relevantDocuments[0].sasUrl
  } : 'No documents found');

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
      max_tokens: 4000,
      temperature: 0.7
    });

                const stream = OpenAIStream(response as any, {
              async onCompletion(completion) {
                try {
                  console.log('onCompletion started, processing completion...');
                  let processedCompletion = completion;
                  
                  for (const doc of relevantDocuments) {
                    try {
                      console.log(`Processing document ${doc.id}, has sasUrl: ${!!doc.sasUrl}`);
                      
                      // AI Searchの結果にsasUrlが含まれている場合は直接使用
                      if (doc.sasUrl) {
                        const placeholder = `SAS_URL_PLACEHOLDER_${doc.id}`;
                        processedCompletion = processedCompletion.replace(new RegExp(placeholder, 'g'), doc.sasUrl);
                        console.log(`Replaced placeholder for ${doc.id} with existing sasUrl`);
                      } else {
                        console.log(`No sasUrl found for document ${doc.id}, skipping replacement`);
                      }
                    } catch (error) {
                      console.error(`Failed to process SAS URL for document ${doc.id}:`, error);
                    }
                  }
              
                  console.log('Adding messages to chat history...');
                  await chatHistory.addMessage({
                    content: lastHumanMessage.content,
                    role: "user",
                  } as any);

                  await chatHistory.addMessage(
                    {
                      content: processedCompletion,
                      role: "assistant",
                    } as any,
                    context
                  );
                  console.log('Messages added to chat history successfully');
                } catch (error) {
                  console.error('Error in onCompletion callback:', error);
                }
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
      fileName: doc.fileName, // fileNameもログ出力
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

