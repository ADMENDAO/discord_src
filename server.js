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

const { setTimeout } = require('timers/promises');

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

const { Client, Constants, Intents, TextChannel, MessageCollector, MessageActionRow, MessageSelectMenu, MessageButton, MessageEmbed } = require("discord.js");

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
async function gs_init() {
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  return true
};

async function sheet_titles_gets(){
  let sheet_titles = []
  await gs_init().then(()=>{
    Object.keys(doc._rawSheets).forEach(async function (key) {
      //logger.debug(doc._rawSheets[key]._rawProperties.title)
      sheet_titles.push(doc._rawSheets[key]._rawProperties.title)
    })
  })
  logger.debug(sheet_titles)
  return sheet_titles
}
//シート一覧がキャッシュで更新されていない
async function insert_sheet(pj_name){
  let wl_header = {col1:'id',col2:'tagname', col3:'address',col4:'createdTime'};
  logger.debug(pj_name)
  let sheet_titles = await sheet_titles_gets()
  logger.debug(sheet_titles,!sheet_titles.includes(pj_name))
  if (!sheet_titles.includes(pj_name)) {
    let newSheet = await doc.addSheet({headerValues:wl_header});
    await newSheet.updateProperties({ title: pj_name, index:0 });
    // let row = await newSheet.setHeaderRow(wl_header);
    // let result = await row.save();
    return true
  }else{
    return false
  }
}

//シート名からIDを取得
async function get_sheet_id_from_name(sheet_name){
  return await gs_init().then(async ()=>{
    return await Object.keys(doc._rawSheets).filter((key) => {
      return doc._rawSheets[key]._rawProperties.title == sheet_name
    })
  }).then((sheet_id)=>{
    if(sheet_id.length > 0){
      //logger.debug(sheet_id[0])
      return sheet_id[0]
    }else{
      return false
    }
  })
}

