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

const { Client, GatewayIntentBits, Partials, MessageCollector, MessageActionRow, MessageSelectMenu, MessageButton, MessageEmbed } = require("discord.js");

// const client = new Client({
//   intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
// });

const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once("ready", async () => {
    
  const data = [{
      name: "winner",
      description: "ふぉっふぉっふぉっ、なんか当たったんじゃな？",
  },{
      name: "gsheet",
      description: "ギブアウェイシート一覧(管理者専用)",
  }];
//   await client.application.commands.set(data, process.env.DISCORD_GUILD_ID);

//   //gsheetコマンドを許可するロール
//   const gsheet_role = ['Admin','Mod','SuperMod'] 

//   //サーバー(ギルド)
//   const guild = await client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
//   //ロールリスト
//   const roleList = await guild.roles.fetch();
//   //スラッシュコマンドリスト
//   const commandsList = await guild.commands.fetch();
  
  //gsheetコマンドのロール制限
//   await commandsList.forEach(async slashCommand => {
//     logger.debug(`Command id ${slashCommand.id} / ${slashCommand.name}`)

//     //return slashCommand.name == 'gsheet'
//     if(slashCommand.name == 'gsheet'){
//       await roleList.forEach(async role => {
//         //logger.debug(role.name)
//         if(gsheet_role.includes(role.name)){
//          logger.debug(role.name, role.id)

//           await slashCommand.permissions.add({ permissions:
//             [{
//               id: process.env.DISCORD_GUILD_ID, //everyone
//               type: 'ROLE',
//               permission: false
//             },{
//               id: role.id,
//               type: 'ROLE',
//               permission: true
//             }] 
//           })
//         }
//       })
//     }
//   });

  console.log("Ready!")
})
//スプレッドシートの設定＆初期化
const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID);
const creds = require("./"+process.env.CREDENCIAL_FILE_PATH); // the file saved above
(async function() {
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  return true
}());


async function get_sheet_titles(){
  doc.resetLocalCache()
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  let sheet_titles = await Promise.all(Object.keys(doc._rawSheets).map(function (key) {
    //logger.debug(doc._rawSheets[key]._rawProperties.title)
    return doc._rawSheets[key]._rawProperties.title
  }))
  //logger.debug(sheet_titles)
  return sheet_titles
}

//シート作成
async function insert_sheet(pj_name){
  let wl_header = {col1:'tagname', col2:'username', col3:'address'};
  //logger.debug(pj_name)
  //logger.debug(pj_name.toLowerCase())
  let sheet_titles = await get_sheet_titles()
  
  logger.debug(sheet_titles,!sheet_titles.includes(pj_name))
  
  if (!sheet_titles.includes(pj_name)) {
    await doc.addSheet({title:pj_name, headerValues:wl_header, index:0})
    .then(e=>{ logger.debug('create sheet ' + e.title)})
    .catch(e=>{ logger.debug('already sheet')})
  }else{
    return false
  }
}

async function get_sheet_id(pj_name){
  let sheet_titles = await get_sheet_titles()
  let id = false
  await sheet_titles.forEach(async title =>{
    //logger.debug(title, title.toLowerCase(), pj_name.toLowerCase())
    if(title.toLowerCase() == pj_name.toLowerCase()){
      //logger.debug(title)
      let sheet = await doc.sheetsByTitle[title];
      //logger.debug(sheet.sheetId)
      id = sheet.sheetId
    }
  })
  return id
}

