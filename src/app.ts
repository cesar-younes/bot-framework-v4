import { Bot, ConsoleLogger, MemoryStorage, BotStateManager } from 'botbuilder-core';
import { ActivityRouter, first, ifRegExp, ifMessage } from 'botbuilder-router';
import { BotFrameworkConnector } from 'botbuilder-services';
import * as prompts from 'botbuilder-prompts';
import * as restify from 'restify';
import * as tickets from './tickets';

// Create server
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`${server.name} listening to ${server.url}`);
});

// Create connector
const connector = new BotFrameworkConnector(process.env.MICROSOFT_APP_ID, process.env.MICROSOFT_APP_PASSWORD);
server.post('/api/messages', connector.listen() as any);

// Configure bots routing table
const activityRouter = new ActivityRouter(ifMessage(
    //if message path
    first(
        ifRegExp(/(list|show) tickets/i, tickets.listTickets),
        ifRegExp(/(set|create|add|new) ticket/i, tickets.createTicket),
        ifRegExp(/(delete|remove|cancel) tickets/i, tickets.deleteTicket),
        ifRegExp(/help/i, helpMessage),
        prompts.routeTo(),
        defaultMessage
    ),

    // else path
    (context) => {
        if (context.request.membersAdded[0].name === 'User') {
            welcomeMessage(context);
        }
    }
));

// Initialize bot
const bot = new Bot(connector)
    .use(new ConsoleLogger())
    .use(new MemoryStorage())
    .use(new BotStateManager())
    .onReceive((context) => activityRouter.receive(context));


function helpMessage(context: BotContext) {
    context.reply('Connecting you to the next available agent');
    //Change conversation state to requesting help
    //Find agent in waiting queue
    //Connect Agent to user
}

function defaultMessage(context: BotContext) {
    context.reply('Type help for extra information on the available options');
}

function welcomeMessage(context: BotContext) {
    const prompt = confirmCreatePompt
    .reply('Hi! I\'m the help desk bot and I can help you create a support ticket.\n\nWould you like me to create a new ticket for you?');
    return context.begin(prompt);
}

function helloMessage(context: BotContext) {
    context.state.user.lastCommand = 'hello';
    context.reply('Hi there! \n\nMay you briefly describe your problem for me?');
}

const confirmCreatePompt = new prompts.ConfirmPrompt('confirmCreatePompt', (context) => {
    if (context.prompt.result) {
        tickets.createTicket(context);
    } else {
        context.reply('Ok.');
    }
});