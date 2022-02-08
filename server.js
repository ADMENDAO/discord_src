/**
 * This is the main Node.js server script for your project
 * Check out the two endpoints this back-end API provides in fastify.get and fastify.post below
 */
require("dotenv").config();
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)

const sassMiddleware = require("sass");
const logger = require("./src/plugins/logger");
const { GoogleSpreadsheet } = require('google-spreadsheet');

// Require the fastify framework and instantiate it
const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: false,
});

// Setup our static files
fastify.register(require("fastify-static"), {
  root: path.join(__dirname, "public"),
  prefix: "/", // optional: default '/'
});

//継続起動アクセス用
fastify.get("/", function(request, reply) {
  reply
      .code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send({ world: 'is Dao' })
});

// fastify-formbody lets us parse incoming forms
fastify.register(require("fastify-formbody"));

// point-of-view is a templating manager for fastify
fastify.register(require("point-of-view"), {
  engine: {
    handlebars: require("handlebars"),
  },
});
//
// // Load and parse SEO data
// const seo = require("./src/seo.json");
// if (seo.url === "glitch-default") {
//   seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
// }

const { Client, Constants, Intents, TextChannel } = require("discord.js");

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

client.once("ready", async () => {
    const data = [{
        name: "winner",
        description: "なんか当たったんか？おめでとうな！",
    }];
    await client.application.commands.set(data, process.env.DISCORD_GUILD_ID);
    console.log("Ready!");
});

//スプレッドシートの設定＆初期化
const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID);
const creds = require("./"+process.env.CREDENCIAL_FILE_PATH); // the file saved above
(async function() {
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
}());
const wl_header = {col1:'id',col2:'username',col3:'discriminator',col4:'address',col5:'pj',col6:'createdTime'};

client.on("messageCreate", async (message) => {

  let congrats = /Congratulations/
  let giveaway = /giveaway for the/
  
    //抽選結果発表時
    if(congrats.test(message.content) && message.author.bot ){
      let winner_regexp = /<@(.*?)>/g;
      let pj_regexp = /You won the \*\*(.*)\*\*!$/;
      let winner = message.content.match(winner_regexp);
      let pj_name = message.content.match(pj_regexp);
      logger.debug(message.content)
      logger.debug(winner)
      logger.debug(pj_name[1])
      let sheet_id = null
      Object.keys(doc._rawSheets).forEach(async function (key) {
        //logger.debug(doc._rawSheets[key])
        sheet_id = doc._rawSheets[key]._rawProperties.title == pj_name[1] ? key : null
      })
      logger.debug(sheet_id)
      if(sheet_id !== null){
        let work_sheet = doc.sheetsById[sheet_id];
        let rows = await work_sheet.getRows();
        logger.debug(rows)
        let result = await work_sheet.addRow(winner)
        logger.debug(result)
      }
      
    //ギブアウェイ設定時
    }else if(giveaway.test(message.content) && message.author.bot ){
      //console.log(regexp.test(message.content));
    
      let pj_regexp = /🎉 Done! The giveaway for the `(.*)` is starting in /;
      let pj_name = message.content.match(pj_regexp);
      //logger.debug(pj_name[1]) 1にマッチしたPJ名
      if(pj_name[1] !== ''){
        let sheet_titles = []
        Object.keys(doc._rawSheets).forEach(async function (key) {
          //console.log(key + "/" + doc._rawSheets[key]._rawProperties.title);
          //logger.debug(pj_name[1] , doc._rawSheets[key]._rawProperties.title)
          sheet_titles.push(doc._rawSheets[key]._rawProperties.title)
        })
        if (sheet_titles.includes(pj_name[1])) {
          //logger.debug('すでに同名のシートあり')
          return;
        }else{
          const newSheet = await doc.addSheet();
          await newSheet.updateProperties({ title: pj_name[1], index:0 });
          logger.debug(newSheet)
          const row = await newSheet.setHeaderRow(wl_header);
          await row.save();
        }
      }
    //コマンド実行時
    }else if(message.content.startsWith('whitelist_add') && !message.author.bot ){
    //logger.debug('messageCreate', message)
    const sheet = doc.sheetsByIndex[0]; // the first sheet
    const rows = await sheet.getRows();
    
    //logger.debug(message.author.id)
    message.content = message.content.replace(/　/g," ")
    let words = message.content.split(' ')
    //logger.debug(words)
    //logger.debug('words[3]', words[3] == 'undefined')
    
    let daytime = dayjs(message.createdTimestamp, 'YYYY/MM/DD HH:MM:SS').tz('Asia/Tokyo').format()
    //logger.debug(daytime)
    const sundar = await sheet.addRow({id: message.author.id,
                                       username: message.author.username,
                                       discriminator:message.author.discriminator,
                                       address: words[1],
                                       pj: words[2],
                                       createdTime: daytime
                                      });
    logger.debug(sundar)
  }else{
    return
  }
});

//当選者がコマンド実行してアドレスを提出する際の対話
client.on("interactionCreate", async (message) => {
    logger.debug(message)
    if (!message.isCommand()) {
        return;
    }
    if (message.commandName === 'winner') {
      let filter = m => m.author.id === message.author.id
      message.reply({ content: '・・・・・・・・・・。kek!', ephemeral: true }).then(async () => {
        //logger.log('whitelist_add');
        //logger.debug(doc.title);
//         await doc.updateProperties({ title: 'renamed doc' });

//         const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id] or doc.sheetsByTitle[title]
//         console.log(sheet.title);
//         console.log(sheet.rowCount);

//         // adding / removing sheets
//         const newSheet = await doc.addSheet({ title: 'hot new sheet!' });
//         await newSheet.delete();
      //message.channel.send(`Are you sure to delete all data? \`YES\` / \`NO\``).then(() => {
        message.channel.awaitMessages(filter, {
            max: 1,
            time: 30000,
            errors: ['time']
          })
          .then(async message => {
            message = message.first()
            
          })
          .catch(error => {
              message.channel.send('Timeout');
          });
      })
    }else{
      return
    }
});


client.login(process.env.DISCORD_BOT_TOKEN).catch(console.error);

const PORT = process.env.PORT || 3000;
fastify.listen(PORT, "0.0.0.0", function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
  fastify.log.info(`server listening on ${address}`);
});
