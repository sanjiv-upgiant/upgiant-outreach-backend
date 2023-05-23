
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
    apiKey: openAIApiKey,
});
const openai = new OpenAIApi(configuration);

const models = await openai.listModels();
console.log(models.data.data)

