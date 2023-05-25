import { PuppeteerLaunchOptions } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const options: PuppeteerLaunchOptions = {
    args: ['--no-sandbox'],
};

const scrape = async (url: string) => {
    const env = process.env["NODE_ENV"] || 'development';
    if (env !== "development") {
        options.executablePath = "/usr/bin/chromium-browser"
    }
    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    await page.goto(url);

    const data = await page.content();

    await browser.close();
    return data;
}

export default scrape;

