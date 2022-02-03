/**
 * This is the main Node.js server script for your project
 * Check out the two endpoints this back-end API provides in fastify.get and fastify.post below
 */
require('dotenv').config();
const path = require("path");
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const sassMiddleware = require('sass');
const logger = require('./src/plugins/logger');

// Require the fastify framework and instantiate it
const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: false
});
const sass = require("sass");
const {
  promisify
} = require("util");
const {
  writeFile
} = require("fs");
const sassRenderPromise = promisify(sass.render);
const writeFilePromise = promisify(writeFile);

async function main() {
  const styleResult = await sassRenderPromise({
    file: `${process.cwd()}/src/scss/style.scss`,
    outFile: `${process.cwd()}/public/style.css`,
    sourceMap: true,
    sourceMapContents: true,
    outputStyle: "compressed",
  });
  //console.log(styleResult.css.toString());
  await writeFilePromise("public/style.css", styleResult.css, "utf8");
  await writeFilePromise("public/style.css.map", styleResult.map, "utf8");
}
main();


// Setup our static files
fastify.register(require("fastify-static"), {
  root: path.join(__dirname, "public"),
  prefix: "/" // optional: default '/'
});

// fastify-formbody lets us parse incoming forms
fastify.register(require("fastify-formbody"));

// point-of-view is a templating manager for fastify
fastify.register(require("point-of-view"), {
  engine: {
    handlebars: require("handlebars")
  }
});
//
// // Load and parse SEO data
// const seo = require("./src/seo.json");
// if (seo.url === "glitch-default") {
//   seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
// }

const { Client, Constants, Intents, TextChannel } = require('discord.js')

const calender_add_url = "https://www.google.com/calendar/render?action=TEMPLATE"


const client = new Client({
  intents: [
          Intents.FLAGS.GUILDS,
          Intents.FLAGS.GUILD_MESSAGES
        ]
})
// client.on('message', message =>{
//  if (message.author.id == client.user.id){
//    return;
//  }
//  if(message.isMemberMentioned(client.user)){
//    sendReply(message, "呼びましたか？");
//    return;
//  }
//  if (message.content.match(/にゃ～ん|にゃーん/)){
//    let text = "にゃ～ん";
//    sendMsg(message.channel.id, text);
//    return;
//  }
// });

client.once("ready", async () => {
    const data = [{
        name: "ping",
        description: "Replies with Pong!",
    }];
    await client.application.commands.set(data, process.env.DISCORD_GUILD_ID);
    console.log("Ready!");
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) {
        return;
    }
    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong！');
    }
});

client.on('ready', message => {
  console.log('Already...');
  client.ws.on('INTERACTION_CREATE', async interaction => {
    const command = interaction.data.name.toLowerCase();
    const args = interaction.data.options;
    if (command === 'test') {
      client.api.interactions(interaction.id, interaction.token).callback.post({
        data: {
          type: 4,
          data: {
            content: `Hello World.`
          }
        }
      });
    }
  });
});
//send reply test
client.on('messageCreate', (message) => {
  //botからのコマンドは無視
  if (message.author.bot) return;
  //if (message.content === 'Hi All' && !message.author.bot) message.reply('こんにちは！').catch(console.error)
})
client.login(process.env.DISCORD_BOT_TOKEN).catch(console.error)

//
fastify.get("/get", function(request, reply) {

  const client = new Client({
    intents: [
          Intents.FLAGS.GUILDS,
          Intents.FLAGS.GUILD_MESSAGES
        ]
  })
  client.login(process.env.DISCORD_BOT_TOKEN)
    .catch(console.error)


  client.once(Constants.Events.CLIENT_READY, async () => {

    const channel = client.channels.cache.get(process.env.DISCORD_INPUT_CHANNEL_ID)
    const out_channel = client.channels.cache.get(process.env.DISCORD_OUTPUT_CHANNEL_ID)
    await channel.messages.fetch({
      cache: false
    });
    logger.debug(channel)

    //if (channel.channelId == process.env.DISCORD_INPUT_CHANNEL_ID) {
    let matchtext = []
    let regexp1 = new RegExp(/NFT名：(.*)\n/, 'g')
    let regexp2 = new RegExp(/プレセール：(.*)\n/, 'g')
    let regexp3 = new RegExp(/パブリック：(.*)\n/, 'g')
    channel.messages.fetch({ limit: 3 })
      .then(messages => {
        messages.forEach(msg => {
          let str = msg.content
          console.log(str)
          let pj = str.match(regexp1)
          let pre = str.match(regexp2)
          let pub = str.match(regexp3)
          //let add_link = calender_add_url + `&text=${pj}&dates=20220101/20220101`
          matchtext.push(pj + pre + pub)
        })
        if (matchtext.length > 0) {
          console.log(matchtext)
          //out_channel.send(matchtext.join('\n'))
          // out_channel.send({
          //   embed: {
          //     title: 'Your message',
          //     url: 'https://google.com',
          //   },
          // })
        }
      })
      .catch(console.error);

    //channel.messages.fetch({ limit: 10 }).then((collections) => { console.log(collections) })
  });
  reply
    .code(200)
    .header('Content-Type', 'application/json; charset=utf-8')
    .send({ hello: 'world' })
});

// fastify.post("/", function(request, reply) {
//
//   // Build the params object to pass to the template
//   let params = { seo: seo };
//
//   // If the user submitted a color through the form it'll be passed here in the request body
//   let color = request.body.color;
//
//   // If it's not empty, let's try to find the color
//   if (color) {
//     // ADD CODE FROM TODO HERE TO SAVE SUBMITTED FAVORITES
//
//     // Load our color data file
//     const colors = require("./src/colors.json");
//
//     // Take our form submission, remove whitespace, and convert to lowercase
//     color = color.toLowerCase().replace(/\s/g, "");
//
//     // Now we see if that color is a key in our colors object
//     if (colors[color]) {
//
//       // Found one!
//       params = {
//         color: colors[color],
//         colorError: null,
//         seo: seo
//       };
//     } else {
//
//       // No luck! Return the user value as the error property
//       params = {
//         colorError: request.body.color,
//         seo: seo
//       };
//     }
//   }
//
//   // The Handlebars template will use the parameter values to update the page with the chosen color
//   reply.view("/src/pages/index.hbs", params);
// });


// Run the server and report out to the logs
const PORT = process.env.PORT ?? 3000
fastify.listen(PORT, '0.0.0.0', function(err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
  fastify.log.info(`server listening on ${address}`);
});