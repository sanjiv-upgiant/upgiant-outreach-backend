import { addLeadToCampaignUsingLemlist } from "./../app/outreach/lemlist";
import { CampaignUrlModel } from "./../modules/campaign/Url.model";
import { ICampaignDoc, IUrlDoc } from "./../modules/campaign/campaign.interfaces";
import { IntegrationTypes } from "./../modules/integrations/integration.interfaces";
import IntegrationModel from "./../modules/integrations/integration.model";
import { writeSubjectAndBodyOfEmail } from "./../modules/langchain/email";
import { getEmailFromEmailFinderServices } from './emailFinder';

export interface IContactEmail {
    email: string,
    firstName?: string,
    lastName?: string,
    position?: string
    companyName?: string,
}

export const searchWithDomain = async (campaign: ICampaignDoc, websiteUrlInfo: IUrlDoc) => {
    const { id: campaignId, emailSearchServiceCampaignId, emailSearchServiceIds, audienceFilters, objective, includeDetails, outreachAgentId, openAiIntegrationId, senderInformation, templates, gptModelTemperature = 0 } = campaign;
    const { url, info } = websiteUrlInfo;
    const openAIIntegration = await IntegrationModel.findById(openAiIntegrationId);
    const outreachIntegration = await IntegrationModel.findById(outreachAgentId);
    if (!outreachIntegration || !openAIIntegration) {
        return;
    }

    const contactEmails = await getEmailFromEmailFinderServices({ integrationIds: emailSearchServiceIds, audienceFilters, url });

    if (!contactEmails?.length) {
        await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
            error: true,
            errorReason: "0 emails found"
        });
        return;
    }

    await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
        emailExtracted: true,
        contactEmails
    });

    for (const contactEmail of contactEmails) {
        const emailBodies: string[] = [];
        const emailSubjects: string[] = [];
        for (const template of templates) {
            const emailBody = await writeSubjectAndBodyOfEmail({
                template,
                senderInformation,
                recipientInformation: {
                    recipientBusinessDomainURL: url,
                    recipientBusinessSummary: info,
                    recipientEmail: contactEmail["email"],
                    recipientDesignation: contactEmail["position"]
                },
                objective,
                includeDetails,
                openAIApiKey: openAIIntegration.accessToken,
                gptModelTemperature
            });

            await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                emailSubject: "",
                emailBody: emailBody
            });
            emailBodies.push(emailBody);
            emailSubjects.push("");
        }

        await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
            emailSubjects,
            emailBodies
        });

        if (outreachIntegration.type === IntegrationTypes.LEMLIST) {
            const { accessToken } = outreachIntegration;
            const rightOBody: { [x: string]: string } = {
                rightOCompanyName: contactEmail["companyName"] ?? "",
                rightODesignation: contactEmail["position"] ?? "",
                rightOFirstName: contactEmail["firstName"] ?? "",
                rightOLastName: contactEmail["lastName"] ?? "",
            };
            for (let i = 0; i < emailBodies.length; i++) {
                const emailBody = emailBodies[i];
                if (emailBody) {
                    rightOBody[`rightOEmailSubject`] = "";
                    rightOBody["icebreaker"] = emailBody;
                }
            }

            await addLeadToCampaignUsingLemlist(accessToken, emailSearchServiceCampaignId, contactEmail["email"], rightOBody)

            await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                isCompleted: true
            });
        }
        break;
    }
}

// (async () => {
//     const emailSearchIntegration = await IntegrationModel.findById("645fbfee3b26e3133727c19b");
//     if (!emailSearchIntegration) {
//         return;
//     }
//     const url = "https://astrologyanswers.com";
//     const positions: string[] = [];
//     const res = await getCachedBulkEmailSearchFromApollo({
//         integrationId: emailSearchIntegration.id,
//         url,
//         positions,
//         accessToken: emailSearchIntegration.accessToken
//     });
//     console.log(res);
// })()

// addLemlistWebHookForGivenCampaign("cam_4mZJv5ZhJxveftjZT", "68dcf53be8461049e55ab2c3ed3e1fe5")

// (async () => {
//     const campaignModel = await CampaignModel.findById("645aa9ca441b918f72eab20f");
//     const campaingUrl = await CampaignUrlModel.findById("645aa9e7bc4333b9546029c7");
//     const urlDetail = await UrlModel.findOne({ url: campaingUrl?.url });
//     const openAIIntegration = await IntegrationModel.findById(campaignModel?.openAiIntegrationId);
//     if (campaignModel && campaingUrl && urlDetail && openAIIntegration) {
//         const contactEmail = campaingUrl.contactEmails[0];
//         await writeSubjectAndBodyOfEmail({
//             template: campaignModel.templates[0] || "",
//             senderInformation: campaignModel.senderInformation,
//             name: contactEmail["firstName"],
//             designation: contactEmail["position"],
//             businessName: contactEmail["companyName"],
//             businessInfo: JSON.stringify(urlDetail?.info || ""),
//             businessDomain: urlDetail.url,
//             objective: campaignModel.objective,
//             includeDetails: "",
//             openAIApiKey: openAIIntegration.accessToken
//         })
//     }
// })();