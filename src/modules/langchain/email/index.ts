

import { LLMChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
} from "langchain/prompts";
import { humanPromptTemplateStringForFinalOutput, humanPromptTemplateStringForFinalOutputAgain, humanPromptTemplateStringForInitialOutput, systemPromptTemplateStringForFinalOutput, systemPromptTemplateStringForFinalOutputAgain, systemPromptTemplateStringForInitialOutput } from "./templates/email.template";


interface ISenderInformation {
    sendersName: string;
    sendersCompanyBusinessSummary: string;
    sendersCompanyDomainURL: string;
    sendersEmail: string;
    sendersProductService?: string;
}

interface IRecipientInformation {
    recipientEmail: string,
    recipientBusinessDomainURL: string,
    recipientBusinessSummary: string,
    recipientBusinessName?: string,
    recipientDesignation?: string | undefined,
    recipientName?: string,
}

interface IEmailCampaignArgs {
    template: string,
    openAIApiKey: string,
    senderInformation: ISenderInformation,
    recipientInformation: IRecipientInformation,
    objective?: string,
    includeDetails?: string,
    gptModelTemperature?: number,
}


export const writeSubjectAndBodyOfEmail = async ({ template, openAIApiKey, senderInformation, includeDetails = "", objective = "To write personalized email", recipientInformation, gptModelTemperature = 0 }: IEmailCampaignArgs) => {
    const { recipientBusinessSummary = "", recipientBusinessName = "", recipientDesignation = "", recipientEmail = "", recipientBusinessDomainURL = "", recipientName = "" } = recipientInformation;

    const chat = new ChatOpenAI({ temperature: gptModelTemperature, openAIApiKey });

    const { sendersName, sendersEmail = "", sendersCompanyBusinessSummary, sendersCompanyDomainURL = "", sendersProductService = "" } = senderInformation;

    const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(systemPromptTemplateStringForInitialOutput);
    const humanPromptTemplate = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateStringForInitialOutput);
    const chatPromptTemplate = ChatPromptTemplate.fromPromptMessages([systemPromptTemplate, humanPromptTemplate],);

    const initialEmailChain = new LLMChain({ llm: chat, prompt: chatPromptTemplate });

    const chat2 = new ChatOpenAI({ temperature: gptModelTemperature, openAIApiKey });

    const systemPromptTemplateForFinal = SystemMessagePromptTemplate.fromTemplate(systemPromptTemplateStringForFinalOutput);
    const humanPromptTemplateForFinal = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateStringForFinalOutput);
    const chatPromptTemplateForFinal = ChatPromptTemplate.fromPromptMessages([systemPromptTemplateForFinal, humanPromptTemplateForFinal]);
    const finalEmailChain = new LLMChain({ llm: chat2, prompt: chatPromptTemplateForFinal })

    const chat3 = new ChatOpenAI({ temperature: gptModelTemperature, openAIApiKey });

    const systemPromptTemplateForAnotherFinal = SystemMessagePromptTemplate.fromTemplate(systemPromptTemplateStringForFinalOutputAgain);
    const humanPromptTemplateForAnotherFinal = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateStringForFinalOutputAgain);
    const chatPromptTemplateForFinalAgain = ChatPromptTemplate.fromPromptMessages([systemPromptTemplateForAnotherFinal, humanPromptTemplateForAnotherFinal]);
    const finalEmailChainAgain = new LLMChain({ llm: chat3, prompt: chatPromptTemplateForFinalAgain });

    // const overall_chain = new ({ chains: [initial_email_chain, final_email_chain] });
    const initialResponse = await initialEmailChain.predict({
        template,
        recipientEmail,
        recipientBusinessDomainURL,
        recipientBusinessSummary,
        sendersName,
        sendersEmail,
        sendersCompanyDomainURL,
        sendersCompanyBusinessSummary,
        recipientBusinessName,
        recipientDesignation,
        recipientName,
        sendersProductService,
        objective,
        includeDetails,
    });

    const finalResponse = await finalEmailChain.predict({
        email: initialResponse
    })

    const finalResponseAgain = await finalEmailChainAgain.predict({
        email: finalResponse
    })

    return finalResponseAgain;
};



