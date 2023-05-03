import { OpenAI } from "langchain";

export const testOpenAI = async (openAIApiKey: string) => {
    const model = new OpenAI({ openAIApiKey, temperature: 0.9 });
    await model.call("Is this key working?");
}