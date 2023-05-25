import scrape from "./../crawler/scraper";


(async () => {
    const data = scrape("https://upgiant.com")
    console.log(data);
})()