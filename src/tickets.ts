import * as prompts from 'botbuilder-prompts';

export function createTicket(context: prompts.PromptContext, ticket: Ticket = {} as Ticket) {
    if (!ticket.description) {
        const prompt = descriptionTextPrompt.with(ticket)
            .reply(`May you please describe your problem briefly?`);
        
        return context.begin(prompt);

    } else if (!ticket.severity) {
        const prompt = severityConfirmationPrompt.with(ticket)
            .choices(['high', 'medium', 'low'])
            .reply(`What is the severity of your issue: high, medium, or low?`);

        return context.begin(prompt);

    } else {
        const prompt = createTicketConfirmPrompt.with(ticket)
            .reply(`I'm going to create a ticket with severity: "${ticket.severity}", and the following description: ${ticket.description}. Is that correct?`);
        return context.begin(prompt);
    }
}


/**
 * Deletes an ticket given it's title or index. If neither is provided the function will 
 * automatically prompt the user for the name of an ticket to delete.
 * 
 * deleteTicket() works similarly to createTicket() that it will call a prompt that asks the
 * user the name of the ticket and the prompt will just call deleteTicket() recursively 
 * with the name of the ticket. 
 * 
 * One key difference is that deleteTicket() has some added logic to check the number of
 * tickets the user currently has defined and will follow a slightly simpler flow if there's
 * only 1 or 0 tickets defined.
 * @param context Context object for current turn of the conversation.
 * @param titleOrIndex (Optional) name or index of the ticket to delete.
 */
export function deleteTicket(context: BotContext, titleOrIndex?: string | number) {
    const tickets = context.state.user.tickets || [];

    // First see if we were passed an index or a title? (second and later turns)
    if (titleOrIndex !== undefined) {
        // Verify that the title or index is valid.
        const index = typeof titleOrIndex === 'string' ? findAlarmIndex(tickets, titleOrIndex) : titleOrIndex;
        if (index >= 0) {
            // Remove the ticket
            titleOrIndex = tickets[index].title;
            tickets.splice(index, 1);
            context.reply(`Deleted alarmed named "${titleOrIndex}".`);
        } else {
            context.reply(`I couldn't find the "${titleOrIndex}" ticket.`)
        }
        return { handled: true };

    } else if (tickets.length > 1) {
        // Say list of tickets and prompt for choice.
        this.listTickets(context);
        const prompt = deleteWhichAlarm.reply(`Which ticket would you like to delete?`);
        return context.begin(prompt);

    } else if (tickets.length == 1) {
        // Confirm the user wants to delete their only ticket
        const prompt = confirmDelete.reply(`Would you like to delete the "${tickets[0].title}" ticket?`);
        return context.begin(prompt);

    } else {
        // Nothing to delete
        context.reply(`There are no tickets to delete.`);
    }
}

const deleteWhichAlarm = new prompts.TextPrompt('deleteWhichAlarm', (context) => {
    // Pass the users reply as the name of the ticket to delete.
    deleteTicket(context, context.prompt.result);
});

const confirmDelete = new prompts.ConfirmPrompt('confirmDelete', (context) => {
    // Did the user say "yes" or "no"?
    if (context.prompt.result) {
        // Delete the ticket given it's index.
        return deleteTicket(context, 0);
    } else {
        // Just send a message to user confirming you heard them.
        context.reply(`ok`);
    }
});

/**
 * This function just sends the user a list of the tickets they have defined.
 * @param context 
 */
export function listTickets(context: BotContext) {
    const tickets = context.state.user.tickets || [];
    if (tickets.length > 1) {
        let connector = '';
        let msg = `There are ${tickets.length} tickets: `;
        tickets.forEach(function (ticket) {
            msg += connector + ticket.title;
            connector = ', ';
        });
        context.reply(msg);
    } else if (tickets.length == 1) {
        context.reply(`There is one ticket named "${tickets[0].title}".`);
    } else {
        context.reply(`There are no tickets.`);
    }
}


function findAlarmIndex(tickets: Ticket[], title: string): number {
    for (let i = 0; i < tickets.length; i++) {
        if (tickets[i].id.toLowerCase() === title.toLowerCase()) {
            return i;
        }
    }
    return -1;
}

function validTitle(context: BotContext, title: string): boolean {
    title = title.trim();
    if (title.length > 20) {
        context.reply("Your title must be less then 20 letters long");
        return false;
    }
    return true;
}

function validTime(context: BotContext, time: string): boolean {
    // TODO, validate time
    return true;
}

/**
 * The one rule that should never be violated is that all prompts must be statically defined as a 
 * constant somewhere in your code and they must be uniquely named. There are a number of reasons 
 * for this but the simplest is that your bot can be re-booted in-between turns with a user and 
 * the framework needs a reliable way of finding the function to return the users response to a 
 * prompt to.
 */

const descriptionTextPrompt = new prompts.TextPrompt<Ticket>('descriptionTextPrompt', (context) => {
    let ticket = context.prompt.with;

    const description: string = context.prompt.result;
    
    if (description.trim().length > 200) {
        context.reply("Your description must be less then 200 letters long. Let's try again.");
    } else {
        ticket.description = description;
    }

    createTicket(context, ticket);
});

const severityConfirmationPrompt = new prompts.ChoicePrompt('severityConfirmationPrompt', (context)=>{
    let ticket = context.prompt.with;
    
    const severity: string = context.prompt.result;

    ticket.severity = severity;

    createTicket(context, ticket);
});


const createTicketConfirmPrompt = new prompts.ConfirmPrompt('createTicketConfirmPrompt', (context)=>{
    let ticket = context.prompt.with;

    if (context.prompt.result) {
        if (!context.state.user.tickets) {
            context.state.user.tickets = [];
        }
        context.state.user.tickets.push(ticket);
        context.reply(`Ticket created. Anything else I can help you with?`);
    } else {
        context.reply('Okay. Anything else I can help you with?');
    }
});

export interface Ticket {
    id: string;
    description:string;
    ticketDate: string;
    severity: string;
}

//---------------------------------------------------------
// TypeScript Enhancements
//
// With TypeScript you're able to strongly type the 
// properties you store in UserData and ConversationData.
// This is done through a feature called global augmentation.
//---------------------------------------------------------

declare global {
    export interface UserData {
        /** Users list of active tickets. */
        tickets?: Ticket[];
    }
}