async function words_adjust(str) {
  //全角を半角に
  let word = await str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
  })
  //記号の削除
  word = await word.replace(/[:/.,|^~=(){}\[\]'`@¥#$%&"!*+-]/g, "")
  //スペースの削除
  word = await word.replace(/\s+/g,"")
  //logger.log(word)
  return word
}
// //セル検索
// async function select(sheet_name, callBack) {
//   const work_sheet = doc.sheetsByTitle[sheet_name];
//   const rows = await work_sheet.getRows(0)
//     const data = []
//     for (const row of rows) {
//       if (callBack(row)) {
//         data.push({tagname: row.tagname})
//       }
//     }
//   return data
// }

// //アドレスインサート
// async function updateById(sheet_name, id, value) {
//   const work_sheet = doc.sheetsByTitle[sheet_name];
//   const rows = await work_sheet.getRows(0);
//   for (const row of rows) {
//     if (row.id == id) {
//       for (const attr in value) {
//         row[attr] = value[attr]
//         await row.save()
//       }
//     }
//   }
// }

// //削除
// async function deleteById(sheet_name, id) {
//   const work_sheet = doc.sheetsByTitle[sheet_name];
//   const rows = await work_sheet.getRows(0);
//   for (const row of rows) {
//     if (row.id == id) {
//       await row.delete()
//     }
//   }
// }

client.on("messageCreate", async (message) => {
  try {
    if(message.guild.id == process.env.DISCORD_GUILD_ID){
      let congrats = /Congratulations/
      let giveaway = /giveaway for the/
      let giveaway2 = /!gstart /

        //抽選結果発表時
        if(congrats.test(message.content) && message.author.bot ){
          let winner_regexp = /<@(.*?)>/g;
          let pj_regexp = /You won the \*\*(.*)\*\*!$/;
          //logger.debug('Congratulations <@123>, <@456>, <@789>'.match(winner_regexp))
          let winner = await message.content.match(winner_regexp)
          logger.debug(winner)
          winner = winner.map(id=>{
            //logger.log(id.replace('<@','').replace('>',''))
            return id.replace('<@','').replace('>','')
          })
          let pj_name = (async function() {
            let words = message.content.match(pj_regexp)
            // logger.debug(message.content)
            // logger.debug(winner)
            // logger.debug(words)
            // logger.debug(words.slice(-1)[0])
            words = words.slice(-1)[0]
            //万が一PJ名にスペースが含まれていたら削除する
            words = await words_adjust(words)
            //logger.debug(words)
            return words;
          }());
          
          
          pj_name.then(async (pj)=>{
            
            //pj_nameのワークシート作成
            await insert_sheet(pj).catch(e=>{logger.debug(e)})

            if(winner.length){
              //winnerのIDからtagnameを抽出してインサートデータ作成
              let insert_data = await Promise.all(winner.map(user_id=>{
                let user = client.users.cache.get(user_id);
                if (user) {
                  logger.debug(user)
                  return [user.tag, user.username] 
                } else {
                  return ['error:tag_name','error:unknown_username']
                };
              }))
              //logger.log(insert_data, pj)
              if(pj_name !== ""){
                let work_sheet = doc.sheetsByTitle[pj];
                let rows = await work_sheet.getRows();
                let result = await work_sheet.addRows(insert_data,{row:false, insert:true})
                logger.debug("結果発表データが挿入されました")
              }else{
                logger.debug("シートが見つからない")
              }
            }
          })
          

        //!gstartでギブアウェイ設定時(ワークシート作成)
//         }else if(message.content.startsWith('!gstart') && !message.author.bot){
//           let words = message.content.split(' ')
//           //logger.debug(words)
//           let pj_name = ""
//           for (let i = 3; i < words.length; i++) {
//             pj_name = pj_name + words[i];
//           }
//           //logger.debug(words)
//           //logger.debug('before: ' + pj_name)
          
//           //pj_nameの正規化
//           pj_name = await words_adjust(pj_name)
//           //logger.debug('after: ' + pj_name)
          
//           if(pj_name !== ''){
//             await insert_sheet(pj_name).catch(e=>{logger.debug(e)})
//           }
//         //!gcreateでギブアウェイ設定時(ワークシート作成)
//         }else if(giveaway.test(message.content) && message.author.bot){
//           //logger.debug('messageCreate', message.content)

//           //logger.debug(message.author.id)
//           message.content = message.content.replace(/\s+/g,"")
//           //logger.debug(message.content)
//           let pj_regexp = /`(.*)`/;
//           let pj_name = message.content.match(pj_regexp)
//           //logger.debug(pj_name[1])
//           pj_name[1].replace('`','')
//           pj_name[1] = await words_adjust(pj_name[1])
//           if(pj_name[1] !== ''){
//             await insert_sheet(pj_name[1]).catch(e=>{logger.debug(e)})
//           }
        //!whitelist コマンド実行時にシートに記録
        }else if((message.content.startsWith('!whitelist ') || message.content.startsWith('/whitelist ') )&& !message.author.bot){
          const user = client.users.cache.get(message.author.id);
          logger.debug(user)
          logger.debug(user.tag)
          //スペースを半角スペースに統一
          message.content = message.content.replace(/\s+/g," ")
          message.content = message.content.replace(/[{}]/g,"")
          let words = message.content.split(' ')
          //logger.debug(words)
          let address = words[1]
          let pj_name = words[2]
          
          let sheet_id = await get_sheet_id(pj_name)
          //logger.debug(sheet_id)
          
          if(sheet_id){
            let sheet = await doc.sheetsById[sheet_id]
            let rows = await sheet.getRows();
            for (const row of rows) {
              //logger.debug(row.tagname)
              if (row.tagname == user.tag) {
                row.address = address
                await row.save()
                logger.debug("書き込み完了")
              }
            }
          }else{
            logger.debug("マッチするシートなし")
            return
          }
          message.delete()
          return
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
        //console.log('Hello')
        await interaction.deferReply({ephemeral: true});
        //console.log('Hello2')
        //user.idを含むシート情報を収集
        const user = client.users.cache.get(interaction.user.id);
        
        
        //console.log(user)
        
        
        //キャッシュクリア
        doc.resetLocalCache()
        await doc.useServiceAccountAuth(creds);
        await doc.loadInfo();
        
        //自身のtagnameが記載されたシート名を取得
        let winner_pj =[]
        await Promise.all( Object.keys(doc._rawSheets).map(async (key) => {
          let sheet = doc.sheetsById[key]
          await sheet.getRows({limit:50}).then(async (rows)=>{
            //return {...sheet._rawProperties, subElements: element.subElements.filter((subElement) => subElement.surname === 1)}
            
            for (const row of rows) {
              logger.debug(row.tagname, user.tag)
              if (row.tagname == user.tag && row.address == undefined ) {
                logger.debug(sheet.title)
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
        
        //logger.debug(winner_pj, winner_pj.length > 0)
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
              return "`/whitelist ここにアドレス "+pj+"`\n"
          }))
          your_command.then(command_list => {
            let mas = "ラッキーなやつじゃ！"
            mas += `${command_list.length}個当たってるわい。\n提出方法は <#${process.env.DISCORD_GIVEAWAY_CHANNEL_ID}> をよく見るんだぞ。\n\n` 
            mas += `アドレスの提出が必要な時は、下の文字をコピペして、アドレスのところに自分のアドレスを書いて送信するんじゃ。\n1行ずつじゃぞ！\n\n`
            mas += command_list.join("")
            mas += `\nDiscord IDのみ必要な場合は何もする必要はない。相手のサーバーでロールがつくのを待つんじゃ\n`
            interaction.editReply({
              content:mas,
              ephemeral: true,
            })
          })
          .catch(e=>{logger.debug(e)})
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
//                       content: "そしたら下のコピペしてアドレス書いて送信やで\n\n" + "`/whitelist ここにアドレス "+response[1] + "`\n\n",
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
          await interaction.editReply({
          content: "なーんも当たってないぞ。ランブルとかビンゴは提供者にDMするんじゃ",
          ephemeral: true
          })

        }
      }
      if(interaction.commandName === 'gsheet'){
        logger.debug('DM!')
        await interaction.deferReply({ephemeral: true});
        await interaction.editReply({
          content: "ぷー",
          ephemeral: true
          });
        
        //サーバー(ギルド)
        const guild = await client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
        
        const parent_channel = await guild.channels.fetch(process.env.DISCORD_PARENT_WL_CHANNEL_ID).catch(c=>{logger.debug(c)})
        //const support = message.guild.roles.find(r => r.name === 'Support Team');
        //logger.debug(guild.members.cache)
        //let users = await guild.members.cache.find(m => m.user.username === 'anone')
       
        //logger.debug(users1)
        guild.channels.create('カテゴリー',{
          type: 'category',
        })
//         guild.channels.create('チャンネル名',{
//           type: 'text',
//           parent: parent_channel,
//           // permissionOverwrites: [
//           //   {
//           //     id: guild.id,
//           //     deny: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
//           //   },
//           //   {
//           //     id: users,
//           //     allow: ['VIEW_CHANNEL'],
//           //   },
//           // ],
//           //permissionOverwrites:parent_channel.permissionOverwrites.fetch()
//         })
//           .then(async (channel) => {
          
//             let permissions = await parent_channel.permissionOverwrites.cache

//             logger.debug(permissions)
            
//               channel.permissionOverwrites.set(permissions)
// //           channel.overwritePermissions([
// //             {
// //               id: '761621197862993938',
// //               allow: ['VIEW_CHANNEL'],
// //             },
// //             {
// //               id: guild.id,
// //               deny: ['VIEW_CHANNEL'],
// //             },
// //           ]);
//          });

        //logger.debug(interaction)
        //await 7616211978629939382
	      // const user = await client.users.cache.get('7616211978629939382')
	      // user.send('メッセージだよ').then(r=>{logger.debug(r)}).catch(e=>{logger.debug(e)})
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
