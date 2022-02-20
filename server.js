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
(async function() {
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  return true
}());


async function sheet_titles_get(){
  doc.resetLocalCache()
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  let sheet_titles = await Promise.all(Object.keys(doc._rawSheets).map(function (key) {
    //logger.debug(doc._rawSheets[key]._rawProperties.title)
    return doc._rawSheets[key]._rawProperties.title
  }))
  logger.debug(sheet_titles)
  return sheet_titles
}

//シート作成
async function insert_sheet(pj_name){
  let wl_header = {col1:'tagname', col2:'address'};
  logger.debug(pj_name)
  let sheet_titles = await sheet_titles_get()
  logger.debug(sheet_titles,!sheet_titles.includes(pj_name))
  if (!sheet_titles.includes(pj_name)) {
    await doc.addSheet({title:pj_name, headerValues:wl_header, index:0})
    .then(e=>{ logger.debug('create sheet ' + e.title)})
    .catch(e=>{ logger.debug('already sheet')})
    //   .then(async (newSheet)=>{
    //   await newSheet.updateProperties({ title: pj_name, index:0 })
    //     .then((r)=>{ return r._rawProperties.sheetId})
    // }).catch(e=>{ logger.debug('already sheet')})
  }else{
    return false
  }
}

//セル検索
async function select(sheet_name, callBack) {
  const work_sheet = doc.sheetsByTitle[sheet_name];
  const rows = await work_sheet.getRows(0)
    const data = []
    for (const row of rows) {
      if (callBack(row)) {
        data.push({tagname: row.tagname})
      }
    }
  return data
}

//アドレスインサート
async function updateById(sheet_name, id, value) {
  const work_sheet = doc.sheetsByTitle[sheet_name];
  const rows = await work_sheet.getRows(0);
  for (const row of rows) {
    if (row.id == id) {
      for (const attr in value) {
        row[attr] = value[attr]
        await row.save()
      }
    }
  }
}

//削除
async function deleteById(sheet_name, id) {
  const work_sheet = doc.sheetsByTitle[sheet_name];
  const rows = await work_sheet.getRows(0);
  for (const row of rows) {
    if (row.id == id) {
      await row.delete()
    }
  }
}

