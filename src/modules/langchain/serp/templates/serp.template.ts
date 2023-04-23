export const systemPromptTemplateString = `You are an AI that only speaks JSON. Refrain from giving anything on your own and empty if you cannot find the value.`

export const humanPromptTemplateString = `Below is the Google search query and its search result in order. You need to generate the list of firstName, lastName and designation of that person in following format. 
    {
        firstName: first name of that person,
        lastName: last name of that person,
        designation: position/desination of that person
    }

    Please be wary that you may have multiple output. So, return the array of above format even if you find just one result. 
    Example output.
    [
        {"firstName":"Peter","lastName": "heinzel","designation": "CEO"},
        {"firstName":"Chris","lastName":"Jenkins", "designation": "Manager"}
    ]

    Query: "{query}"
    Search Results: {results}
`;