import Queue from 'bull';
import scrape from './scraper';
import UrlModel from './../modules/campaign/Url.model';

// Create the Bull queue
const scrapeQueue = new Queue('scrape', { redis: { port: 6379, host: '127.0.0.1' } });

// Process jobs in the queue
scrapeQueue.process(async (job) => {
    const { url, campaign } = job.data;

    // Scrape the URL using Puppeteer
    const data = await scrape(url);
    await UrlModel.findOneAndUpdate(campaign, {
        url,
        html: data,
    }, { upsert: true })
});

export default scrapeQueue;
