import Queue from 'bull';
import { cacheEmailsFinder, getCacheDomainSearchedEmails, getSnovioAccessTokenIfNeeded, parseEmailsFromSnovIODomainSearch, parseEmailsFromSnovIOEmailSearch } from './../app/email-search/snovio';
import { addLeadToCampaignUsingLemlist } from './../app/outreach/lemlist';
import { cacheSerpApiResponseWithQuery, parseSerpResponse } from './../app/serp/serpapi';
import UrlModel, { CampaignUrlModel } from './../modules/campaign/Url.model';
import { ICampaignDoc, SearchType, UrlStatus } from './../modules/campaign/campaign.interfaces';
import { IntegrationTypes } from './../modules/integrations/integration.interfaces';
import IntegrationModel from './../modules/integrations/integration.model';
import { writeSubjectAndBodyOfEmail } from './../modules/langchain/email';
import { extractCompanySummaryFromTitleAndBody } from './../modules/langchain/summary';
import { cleanupAllAxiosInstances } from './../modules/limitedAxios';
import { logger } from './../modules/logger';
import { extractTitleAndText } from './../modules/utils/url';
import scrape from './scraper';
import { extractEmployeesInformationFromSerp } from './../modules/langchain/serp';


// Create the Bull queue
const scrapeQueue = new Queue('scrape', { redis: { port: 6379, host: '127.0.0.1' } });
scrapeQueue.on('completed', (job) => {
    console.log(`Job ${job.id} completed with result`);
    cleanupAllAxiosInstances();
});

