import { addLeadOfCampaignLemlist, getLemlistLeadBodyFromContactEmails } from "./../app/outreach/lemlist";
import { CampaignUrlModel } from "./../modules/campaign/Url.model";
import { ICampaignDoc, IUrlDoc } from "./../modules/campaign/campaign.interfaces";
import { IntegrationTypes } from "./../modules/integrations/integration.interfaces";
import IntegrationModel from "./../modules/integrations/integration.model";
import { writeEmailBody, writeEmailSubject } from "./../modules/langchain/email";
import { getEmailFromEmailFinderServices } from './emailFinder';
import { getVerifiedEmailAndFirstName } from "./emailVerifier";

export interface IContactEmail {
    email: string,
    firstName?: string,
    lastName?: string,
    position?: string
    companyName?: string,
    status?: string
}

export const searchWithDomain = async (campaign: ICampaignDoc, websiteUrlInfo: IUrlDoc) => {
    const { id: campaignId, emailSearchServiceCampaignId, emailSearchServiceIds, audienceFilters, objective, includeDetails, outreachAgentId, openAiIntegrationId, senderInformation, templates, gptModelTemperature = 0, modelName, emailVerifierId } = campaign;
    const { url, info } = websiteUrlInfo;
    const openAIIntegration = await IntegrationModel.findById(openAiIntegrationId);
    const outreachIntegration = await IntegrationModel.findById(outreachAgentId);
    if (!outreachIntegration || !openAIIntegration) {
        return;
    }

    const contactEmails = await getEmailFromEmailFinderServices({ integrationIds: emailSearchServiceIds, audienceFilters, url });

    if (!contactEmails || !contactEmails?.length) {
        await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
            error: true,
            errorReason: "0 emails found"
        });
        return;
    }


    if (emailVerifierId && contactEmails?.[0]) {
        const firstContactEmail = contactEmails[0].email;
        const emailPassStatus = ["deliverable", "risky"]
        const verifiedResponse = await getVerifiedEmailAndFirstName(firstContactEmail, emailVerifierId);
        if (!emailPassStatus.includes(verifiedResponse.status)) {
            throw new Error(`${firstContactEmail} cannot be verified as it is in "${verifiedResponse.status}" state.`)
        }
        contactEmails[0].firstName = contactEmails[0].firstName ?? verifiedResponse.firstName ?? "";
    }

    await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
        emailExtracted: true,
        contactEmails
    });

    for (const contactEmail of contactEmails) {
        const emailBodies: string[] = [];
        const emailSubjects: string[] = [];
        for (const template of templates) {
            const recipientInformation = {
                recipientBusinessDomainURL: url,
                recipientBusinessSummary: info,
                recipientEmail: contactEmail["email"],
                recipientDesignation: contactEmail["position"],
                recipientName: contactEmail["firstName"] ?? ""
            }
            const emailBody = await writeEmailBody({
                template,
                senderInformation,
                recipientInformation,
                objective,
                includeDetails,
                openAIApiKey: openAIIntegration.accessToken,
                gptModelTemperature,
                modelName
            });

            const emailSubject = await writeEmailSubject({
                recipientInformation,
                emailBody,
                openAIApiKey: openAIIntegration.accessToken,
                gptModelTemperature,
                modelName
            })

            await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                emailSubject: emailSubject,
                emailBody: emailBody
            });
            emailBodies.push(emailBody);
            emailSubjects.push(emailSubject);
        }

        await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
            emailSubjects,
            emailBodies,
        });

        if (outreachIntegration.type === IntegrationTypes.LEMLIST) {
            const { accessToken } = outreachIntegration;
            const emailBody = emailBodies?.[0] ?? "";
            const emailSubject = emailSubjects?.[0] ?? "";
            const upgiantBody = getLemlistLeadBodyFromContactEmails(emailBody, emailSubject, contactEmail);
            // for (let i = 0; i < emailBodies.length; i++) {
            //     const emailBody = emailBodies[i];
            //     const emailSubject = emailSubjects[i] ?? "";
            //     if (emailBody) {
            //         upgiantBody["icebreaker"] = emailBody;
            //         upgiantBody[`upgiantEmailSubject`] = emailSubject;
            //     }
            // }

            await addLeadOfCampaignLemlist(accessToken, emailSearchServiceCampaignId, contactEmail["email"], upgiantBody)

            await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
                isCompleted: true,
                addedToOutreachAgent: true
            });
        }
        break;
    }
}

// (async () => {
//     const campaign = await CampaignModel.findById("6468cbf69b33fbb7a5942fa1");
//     const urlDoc = await UrlModel.findById("645921c3bc4333b9545fc505")
//     if (!campaign || !urlDoc) {
//         return;
//     }

//     const { objective, includeDetails, senderInformation, templates, gptModelTemperature = 0, modelName } = campaign;
//     const { info } = urlDoc;

//     for (const template of templates) {
//         const res = await writeSubjectAndBodyOfEmail({
//             template,
//             senderInformation,
//             recipientInformation: {
//                 recipientBusinessDomainURL: "https://upgiant.com",
//                 recipientBusinessSummary: info,
//                 recipientEmail: "sanjiv@upgiant.com",
//                 recipientDesignation: "CEO"
//             },
//             objective,
//             includeDetails,
//             openAIApiKey: "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",
//             gptModelTemperature,
//             modelName
//         })
//         console.log(res)

//     }
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