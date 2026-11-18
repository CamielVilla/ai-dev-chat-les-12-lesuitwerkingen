import {tool} from "ai";
import {z} from "zod";
import {extractVacature} from "@/lib/vacature/actions";


export const analyseerVacature = tool({
    description: 'Vat de vacature samen die de gebruiker in de chat heeft geplakt en haal de belangrijkste punten eruit. ',
    inputSchema: z.object({
        tekst: z.string()
            .describe('De volledige vacaturetekst'),
    }),
    execute: async ({ tekst}) => {
        console.log("De analyseervacature tool wordt aangeroepen!!")

        const response = await extractVacature(tekst);
        if (!response.vacature) {
            throw new Error(response.error ?? "Er ging iets mis")
        }
        console.log(response);
        return response
    },

})