client.on("messageCreate", async (message) => {
  try {
    if(message.guild.id == process.env.DISCORD_GUILD_ID){
      let congrats = /Congratulations/
      let giveaway = /giveaway for the/
      let giveaway2 = /!gstart /

        //抽選結果発表時
        if(congrats.test(message.content) && message.author.bot ){
          
          //logger.log(sheet_titles_gets())
          
          let winner_regexp = /<@(.*?)>/g;
          let pj_regexp = /You won the \*\*(.*)\*\*!$/;
          let winner = message.content.match(winner_regexp)
          winner = winner.map(id=>{
            logger.log(id.replace('<@','').replace('>',''))
            return id.replace('<@','').replace('>','')
          })
          let pj_name = (async function() {
            let words = message.content.match(pj_regexp)
            logger.debug(message.content)
            logger.debug(winner)
            logger.debug(words)
            logger.debug(words.slice(-1)[0])
            words = words.slice(-1)[0]
            //万が一PJ名にスペースが含まれていたらそれ以降のみをPJ名とする
            let empty_space = /\s+/
            if(empty_space.test(words)){
              words = words.replace(/　/g,empty_space)
              words = words.split(' ')
              words = words.slice(-1)[0]
            }
            logger.debug(words)
            return words;
          }());
          let sheet_id = await pj_name.then(async (pj)=>{
            let id = await get_sheet_id_from_name(pj)
            return id
          })
          // logger.debug(sheet_id)
          // logger.debug(winner)
          //winnerが1以上
          if(winner.length){
            let insert_data = winner.map(user_id=>{
              let user = client.users.cache.get(user_id);
              if (user) {
                logger.debug(user)
                return [user_id, user.tag] 
              } else {
                return [user_id, 'error:unknown_name']
              };
            })
            logger.log(insert_data)
            //insert_data = [['7**********8','a*****#****'],['1**********6','a*******#5***']]
            if(sheet_id !== null){
              let work_sheet = doc.sheetsById[sheet_id];
              let rows = await work_sheet.getRows();
              let result = await work_sheet.addRows(insert_data,{row:false, insert:true})
              logger.debug("データが挿入されました")
            }
          }

        //!gstartでギブアウェイ設定時(ワークシート作成)
        }else if(message.content.startsWith('!gstart') && !message.author.bot){
          let sheet_titles = await sheet_titles_gets()
          //logger.debug(sheet_titles);
          let words = message.content.split(' ')
          logger.debug(words.slice(-1)[0])
          let pj_name = words.slice(-1)[0]
          if(words.length > 3 == pj_name !== ''){
            insert_sheet(pj_name)
          }
        //!gcreateでギブアウェイ設定時(ワークシート作成)
        }else if(giveaway.test(message.content) && message.author.bot){
          logger.debug('messageCreate', message.content)

          //logger.debug(message.author.id)
          message.content = message.content.replace(/　/g,"\s+")
          let pj_regexp = /`(.*)`/;
          let pj_name = message.content.match(pj_regexp)
          logger.debug(pj_name[1])
          pj_name[1].replace('`','')
          logger.debug(pj_name[1])

          let daytime = dayjs(message.createdTimestamp, 'YYYY/MM/DD HH:MM:SS').tz('Asia/Tokyo').format()
          logger.debug(pj_name[1]) //マッチしたPJ名
          if(pj_name[1] !== ''){
            insert_sheet(pj_name[1])
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

      }
      else{
        return
      }
    }
  }catch(error) {
    logger.debug(error)
  }
})

//当選者がコマンド実行してアドレスを提出する際の対話
client.on("interactionCreate", async (interaction) => {
  try{
    //logger.debug(interaction)        
    if(interaction.guild.id == process.env.DISCORD_GUILD_ID){

      
      if (interaction.isSelectMenu()) {
        if (interaction.customId.startsWith('winner_')) {
          let reply = await interaction.reply({
            content: 'ハズレ乙',
            fetchReply: true,
            ephemeral: true
          });
          await setTimeout(5000);
          await reply.delete()
        }       
      }
      //winner コマンド実行
      if (interaction.commandName === 'winner') {
        logger.debug('WINNER')
        const button = [
          new MessageButton()
            .setCustomId("winner_id1")
            .setStyle("SECONDARY")
            .setLabel("お前はこれやろ"),

          new MessageButton()
            .setCustomId("winner_id2")
            .setStyle("SECONDARY")
            .setLabel("これでいいのか？"),

          new MessageButton()
            .setCustomId("winner_id3")
            .setStyle("SECONDARY")
            .setLabel("これはハズレ")
        ]
        interaction.reply({
          content: "おん",
          components: [new MessageActionRow().addComponents(button)],
          ephemeral: true,
          time: 2000
        })
        // logger.debug('after Button.')
      }
      
      
      if (interaction.isButton()) {
        logger.debug("is Button.")
        // const msg = interaction
        // logger.log(msg)
        // const filter = i => {
        //   i.deferUpdate();
        //   return i.user.id === interaction.user.id;
        // };
        // interaction.update({
        //     content: 'ハズレ乙'
        //   })
//         interaction.awaitMessageComponent({ filter, componentType: 'SELECT_MENU', time: 60000 })
//         .then(interaction => interaction.editReply(`You selected ${interaction.values.join(', ')}!`))
//         .catch(err => console.log(`No interactions were collected.`));
        
//         const collector = new MessageCollector(interaction.channel, m => m.author.id === interaction.user.id, {
//           time: 10000
//         });
        const filter = m => m.author.id === interaction.user.id
        const collector = await interaction.channel.createMessageCollector(filter, {max: 1, time: 10000})
      	// .then(interaction => interaction.editReply(`You selected ${interaction.values.join(', ')}!`))
      	// .catch(err => console.log(`No interactions were collected.`));
      
        if (interaction.customId.startsWith('winner_')) {
          logger.debug(interaction.customId)
          
          collector.on('collect', async (message) => {
            logger.debug(message.content)
            
            message.deferUpdate();
            message.update("correct!");
            //return message.content
          })
          //logger.debug(coll)

          collector.on('end', (collected, reason) => {
            logger.debug(collected, reason)
            interaction.update(collected.time)
          })
        }
      }
      
      if (!interaction.isCommand()) {
          return;
      }
    }
  }catch(error){
    logger.debug(error)
  }
    
})

  
client.on('error', err => {
   console.warn(err);
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
