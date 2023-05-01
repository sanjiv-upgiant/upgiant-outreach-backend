import { IntegrationOutputModel } from './../../integrations/integration.model';

import { ChatOpenAI } from "langchain/chat_models/openai";
import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
} from "langchain/prompts";
import { humanPromptTemplateString, systemPromptTemplateString } from "./templates/serp.template";



export const extractEmployeesInformationFromSerp = async (openAIApiKey: string, query: string, results: string) => {
    const chat = new ChatOpenAI({ temperature: 0.7, openAIApiKey });
    const storedResponse = await IntegrationOutputModel.findOne({ key: query });
    if (storedResponse) {
        return storedResponse.result;
    }
    const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(systemPromptTemplateString);
    const humanPromptTemplate = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateString);
    const chatPromptTemplate = ChatPromptTemplate.fromPromptMessages([systemPromptTemplate, humanPromptTemplate])
    const chatMessages = await chatPromptTemplate.formatPromptValue({
        query,
        results
    });

    const response = await chat.call(chatMessages.toChatMessages());
    await IntegrationOutputModel.create({
        key: query,
        result: response.text,
    })
    return response.text;
}

