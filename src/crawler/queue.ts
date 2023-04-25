import Queue from 'bull';
import UrlModel, { CampaignUrlModel } from './../modules/campaign/Url.model';
import { SearchType, UrlStatus } from './../modules/campaign/campaign.interfaces';
import { extractCompanySummaryFromTitleAndBody } from './../modules/langchain/summary';
import { extractTitleAndText } from './../modules/utils/url';
import scrape from './scraper';
import { cleanupAllAxiosInstances } from './../modules/limitedAxios';
import { getCacheDomainSearchedEmails, parseEmailsFromSnovIODomainSearch } from './../app/email-search/snovio';
import IntegrationModel from './../modules/integrations/integration.model';
import { writeSubjectAndBodyOfEmail } from './../modules/langchain/email';
import { logger } from './../modules/logger';
import { addLeadToCampaign } from './../app/outreach/lemlist';


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
    const { url, campaign, searchType, user, emailSearchService, audienceFilters, motive, includeDetails, outreachAgent, camapignId } = job.data;

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
        const emailSearchIntegratoin = await IntegrationModel.findOne({ user, type: emailSearchService });
        if (!emailSearchIntegratoin) {
            return;
        }
        const domainSearchWithResults = await getCacheDomainSearchedEmails(emailSearchIntegratoin.id, emailSearchIntegratoin.accessToken, url, audienceFilters.positions);
        const contactEmails = parseEmailsFromSnovIODomainSearch(domainSearchWithResults);
        for (const email of contactEmails) {
            const response = await writeSubjectAndBodyOfEmail({
                name: email["firstName"],
                designation: email["position"],
                businessName: email["companyName"],
                businessInfo: JSON.stringify(businessInfo),
                businessDomain: url,
                motive,
                includeDetails
            });
            try {
                const { subject, body } = JSON.parse(response);
                const outreachIntegration = await IntegrationModel.findOne({ user, outreachAgent });
                if (!outreachIntegration) {
                    return;
                }
                const { accessToken } = outreachIntegration;
                await addLeadToCampaign(accessToken, camapignId, email["email"], {
                    rightOCompanyName: email["company"],
                    rightODesignation: email["position"],
                    rightOFirstName: email["firstName"],
                    rightOLastName: email["lastName"],
                    rightOEmailBody: body,
                    rightOEmailSubject: subject,
                })
            }
            catch (err: any) {
                logger.error(`parsing or adding lead to campaign error: ${err?.message}`)
            }
        }
        // pass 
    }
    else if (searchType === SearchType.DOMAINS_WITH_SERP) {
        // pass 
    }

});

const removePlaceholders = (text: string) => {
    return text.replace(/\[[^\]]*\]/g, '');
}

(async () => {
    let data = await writeSubjectAndBodyOfEmail({
        name: "Ivan",
        designation: "CTO",
        businessName: "Chanchlani Company",
        businessInfo: JSON.stringify({
            phoneNumber: +9779860108870,
            summary: `
            Snov.io is a sales toolbox and CRM platform that offers a collection of sales tools designed to help businesses scale and engage with leads more effectively. With over 130,000 trusted companies in 180+ countries, Snov.io's solutions include email finder, drip campaigns, email verifier, email warm-up, sales CRM, email tracker, technology checker, and Chrome extensions. The platform also offers integrations with over 5,000 tools, localized support in four languages, and award-winning customer care. Snov.io has received high ratings and positive reviews from G2, Capterra, Trustpilot, and Chrome, making it a reliable and efficient solution for businesses to grow their revenue.`
        }),
        businessDomain: "https://snov.io",
        motive: "Sell my product",
        includeDetails: "RightO is personalized email sender, increases conversion rate, can even make use of serp api, cheap. Offer available at https://righto.com?offer=XyzKl"
    });
    data = removePlaceholders(data);
    console.log(data);
});

export default scrapeQueue;
