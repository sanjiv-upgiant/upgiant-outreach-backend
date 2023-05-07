

import { LLMChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
} from "langchain/prompts";
import { humanPromptTemplateStringForFinalOutput, humanPromptTemplateStringForInitialOutput, systemPromptTemplateStringForFinalOutput, systemPromptTemplateStringForInitialOutput } from "./templates/email.template";




interface IEmailCampaignArgs {
    name: string,
    senderBusinessInformation: string,
    businessDomain: string,
    motive?: string,
    designation?: string,
    businessInfo?: string,
    businessName?: string,
    includeDetails?: string,
    openAIApiKey: string,
}

export const writeSubjectAndBodyOfEmail = async ({ name, businessDomain, openAIApiKey, senderBusinessInformation, businessName = "", includeDetails = "", designation = "", motive = "To write personalized email", businessInfo = "" }: IEmailCampaignArgs) => {
    const chat = new ChatOpenAI({ temperature: 0.7, openAIApiKey });
    const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(systemPromptTemplateStringForInitialOutput);
    const humanPromptTemplate = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateStringForInitialOutput);
    const chatPromptTemplate = ChatPromptTemplate.fromPromptMessages([systemPromptTemplate, humanPromptTemplate],);

    const initialEmailChain = new LLMChain({ llm: chat, prompt: chatPromptTemplate })

    const systemPromptTemplateForFinal = SystemMessagePromptTemplate.fromTemplate(systemPromptTemplateStringForFinalOutput);
    const humanPromptTemplateForFinal = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateStringForFinalOutput);
    const chatPromptTemplateForFinal = ChatPromptTemplate.fromPromptMessages([systemPromptTemplateForFinal, humanPromptTemplateForFinal]);
    const finalEmailChain = new LLMChain({ llm: chat, prompt: chatPromptTemplateForFinal })

    // const overall_chain = new ({ chains: [initial_email_chain, final_email_chain] });
    const initialResponse = await initialEmailChain.predict({
        name, designation, businessDomain, businessName, businessInfo, motive, includeDetails, senderBusinessInformation
    });


    const finalResponse = await finalEmailChain.predict({
        email: initialResponse
    })
    return finalResponse;
};



