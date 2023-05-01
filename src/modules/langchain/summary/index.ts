import { ChatOpenAI } from "langchain/chat_models/openai";
import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
} from "langchain/prompts";
import { humanPromptTemplateString, systemPromptTemplateString } from "./templates/summary.template";



export const extractCompanySummaryFromTitleAndBody = async (title: string, body: string, openAIApiKey: string) => {
    const chat = new ChatOpenAI({ temperature: 0.7, openAIApiKey });
    const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(systemPromptTemplateString);
    const humanPromptTemplate = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateString);
    const chatPromptTemplate = ChatPromptTemplate.fromPromptMessages([systemPromptTemplate, humanPromptTemplate])
    const chatMessages = await chatPromptTemplate.formatPromptValue({
        title,
        body,
    });

    const response = await chat.call(chatMessages.toChatMessages());
    return response.text;
}

