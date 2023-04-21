import { load } from 'cheerio';

const removeHtmlTags = (str: string) => {
    const regex = /(<([^>]+)>)/ig;
    return str.replace(regex, '');
};
export const extractTitleAndText = (htmlString: string) => {
    const $ = load(htmlString);

    // Remove unnecessary elements
    $('script, style, img, iframe').remove();


    // Get the title and text content
    const titleElement = $('title');
    const title = titleElement.length ? titleElement.text() : '';

    const bodyElement = $('body');
    let body = "";
    if (bodyElement && bodyElement.length > 0) {
        bodyElement.find('*').each(function () {
            const node = $(this);
            if (node.children().length === 0 && node.text().trim() !== '') {
                body += node.text().trim() + ' ';
            }
        });
    }
    body = body.trim();
    body = removeHtmlTags(body);
    body = body.trim();

    return { title, body };
};



