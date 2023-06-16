
import csv from "csv-parser";
import fs from 'fs';
import { IManualUploadArgs } from "../campaign/campaign.interfaces";


export const parseCsv = async (manualUpload: IManualUploadArgs) => {
    const { file, selectedColumnNames, mappedEmail, mappedCompanyName, mappedFirstName, mappedLastName, mappedPosition, mappedFullName } = manualUpload;
    const csvData = await getCsvDataFromFile(file);
    const emailsWithMappedData: { email: string, [x: string]: any }[] = [];
    for (const eachCsvCata of csvData) {
        const email = eachCsvCata[mappedEmail];
        const firstName = eachCsvCata[mappedFirstName ?? "firstName"];
        const lastName = eachCsvCata[mappedLastName ?? "lastName"];
        const companyName = eachCsvCata[mappedCompanyName ?? "companyName"];
        const position = eachCsvCata[mappedPosition ?? "position"];
        const fullName = eachCsvCata[mappedFullName ?? "fullName"];
        if (email) {
            const valueFromSelectedColumn = getValueFromSelectedColumnNames(selectedColumnNames, eachCsvCata);
            emailsWithMappedData.push({
                ...valueFromSelectedColumn,
                email,
                firstName,
                lastName,
                companyName,
                position,
                fullName
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
