import IntegrationModel from "./../modules/integrations/integration.model";
import { ICampaign, ICampaignDoc } from "./../modules/campaign/campaign.interfaces";
import { parseCsv } from "./../modules/utils/csv-parser";
import { IntegrationTypes } from "./../modules/integrations/integration.interfaces";
import { addLeadToCampaignUsingLemlist } from "./../app/outreach/lemlist";
import { CampaignUrlModel } from "./../modules/campaign/Url.model";
import { writeEmailBodyUsingManualData, writeEmailSubjectForManualUpload } from "./../modules/langchain/email";

export const getCsvDataFromCampaign = async (campaignJson: ICampaign) => {
    const { manualUpload } = campaignJson;
    const result = await parseCsv(manualUpload);
    return result;
}

interface ICsvData {
    [x: string]: any

}

export const writeEmailAndPublishToLemlistUsingManualUpload = async (campaignJson: ICampaignDoc, csvData: ICsvData) => {
    const email = csvData["email"];
    const { templates, openAiIntegrationId, emailSearchServiceCampaignId, outreachAgentId, gptModelTemperature = 0, modelName, objective, includeDetails, senderInformation, id } = campaignJson;
    const openAIIntegration = await IntegrationModel.findById(openAiIntegrationId);
    const outreachIntegration = await IntegrationModel.findById(outreachAgentId);
    if (!outreachIntegration || !openAIIntegration) {
        return;
    }
    const emailBodies: string[] = [];
    const emailSubjects: string[] = [];
    for (const template of templates) {
        const recipientInformation = {
            recipientEmail: email,
        }
        const emailBody = await writeEmailBodyUsingManualData({
            template,
            senderInformation,
            recipientInformation,
            objective,
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
            emailBody: emailBody
        });
        emailBodies.push(emailBody);
        emailSubjects.push(emailSubject);
        if (outreachIntegration.type === IntegrationTypes.LEMLIST) {
            const { accessToken } = outreachIntegration;
            const rightOBody: { [x: string]: string } = {
                rightOCompanyName: "",
                rightODesignation: "",
                rightOFirstName: "",
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
