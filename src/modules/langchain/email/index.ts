

import { LLMChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
    AIMessagePromptTemplate,
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
} from "langchain/prompts";
import { ICampaign } from "./../../../modules/campaign/campaign.interfaces";
import { humanPromptTemplateStringForInitialOutput, humanPromptTemplateStringForSecondPass, humanPromptTemplateStringForThirdPass, systemPromptTemplateStringForInitialOutput, systemPromptTemplateStringForSecondPass } from "./templates/email.template";


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
    template: ICampaign["templates"][0],
    openAIApiKey: string,
    senderInformation: ISenderInformation,
    recipientInformation: IRecipientInformation,
    objective?: string,
    includeDetails?: string,
    gptModelTemperature?: number,
    modelName?: string,
}


export const writeSubjectAndBodyOfEmail = async ({ template, openAIApiKey, senderInformation, includeDetails = "", recipientInformation, gptModelTemperature = 0 }: IEmailCampaignArgs) => {
    const { recipientBusinessSummary = "", recipientBusinessName = "", recipientDesignation = "", recipientEmail = "", recipientBusinessDomainURL = "", recipientName = "" } = recipientInformation;


    const llm = new ChatOpenAI({ temperature: gptModelTemperature, openAIApiKey });

    const { sendersName, sendersEmail = "", sendersCompanyBusinessSummary, sendersCompanyDomainURL = "", sendersProductService = "" } = senderInformation;

    const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(systemPromptTemplateStringForInitialOutput);
    const humanPromptTemplate = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateStringForInitialOutput);
    const chatPromptTemplate = ChatPromptTemplate.fromPromptMessages([systemPromptTemplate, humanPromptTemplate],);

    const initialEmailChain = new LLMChain({ llm, prompt: chatPromptTemplate });

    // sending only email body
    const initialResponse = await initialEmailChain.predict({
        template: `${template.body}`,
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
        includeDetails,
    });


    const systemPromptTemplateForSecondPass = SystemMessagePromptTemplate.fromTemplate(systemPromptTemplateStringForSecondPass);
    const humanPromptTemplateForSecondPass = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateStringForSecondPass);
    const chatPromptTemplateForSecondPass = ChatPromptTemplate.fromPromptMessages([systemPromptTemplateForSecondPass, humanPromptTemplateForSecondPass]);
    const secondEmailChain = new LLMChain({ llm, prompt: chatPromptTemplateForSecondPass })

    const secondResponse = await secondEmailChain.predict({
        email: initialResponse
    })


    const systemPromptTemplateForAnotherFinal = SystemMessagePromptTemplate.fromTemplate(systemPromptTemplateStringForSecondPass);
    const humanPromptTemplateForAnotherFinal = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateStringForSecondPass);
    const assistantTemplateForAnotherFinal = AIMessagePromptTemplate.fromTemplate(`${secondResponse}`)
    const humanTemplateForAnotherFinal = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateStringForThirdPass)

    const chatPromptTemplateThirdPass = ChatPromptTemplate.fromPromptMessages([systemPromptTemplateForAnotherFinal, humanPromptTemplateForAnotherFinal, assistantTemplateForAnotherFinal, humanTemplateForAnotherFinal]);

    const thirdEmailChain = new LLMChain({ llm, prompt: chatPromptTemplateThirdPass })

    const thirdResponse = await thirdEmailChain.predict({
        email: secondResponse
    })

    return thirdResponse;
};