scrapeQueue.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed with error ${err}`);
});

// Process jobs in the queue
scrapeQueue.process(async (job) => {
    const { url, campaignJson, user } = job.data;
    const {
        searchType, emailSearchService, audienceFilters, objective, includeDetails, outreachAgent, id: campaign
    } = campaignJson as ICampaignDoc


    // Scrape the URL using Puppeteer
    let title = "";
    let body = "";
    let businessInfo = {};
    let status = UrlStatus.QUEUED;
    const urlFromDatabase = await UrlModel.findOne({ url });
    if (urlFromDatabase) {
        title = urlFromDatabase.title;
        body = urlFromDatabase.body;
        status = urlFromDatabase.status;
        businessInfo = urlFromDatabase.info;
    }
    else {
        const html = await scrape(url);
        const { title: urlTitle, body: urlBody } = extractTitleAndText(html);
        title = urlTitle;
        body = urlBody;
        await UrlModel.create({
            html,
            url,
            title: urlTitle,
            body: urlBody,
            status: UrlStatus.QUEUED
        });
    }

    await CampaignUrlModel.findOneAndUpdate({ campaign, url }, {
        campaign,
        url
    },
        { upsert: true }
    );

    if (status !== UrlStatus.SUMMARY_EXTRACTED) {
        const res = await extractCompanySummaryFromTitleAndBody(title, body)
        const companyInfo = JSON.parse(res);
        businessInfo = companyInfo;
        await UrlModel.findOneAndUpdate({ url }, {
            info: companyInfo,
            status: UrlStatus.SUMMARY_EXTRACTED
        }, { upsert: true });
    }

    if (searchType === SearchType.DOMAINS) {
        const emailSearchIntegration = await IntegrationModel.findOne({ user, type: emailSearchService });
        if (!emailSearchIntegration) {
            await CampaignUrlModel.findOneAndUpdate({ url, campaign }, {
                error: true,
                errorReason: "No email search integration found. Please add one of email integration service."
            });
            return;
        }
        const positions: string[] = [];
        if (audienceFilters.position) {
            positions.push(audienceFilters.position);
        }

        const accessToken = await getSnovioAccessTokenIfNeeded(emailSearchIntegration.id, emailSearchIntegration.clientId, emailSearchIntegration.clientSecret);

        const domainSearchWithResults = await getCacheDomainSearchedEmails(emailSearchIntegration.id, accessToken, url, positions);
        const contactEmails = parseEmailsFromSnovIODomainSearch(domainSearchWithResults);
        if (!contactEmails?.length) {
            await CampaignUrlModel.findOneAndUpdate({ url, campaign }, {
                error: true,
                errorReason: "0 emails found for given position"
            });
            return;
        }

        for (const email of contactEmails) {
            const response = await writeSubjectAndBodyOfEmail({
                name: email["firstName"],
                designation: email["position"],
                businessName: email["companyName"],
                businessInfo: JSON.stringify(businessInfo),
                businessDomain: url,
                motive: objective,
                includeDetails
            });

            try {
                const { subject, body } = JSON.parse(response);
                await CampaignUrlModel.findOneAndUpdate({ url, campaign }, {
                    emailSubject: subject,
                    emailBody: body
                });
                const outreachIntegration = await IntegrationModel.findOne({ user, outreachAgent });
                if (!outreachIntegration) {
                    return;
                }
                const { accessToken } = outreachIntegration;
                await addLeadToCampaignUsingLemlist(accessToken, campaign, email["email"], {
                    rightOCompanyName: email["company"],
                    rightODesignation: email["position"],
                    rightOFirstName: email["firstName"],
                    rightOLastName: email["lastName"],
                    rightOEmailBody: body,
                    rightOEmailSubject: subject,
                })

                await CampaignUrlModel.findOneAndUpdate({ url, campaign }, {
                    emailSubject: subject,
                    emailBody: body,
                    isCompleted: true
                });
            }
            catch (err: any) {
                logger.error(`parsing or adding lead to campaign error: ${err?.message}`)
            }
        }
        // pass 
    }
    else if (searchType === SearchType.DOMAINS_WITH_SERP) {
        const serpApiIntegration = await IntegrationModel.findOne({ user, type: IntegrationTypes.SERPAPI });
        if (!serpApiIntegration) {
            return;
        }
        const [query, response] = await cacheSerpApiResponseWithQuery({
            integration: serpApiIntegration.id,
            domain: url,
            accessToken: serpApiIntegration.accessToken,
            position: audienceFilters.position,
            department: "Executive"
        });
        const results = parseSerpResponse(response);
        const employeesInformationString = await extractEmployeesInformationFromSerp(query, results);
        try {
            const employessInformationJson: { firstName: string, lastName: string }[] = JSON.parse(employeesInformationString);
            for (const employee of employessInformationJson) {
                // we now need to use email finder
                const emailSearchIntegration = await IntegrationModel.findOne({ user, type: emailSearchService });
                if (!emailSearchIntegration) {
                    await CampaignUrlModel.findOneAndUpdate({ url, campaign }, {
                        error: true,
                        errorReason: "No email search integration found. Please add one of email integration service."
                    });
                    return;
                }

                const accessToken = await getSnovioAccessTokenIfNeeded(emailSearchIntegration.id, emailSearchIntegration.clientId, emailSearchIntegration.clientSecret);

                const employeeEmails = await cacheEmailsFinder(emailSearchIntegration.id, accessToken, employee.firstName, employee.lastName, url);

                const parsedEmails = parseEmailsFromSnovIOEmailSearch(employeeEmails);

                if (!parsedEmails?.length) {
                    await CampaignUrlModel.findOneAndUpdate({ url, campaign }, {
                        error: true,
                        errorReason: "0 emails found for given position"
                    });
                    return;
                }

                for (const email of parsedEmails) {
                    const response = await writeSubjectAndBodyOfEmail({
                        name: email["firstName"],
                        designation: email["position"],
                        businessName: "",
                        businessInfo: JSON.stringify(businessInfo),
                        businessDomain: url,
                        motive: objective,
                        includeDetails
                    });

                    try {
                        const { subject, body } = JSON.parse(response);
                        await CampaignUrlModel.findOneAndUpdate({ url, campaign }, {
                            emailSubject: subject,
                            emailBody: body
                        });
                        const outreachIntegration = await IntegrationModel.findOne({ user, outreachAgent });
                        if (!outreachIntegration) {
                            return;
                        }
                        const { accessToken } = outreachIntegration;
                        await addLeadToCampaignUsingLemlist(accessToken, campaign, email["email"], {
                            rightOCompanyName: email["company"],
                            rightODesignation: email["position"],
                            rightOFirstName: email["firstName"],
                            rightOLastName: email["lastName"],
                            rightOEmailBody: body,
                            rightOEmailSubject: subject,
                        })

                        await CampaignUrlModel.findOneAndUpdate({ url, campaign }, {
                            emailSubject: subject,
                            emailBody: body,
                            isCompleted: true
                        });
                    }
                    catch (err: any) {
                        logger.error(`parsing or adding lead to campaign error: ${err?.message}`)
                    }
                    break;
                }


            }
        }
        catch {
            logger.error(`Parsing error for employees`);

            await CampaignUrlModel.findOneAndUpdate({ url, campaign }, {
                error: true,
                errorReason: "No email search integration found. Please add one of email integration service."
            });
            return;

        }

    }

});



export default scrapeQueue;
