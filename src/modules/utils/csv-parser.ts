
import csv from "csv-parser";
import fs from 'fs';


export const parseCsv = async (manualUpload: { file: string, selectedColumnNames: string[], mappedEmail: string }) => {
    const { file, selectedColumnNames, mappedEmail } = manualUpload;
    const csvData = await getCsvDataFromFile(file);
    const emailsWithMappedData: { email: string, [x: string]: any }[] = [];
    for (const eachCsvCata of csvData) {
        const email = eachCsvCata[mappedEmail];
        if (email) {
            const valueFromSelectedColumn = getValueFromSelectedColumnNames(selectedColumnNames, eachCsvCata);
            emailsWithMappedData.push({
                email,
                ...valueFromSelectedColumn
            })
        }
    }
    return emailsWithMappedData;
}

const getValueFromSelectedColumnNames = (selectedColumnNames: string[], data: { [x: string]: any }) => {
    const mappedData: any = {};
    for (const column of selectedColumnNames) {
        mappedData[column] = data[column];
    }
    return mappedData;
}

export const getCsvDataFromFile = async (file: string): Promise<any[]> => {
    const results: any[][] = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(file)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                resolve(results);
            }).on("error", () => {
                reject(new Error("CSV error"))
            });
    })
}