client.on("messageCreate", async (message) => {
  try {
    if(message.guild.id == process.env.DISCORD_GUILD_ID){
      let congrats = /Congratulations/
      let giveaway = /giveaway for the/
      let giveaway2 = /!gstart /

        //抽選結果発表時
        if(congrats.test(message.content) && message.author.bot ){
          //logger.log(sheet_titles_get())
          let winner_regexp = /<@(.*?)>/g;
          let pj_regexp = /You won the \*\*(.*)\*\*!$/;
          //logger.debug('Congratulations <@123>, <@456>, <@789>'.match(winner_regexp))
          let winner = await message.content.match(winner_regexp)
          logger.debug(winner)
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
            //万が一PJ名にスペースが含まれていたら削除する
            words = words.replace(/\s+/g,"")
            logger.debug(words)
            return words;
          }());
          
          pj_name.then(async (pj)=>{
            if(winner.length){
              let insert_data = await Promise.all(winner.map(user_id=>{
                let user = client.users.cache.get(user_id);
                if (user) {
                  logger.debug(user)
                  return [user.tag] 
                } else {
                  return ['error:unknown_name']
                };
              }))
              logger.log(insert_data, pj)
              if(pj_name !== ""){
                let work_sheet = doc.sheetsByTitle[pj];
                let rows = await work_sheet.getRows();
                let result = await work_sheet.addRows(insert_data,{row:false, insert:true})
                logger.debug("データが挿入されました")
              }else{
                logger.debug("シートが見つからない")
              }
            }
          })
          

        //!gstartでギブアウェイ設定時(ワークシート作成)
        }else if(message.content.startsWith('!gstart') && !message.author.bot){
          let sheet_titles = await sheet_titles_get()
          //logger.debug(sheet_titles);
          let words = message.content.split(' ')
          logger.debug(words)
          let pj_name = ""
          for (let i = 3; i < words.length; i++) {
            pj_name = pj_name + words[i];
          }
          logger.debug(words)
          logger.debug(pj_name)
          if(pj_name !== ''){
            await insert_sheet(pj_name).catch(e=>{logger.debug(e)})
          }
        //!gcreateでギブアウェイ設定時(ワークシート作成)
        }else if(giveaway.test(message.content) && message.author.bot){
          logger.debug('messageCreate', message.content)

          //logger.debug(message.author.id)
          message.content = message.content.replace(/\s+/g,"")
          logger.debug(message.content)
          let pj_regexp = /`(.*)`/;
          let pj_name = message.content.match(pj_regexp)
          logger.debug(pj_name[1])
          pj_name[1].replace('`','')
          logger.debug(pj_name[1]) //マッチしたPJ名
          if(pj_name[1] !== ''){
            insert_sheet(pj_name[1])
          }
        //!whitelist コマンド実行時にシートに記録
        }else if(message.content.startsWith('!whitelist ') && !message.author.bot){
          const user = client.users.cache.get(message.author.id);
          logger.debug(user.tag)
          //スペースを半角スペースに統一
          message.content = message.content.replace(/\s+/g," ")
          let words = message.content.split(' ')
          logger.debug(words)
          let address = words[1]
          let pj_name = words[2]
          let sheet = await doc.sheetsByTitle[pj_name]
          logger.log(sheet._rawProperties)
          // let range = await sheet.loadCells('A1:E10')
          // //let cells = await sheet.loadCells();
          // let cell = await sheet.getCell(1, 0)
          // logger.log(cell)
          //logger.debug(message.author, address)
          let rows = await sheet.getRows();
          for (const row of rows) {
          logger.debug(row.tagname)
            if (row.tagname == user.tag) {
              row.address = address
              await row.save()
              logger.debug("更新完了")
              break
            }
          }
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
  if (!interaction.isCommand()) return;
  try{
    //logger.debug(interaction)        
    if(interaction.guild.id == process.env.DISCORD_GUILD_ID){
      //winner コマンド実行
      if (interaction.commandName === 'winner') {
        interaction.deferReply({ephemeral: true});
        //user.idを含むシート情報を収集
        let winner_pj =[]
        const user = client.users.cache.get(interaction.user.id);
        
        //キャッシュクリア
        doc.resetLocalCache()
        await doc.useServiceAccountAuth(creds);
        await doc.loadInfo();
        
        //自身のtagnameが記載されたシート名を取得
        await Promise.all( Object.keys(doc._rawSheets).map(async (key) => {
          let sheet = doc.sheetsById[key]
          await sheet.getRows({limit:50}).then(async (rows)=>{
            //return {...sheet._rawProperties, subElements: element.subElements.filter((subElement) => subElement.surname === 1)}
            
            for (const row of rows) {
              //logger.debug(row.tagname, user.tag)
              if (row.tagname == user.tag && row.address == undefined ) {
                //logger.debug(sheet.title)
                winner_pj.push(sheet.title)
              }
            }
          })
          
        }))
        //logger.debug(winner_pj)
        
        //同じPJに同じアドレスが複数登録されている場合PJが重複するので消す
        winner_pj = Array.from(new Set(winner_pj))
        //5つ以上PJがある場合はボタン多すぎエラーになるので5に絞る
        winner_pj.length > 5 ? winner_pj.length = 5 : winner_pj.length
        
        //logger.debug(winner_pj)
        if(winner_pj.length > 0){
          logger.debug('WINNER')
          // let b = Promise.all(await winner_pj.map((pj, key) => {
          //   //logger.debug("id"+key+"_"+pj+"_"+ user.tag)
          //   return new MessageButton()
          //     .setCustomId("id"+key+"_"+pj+"_"+ user.tag)
          //     .setStyle("SECONDARY")
          //     .setLabel(pj)
          // }))
          let your_command = Promise.all(await winner_pj.map((pj, key) => {
              return "`!whitelist ここにアドレス "+pj+"`\n"
          }))
          your_command.then(command_list => {
            let mas = "おめでとう！"
            if(command_list.length > 1){
              mas += `${command_list.length}個当たってるわ。\n下のコピペしてアドレスのところ書いて送信しといてー\n1行ずつ送ってな！\n` 
            }else{
              mas += `下のコピペしてアドレスのところ書いて送信しといてー\n` 
            }
            mas += command_list.join("")
            interaction.editReply({
              content:mas,
              ephemeral: true,
            })
          })
//           b.then(async (b)=>{
            
//             logger.debug(interaction.user.id,interaction.user.tag)
//             const filter = (c) => c.member.id === interaction.member.id
//             interaction.reply({
//               content: "アドレス申請したいプロジェクトを選択するんや。",
//               components: [new MessageActionRow().addComponents(b)],
//               ephemeral: true,
//               fetchReply: true
//             })
//             .then(async (message) => {
//               //const message = await interaction.fetchReply();
//               const filter = i => {
//                 //i.deferUpdate();
//                 return i.user.id === interaction.user.id;
//               };

//               // interaction.channel.awaitMessageComponent({
//               //   componentType: "BUTTON",
//               //   filter: (c) => c.member.id === interaction.member.id,
//               //   time: 5000,
//               //   idle: 15000,
//               //   max: 2,
//               //   errors: ['time']
//               // })
//               const collector = interaction.channel.createMessageComponentCollector({
//                 componentType: "BUTTON",
//                 filter: (c) => c.member.id === interaction.member.id && c.customId.endsWith(c.user.tag),
//                 time: 5000,
//                 idle: 15000,
//                 max: 2,
//                 errors: ['time']
//               })
//               // .then((collected) => {
//               //   logger.debug('then 1')
//               //   logger.debug(collected)
// //                 logger.debug(interaction)
// //                 const collector = interaction.channel.createMessageComponentCollector({
// //                   componentType: "BUTTON",
// //                   filter: (c) => c.member.id === interaction.member.id,
// //                   time: 5000,
// //                   idle: 15000,
// //                   max: 2,
// //                   errors: ['time']
// //                 })
// //                 //Handle button click
//                 collector.on('collect', async i => {
//                   logger.debug(i.customId)
//                     //await i.update({ content: 'A button was clicked!', components: [] });
//                     let response = i.customId.replace(/_/gi, ' ')
//                     response = response.split(" ")
//                     //try {
//                       logger.debug('then 2')
//                       await i.update({
//                       content: "そしたら下のコピペしてアドレス書いて送信やで\n\n" + "`!whitelist ここにアドレス "+response[1] + "`\n\n",
//                       components: [],
//                       ephemeral: true
//                       })
//                     collector.stop()
//                     //   setInterval(async () => {
//                     //     logger.debug("res")
//                     //     await collector.stop()
//                     //     await i.deleteReply();
//                     //   }, 8000)
//                     // }catch(err) {
//                     //   logger.debug("res error")
//                     //   await i.deleteReply();
//                     // }
//                 });

//                 collector.on('end', collected => {
//                   logger.debug(collected)  
//                 })
//                 //interaction.followUp(`You selected ${interaction.values.join(', ')}!`)
//               // })
//               //.catch(err => console.log(`No interactions were collected.`));
//               // interaction.channel.awaitMessages({filter, max: 1, time: 6000, errors: ['time']})
//               // .then(collected => {
//               //   logger.debug(collected)
//               //   interaction.followUp({content: `${collected.first().author} got the correct answer!`,
//               //                         ephemeral: true
//               //                        });
//               // })
//               // .catch(collected => {
//               //   interaction.followUp({content: 'Looks like nobody got the answer this time.', 
//               //                         ephemeral: true
//               //                        });
//               // })
//             })
//           })
        // logger.debug('after Button.')
        }else{  
          await interaction.reply({
          content: "なんも当たってないわ。ランブルとかビンゴは提供者にDMしてや",
          ephemeral: true
          })
        }
      }
      //ボタンリアクション エフェメラルメッセージには反応しないので注意
      
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
