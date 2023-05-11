import { getCacheDomainSearchedEmails, getSnovioAccessTokenIfNeeded, parseEmailsFromSnovIODomainSearch } from "./../app/email-search/snovio";
import { addLeadToCampaignUsingLemlist } from "./../app/outreach/lemlist";
import { CampaignUrlModel } from "./../modules/campaign/Url.model";
import { ICampaignDoc, IUrlDoc } from "./../modules/campaign/campaign.interfaces";
import { IntegrationTypes } from "./../modules/integrations/integration.interfaces";
import IntegrationModel from "./../modules/integrations/integration.model";
import { writeSubjectAndBodyOfEmail } from "./../modules/langchain/email";

export const searchWithDomain = async (campaign: ICampaignDoc, websiteUrlInfo: IUrlDoc) => {
    const { id: campaignId, emailSearchServiceId, emailSearchServiceCampaignId, audienceFilters, objective, includeDetails, outreachAgentId, openAiIntegrationId, senderInformation, templates } = campaign;
    const { url, info } = websiteUrlInfo;
    const emailSearchIntegration = await IntegrationModel.findById(emailSearchServiceId);
    const openAIIntegration = await IntegrationModel.findById(openAiIntegrationId);
    if (!openAIIntegration) {
        await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
            error: true,
            errorReason: "No openai integration found. Please add OpenAI access token"
        });
        return;
    }
    if (!emailSearchIntegration) {
        await CampaignUrlModel.findOneAndUpdate({ url, campaignId }, {
            error: true,
            errorReason: "No email search integration found. Please add one of email integration service."
        });
        return;
    }
    const positions: string[] = [];
    if (audienceFilters.position) {
        positions.push(audienceFilters.position);
    }

    let contactEmails: {
        firstName: string,
        lastName: string,
        email: string,
        position: string
        companyName: string,
    }[] = [];

    if (emailSearchIntegration.type === IntegrationTypes.SNOVIO) {
        const accessToken = await getSnovioAccessTokenIfNeeded(emailSearchIntegration.id, emailSearchIntegration.clientId, emailSearchIntegration.clientSecret);

        const domainSearchWithResults = await getCacheDomainSearchedEmails(emailSearchIntegration.id, accessToken, url, positions);
        contactEmails = parseEmailsFromSnovIODomainSearch(domainSearchWithResults);
    }

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

    const outreachIntegration = await IntegrationModel.findById(outreachAgentId);
    if (!outreachIntegration) {
        return;
    }

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
                openAIApiKey: openAIIntegration.accessToken
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
                rightOCompanyName: contactEmail["companyName"],
                rightODesignation: contactEmail["position"],
                rightOFirstName: contactEmail["firstName"],
                rightOLastName: contactEmail["lastName"],
            };
            for (let i = 0; i < emailBodies.length; i++) {
                const emailBody = emailBodies[i]?.replace("\n", "{{icebreaker}}");
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