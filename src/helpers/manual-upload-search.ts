import IntegrationModel from "./../modules/integrations/integration.model";
import { ICampaign, ICampaignDoc } from "./../modules/campaign/campaign.interfaces";
import { parseCsv } from "./../modules/utils/csv-parser";
import { IntegrationTypes } from "./../modules/integrations/integration.interfaces";
import { addLeadToCampaignUsingLemlist } from "./../app/outreach/lemlist";
import { CampaignUrlModel } from "./../modules/campaign/Url.model";
import { writeEmailBodyUsingManualData, writeEmailSubjectForManualUpload } from "./../modules/langchain/email";
import { getVerifiedEmailAndFirstName } from "./emailVerifier";
import { IEmailVerifierResponse } from "./../app/email-verifier/emailable";


interface ICsvData {
    [x: string]: any

}

export const getCsvDataFromCampaign = async (campaignJson: ICampaign) => {
    const { manualUpload } = campaignJson;
    const result = await parseCsv(manualUpload);
    return result;
}


export const writeEmailAndPublishToLemlistUsingManualUpload = async (campaignJson: ICampaignDoc, csvData: ICsvData) => {
    const email = csvData["email"];
    const { templates, openAiIntegrationId, outreachAgentId, gptModelTemperature = 0, modelName, includeDetails, senderInformation, id, emailSearchServiceCampaignId, emailVerifierId } = campaignJson;
    const openAIIntegration = await IntegrationModel.findById(openAiIntegrationId);
    const outreachIntegration = await IntegrationModel.findById(outreachAgentId);
    if (!outreachIntegration || !openAIIntegration) {
        return;
    }

    let verifiedResponse: IEmailVerifierResponse | null = null;
    if (emailVerifierId) {
        const emailPassStatus = ["deliverable", "risky"]
        verifiedResponse = await getVerifiedEmailAndFirstName(email, emailVerifierId);

        if (!emailPassStatus.includes(verifiedResponse.status)) {
            throw new Error(`${email} cannot be verified as it is in "${verifiedResponse.status}" state.`)
        }
    }

    const emailBodies: string[] = [];
    const emailSubjects: string[] = [];
    for (const template of templates) {
        const recipientInformation = {
            ...csvData,
        }
        const emailBody = await writeEmailBodyUsingManualData({
            email,
            template,
            senderInformation,
            recipientInformation,
            includeDetails,
            openAIApiKey: openAIIntegration.accessToken,
            gptModelTemperature,
            modelName
        });

        const emailSubject = await writeEmailSubjectForManualUpload({
            recipientInformation,
            emailBody,
            openAIApiKey: openAIIntegration.accessToken,
            gptModelTemperature,
            modelName
        })

        await CampaignUrlModel.findOneAndUpdate({ url: csvData["email"], campaignId: id }, {
            emailSubject: emailSubject,
            emailBody: emailBody,
            contactEmails: [{
                email
            }]
        });
        emailBodies.push(emailBody);
        emailSubjects.push(emailSubject);
        if (outreachIntegration.type === IntegrationTypes.LEMLIST) {
            const { accessToken } = outreachIntegration;
            const rightOBody: { [x: string]: string } = {
                rightOCompanyName: "",
                rightODesignation: "",
                rightOFirstName: verifiedResponse?.firstName ?? "",
                rightOLastName: "",
            };
            for (let i = 0; i < emailBodies.length; i++) {
                const emailBody = emailBodies[i];
                const emailSubject = emailSubjects[i] ?? "";
                if (emailBody) {
                    rightOBody["icebreaker"] = emailBody;
                    rightOBody[`rightOEmailSubject`] = emailSubject;
                }
            }

            await addLeadToCampaignUsingLemlist(accessToken, emailSearchServiceCampaignId, email, rightOBody)

            await CampaignUrlModel.findOneAndUpdate({ url: csvData["email"], campaignId: id }, {
                isCompleted: true
            });
        }
        break;
    }
}
