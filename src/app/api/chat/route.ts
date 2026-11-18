import { openai } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateId, isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import {saveChat} from "@/lib/chat/cruds";
import {tools} from "@/lib/tools";

export async function POST(request: Request) {
  // TODO: pas de instructies aan, zodat de assistent ook je tools mag gebruiken en geen vacatures verzint
  const CONTEXT = 'Je bent een jobcoach. Antwoord in het nederlands in maximaal 5 zinnen. Beantwoord geen vragen die niks met werk te maken hebben.' +
      'Gebruik zoekVacatures als de gebruiker naar openstaande vacatures vraagt. Verzin nooit vacatures die er niet zijn.' +
      'Gebruik analyseerVacature als de gebruiker een vacaturetekst in de chat plakt.'
  const TEMPERATURE = 0.7
  const MAX_OUTPUT_TOKENS = 500

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: 'OPENAI_API_KEY ontbreekt. Zet deze in .env.local.' },
      { status: 500 },
    );
  }

  try {
    const { id, messages }: {id: string, messages: UIMessage[] } = await request.json();

    const recentMessages = messages.slice(-10);

    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages: await convertToModelMessages(recentMessages),
      instructions: CONTEXT,
      temperature: TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      tools,
      stopWhen: isStepCount(5),
      // TODO: voeg je tools toe, bijvoorbeeld tools: { zoekVacatures, analyseerVacature }
      // TODO: laat het model meerdere stappen zetten met stopWhen: isStepCount(...)
      onEnd: ({usage}) => {
        console.log("Input: ", usage.inputTokens)
        console.log("Output: ", usage.outputTokens)
      }
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        originalMessages: messages,
        generateMessageId: generateId,
        onError: (error) => {
          console.error('Fout bij OpenAI:', error);
          return 'Er ging iets mis bij het ophalen van een antwoord.';
        },
        onEnd: async ( { messages } ) => {
          try {
            await saveChat(id, messages)
          } catch (error) {
            console.error('Fout bij opslaan van chat:', error);
          }
        }
      }),
    });
  } catch (error) {
    console.error('Fout in /api/chat:', error);
    return Response.json({ error: 'Er ging iets mis.' }, { status: 500 });
  }
}
