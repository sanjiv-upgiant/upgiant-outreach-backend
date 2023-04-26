

import { ChatOpenAI } from "langchain/chat_models/openai";
import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
} from "langchain/prompts";
import { humanPromptTemplateString, systemPromptTemplateString } from "./templates/email.template";


const chat = new ChatOpenAI({ temperature: 0.7 });

interface IEmailCampaignArgs {
    name: string,
    businessDomain: string,
    motive?: string,
    designation?: string,
    businessInfo?: string,
    businessName?: string,
    includeDetails?: string
}

export const writeSubjectAndBodyOfEmail = async ({ name, businessDomain, businessName = "", includeDetails = "", designation = "", motive = "To write personalized email", businessInfo = "" }: IEmailCampaignArgs) => {
    const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(systemPromptTemplateString);
    const humanPromptTemplate = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateString);
    const chatPromptTemplate = ChatPromptTemplate.fromPromptMessages([systemPromptTemplate, humanPromptTemplate])
    const chatMessages = await chatPromptTemplate.formatPromptValue({
        name,
        designation,
        businessDomain,
        businessName,
        businessInfo,
        motive,
        includeDetails
    });


    const response = await chat.call(chatMessages.toChatMessages());

    return removePlaceholders(response?.text || "");
}

const removePlaceholders = (text: string) => {
    return text.replace(/\[[^\]]*\]/g, '');
}

