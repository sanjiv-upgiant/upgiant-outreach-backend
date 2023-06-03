

import { LLMChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
    AIMessagePromptTemplate,
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
} from "langchain/prompts";
import { ICampaign } from "./../../../modules/campaign/campaign.interfaces";
import { humanPromptTemplateStringForInitialOutput, humanPromptTemplateStringForManualUpload, humanPromptTemplateStringForSecondPass, humanPromptTemplateStringForThirdPass, systemPromptTemplateStringForInitialOutput, systemPromptTemplateStringForManualUpload, systemPromptTemplateStringForSecondPass } from "./email-templates/email.template";
import { subjectSytemTemplateString, subjectUserTemplateString } from "./email-templates/subject.template";


export interface ISenderInformation {
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

interface ICreateEmailBodyArgs {
    template: ICampaign["templates"][0],
    senderInformation: ISenderInformation,
    recipientInformation: IRecipientInformation,
    objective?: string,
    includeDetails?: string,
    openAIApiKey: string,
    gptModelTemperature?: number,
    modelName?: string,
}

interface ICreateEmailSubjectArgs {
    recipientInformation: IRecipientInformation,
    emailBody: string,
    openAIApiKey: string,
    gptModelTemperature?: number,
    modelName?: string,
}

interface ICreateEmailBodyArgsManualUpload {
    template: ICampaign["templates"][0],
    senderInformation: ISenderInformation,
    recipientInformation: { [x: string]: any },
    objective?: string,
    includeDetails?: string,
    openAIApiKey: string,
    gptModelTemperature?: number,
    modelName?: string,
    email: string,
}

interface ICreateEmailSubjectArgsManualUpload {
    recipientInformation: { [x: string]: any },
    emailBody: string,
    openAIApiKey: string,
    gptModelTemperature?: number,
    modelName?: string,
}

export const writeEmailSubject = async ({ recipientInformation, emailBody, gptModelTemperature = 0, openAIApiKey, modelName = "gpt-3.5-turbo" }: ICreateEmailSubjectArgs) => {
    const { recipientBusinessSummary = "", recipientBusinessName = "", recipientDesignation = "", recipientBusinessDomainURL = "", recipientName = "" } = recipientInformation;

    const llm = new ChatOpenAI({ temperature: gptModelTemperature, openAIApiKey, modelName });
    const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(subjectSytemTemplateString);
    const humanPromptTemplate = HumanMessagePromptTemplate.fromTemplate(subjectUserTemplateString);
    const chatPromptTemplate = ChatPromptTemplate.fromPromptMessages([systemPromptTemplate, humanPromptTemplate]);
    const initialEmailChain = new LLMChain({ llm, prompt: chatPromptTemplate });

    const response = await initialEmailChain.predict({
        recipientName,
        recipientBusinessName,
        recipientDesignation,
        recipientBusinessDomainURL,
        recipientBusinessSummary,
        emailBody
    })

    return response;
}

export const writeEmailBody = async ({ template, openAIApiKey, senderInformation, includeDetails = "", recipientInformation, gptModelTemperature = 0, modelName = "gpt-3.5-turbo" }: ICreateEmailBodyArgs) => {
    const { recipientBusinessSummary = "", recipientBusinessName = "", recipientDesignation = "", recipientEmail = "", recipientBusinessDomainURL = "", recipientName = "" } = recipientInformation;

    const llm = new ChatOpenAI({ temperature: gptModelTemperature, openAIApiKey, modelName });

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

export const writeEmailBodyUsingManualData = async ({ template, openAIApiKey, senderInformation, includeDetails, gptModelTemperature = 0, modelName = "gpt-3.5-turbo", recipientInformation, objective, email }: ICreateEmailBodyArgsManualUpload) => {
    const llm = new ChatOpenAI({ temperature: gptModelTemperature, openAIApiKey, modelName });

    const { sendersName, sendersEmail = "", sendersCompanyBusinessSummary, sendersCompanyDomainURL = "", sendersProductService = "" } = senderInformation;

    const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(systemPromptTemplateStringForManualUpload);
    const humanPromptTemplate = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateStringForManualUpload);
    const chatPromptTemplate = ChatPromptTemplate.fromPromptMessages([systemPromptTemplate, humanPromptTemplate],);

    const initialEmailChain = new LLMChain({ llm, prompt: chatPromptTemplate });

    const initialResponse = await initialEmailChain.predict({
        template: `${template.body}`,
        email,
        recipientInformation: JSON.stringify(recipientInformation),
        sendersName,
        sendersEmail,
        sendersCompanyDomainURL,
        sendersCompanyBusinessSummary,
        sendersProductService,
        includeDetails,
        objective,
    });

    const systemPromptTemplateForSecondPass = SystemMessagePromptTemplate.fromTemplate(systemPromptTemplateStringForSecondPass);
    const humanPromptTemplateForSecondPass = HumanMessagePromptTemplate.fromTemplate(humanPromptTemplateStringForSecondPass);
    const chatPromptTemplateForSecondPass = ChatPromptTemplate.fromPromptMessages([systemPromptTemplateForSecondPass, humanPromptTemplateForSecondPass]);
    const secondEmailChain = new LLMChain({ llm, prompt: chatPromptTemplateForSecondPass })

    console.log(initialResponse, 'response');

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
}

export const writeEmailSubjectForManualUpload = async ({ recipientInformation, emailBody, gptModelTemperature = 0, openAIApiKey, modelName = "gpt-3.5-turbo" }: ICreateEmailSubjectArgsManualUpload) => {

    const llm = new ChatOpenAI({ temperature: gptModelTemperature, openAIApiKey, modelName });
    const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(subjectSytemTemplateString);
    const humanPromptTemplate = HumanMessagePromptTemplate.fromTemplate(subjectUserTemplateString);
    const chatPromptTemplate = ChatPromptTemplate.fromPromptMessages([systemPromptTemplate, humanPromptTemplate]);
    const initialEmailChain = new LLMChain({ llm, prompt: chatPromptTemplate });

    const response = await initialEmailChain.predict({
        recipientInformation: JSON.stringify(recipientInformation),
        emailBody
    })

    return response;
}



