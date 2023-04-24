

import { ChatOpenAI } from "langchain/chat_models/openai";
import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
} from "langchain/prompts";
import { humanPromptTemplateString, systemPromptTemplateString } from "./templates/email.template";


const chat = new ChatOpenAI({ temperature: 0.7 });

export const writeSubjectAndBodyOfEmail = async (emailMotive: string, summary: string, name: string) => {
    const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(systemPromptTemplateString);
    const humanPromptTemplate = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateString);
    const chatPromptTemplate = ChatPromptTemplate.fromPromptMessages([systemPromptTemplate, humanPromptTemplate])
    const chatMessages = await chatPromptTemplate.formatPromptValue({
        emailMotive,
        summary,
        name
    });

    const response = await chat.call(chatMessages.toChatMessages());
    return response.text;
}

