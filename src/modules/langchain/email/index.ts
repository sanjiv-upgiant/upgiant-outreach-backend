

import { LLMChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
} from "langchain/prompts";
import { humanPromptTemplateStringForFinalOutput, humanPromptTemplateStringForInitialOutput, humanPromptTemplateStringForSecondOutput, systemPromptTemplateStringForFinalOutput, systemPromptTemplateStringForInitialOutput, systemPromptTemplateStringForSecondOutput } from "./templates/email.template";


interface ISenderInformation {
    sendersName: string;
    sendersCompanyBusinessSummary: string;
    sendersEmail?: string;
    sendersCompanyDomainURL?: string;
    sendersProductService?: string;
}

interface IEmailCampaignArgs {
    name: string,
    template: string,
    senderInformation: ISenderInformation,
    businessDomain: string,
    objective?: string,
    designation?: string,
    businessInfo?: string,
    businessName?: string,
    includeDetails?: string,
    openAIApiKey: string,
}

export const writeSubjectAndBodyOfEmail = async ({ template, name, businessDomain, openAIApiKey, senderInformation, businessName = "", includeDetails = "", designation = "", objective = "To write personalized email", businessInfo = "" }: IEmailCampaignArgs) => {
    const chat = new ChatOpenAI({ temperature: 0.7, openAIApiKey });

    const { sendersName, sendersEmail = "", sendersCompanyBusinessSummary, sendersCompanyDomainURL = "", sendersProductService = "" } = senderInformation;

    const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(systemPromptTemplateStringForInitialOutput);
    const humanPromptTemplate = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateStringForInitialOutput);
    const chatPromptTemplate = ChatPromptTemplate.fromPromptMessages([systemPromptTemplate, humanPromptTemplate],);

    const initialEmailChain = new LLMChain({ llm: chat, prompt: chatPromptTemplate });


    const systemPromptTemplateSecond = SystemMessagePromptTemplate.fromTemplate(systemPromptTemplateStringForSecondOutput);
    const humanPromptTemplateSecond = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateStringForSecondOutput);
    const chatPromptTemplateSecond = ChatPromptTemplate.fromPromptMessages([systemPromptTemplateSecond, humanPromptTemplateSecond]);

    const secondEmailChain = new LLMChain({ llm: chat, prompt: chatPromptTemplateSecond });

    const systemPromptTemplateForFinal = SystemMessagePromptTemplate.fromTemplate(systemPromptTemplateStringForFinalOutput);
    const humanPromptTemplateForFinal = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateStringForFinalOutput);
    const chatPromptTemplateForFinal = ChatPromptTemplate.fromPromptMessages([systemPromptTemplateForFinal, humanPromptTemplateForFinal]);
    const finalEmailChain = new LLMChain({ llm: chat, prompt: chatPromptTemplateForFinal })

    // const overall_chain = new ({ chains: [initial_email_chain, final_email_chain] });
    const initialResponse = await initialEmailChain.predict({
        name, designation, businessDomain, businessName, businessInfo, objective, includeDetails, sendersName,
        sendersCompanyBusinessSummary, sendersCompanyDomainURL, sendersEmail, sendersProductService
    });

    const secondResponse = await secondEmailChain.predict({
        email: initialResponse,
        template
    })


    const finalResponse = await finalEmailChain.predict({
        email: secondResponse
    })

    return finalResponse;
};



